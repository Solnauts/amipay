use anyhow::{anyhow, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    commitment_config::CommitmentConfig,
    signature::{Keypair, Signature, read_keypair_file},
    signer::Signer,
    transaction::VersionedTransaction,
};
use std::env;

const JUPITER_QUOTE_URL: &str = "https://api.jup.ag/swap/v1/quote";
const JUPITER_SWAP_URL: &str = "https://api.jup.ag/swap/v1/swap";

// ── Jupiter API Types ──

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct QuoteResponse {
    pub input_mint: String,
    pub in_amount: String,
    pub output_mint: String,
    pub out_amount: String,
    pub other_amount_threshold: String,
    pub swap_mode: String,
    pub slippage_bps: u16,
    pub price_impact_pct: String,
    pub route_plan: serde_json::Value,
    pub context_slot: Option<u64>,
    pub time_taken: Option<f64>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
struct SwapRequest {
    user_public_key: String,
    quote_response: serde_json::Value,
    wrap_and_unwrap_sol: bool,
    dynamic_compute_unit_limit: bool,
    dynamic_slippage: bool,
    prioritization_fee_lamports: PrioritizationFee,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
struct PrioritizationFee {
    priority_level_with_max_lamports: PriorityLevel,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
struct PriorityLevel {
    priority_level: String,
    max_lamports: u64,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct SwapApiResponse {
    swap_transaction: String,
    last_valid_block_height: u64,
}

pub struct SwapResult {
    pub signature: String,
    pub input_mint: String,
    pub output_mint: String,
    pub in_amount: String,
    pub out_amount: String,
}

// ── Core Swap Logic ──

fn load_keypair() -> Result<Keypair> {
    let keypair_path = env::var("SOLANA_KEYPAIR_PATH")
        .unwrap_or_else(|_| "~/.config/solana/id.json".to_string());

    let resolved = if keypair_path.starts_with('~') {
        let home = env::var("HOME").map_err(|_| anyhow!("HOME not set"))?;
        keypair_path.replacen('~', &home, 1)
    } else {
        keypair_path
    };

    read_keypair_file(&resolved).map_err(|e| anyhow!("Failed to load keypair: {}", e))
}

fn create_rpc_client() -> RpcClient {
    let rpc_url =
        env::var("SOLANA_RPC_URL").unwrap_or_else(|_| "https://api.devnet.solana.com".to_string());
    RpcClient::new_with_commitment(rpc_url, CommitmentConfig::confirmed())
}

pub async fn get_quote(
    input_mint: &str,
    output_mint: &str,
    amount: u64,
    slippage_bps: u16,
) -> Result<QuoteResponse> {
    let client = Client::new();

    let mut request = client
        .get(JUPITER_QUOTE_URL)
        .query(&[
            ("inputMint", input_mint),
            ("outputMint", output_mint),
            ("amount", &amount.to_string()),
            ("slippageBps", &slippage_bps.to_string()),
        ]);

    if let Ok(api_key) = env::var("JUPITER_API_KEY") {
        request = request.header("x-api-key", api_key);
    }

    let response = request.send().await?;

    //use the is_success method 
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(anyhow!("Jupiter quote failed ({}): {}", status, body));
    }

    let quote: QuoteResponse = response.json().await?;
    Ok(quote)
}

pub async fn get_swap_transaction(
    quote: serde_json::Value,
    user_pubkey: &str,
) -> Result<(String, u64)> {
    let client = Client::new();

    let swap_body = SwapRequest {
        user_public_key: user_pubkey.to_string(),
        quote_response: quote,
        wrap_and_unwrap_sol: true,
        dynamic_compute_unit_limit: true,
        dynamic_slippage: true,
        prioritization_fee_lamports: PrioritizationFee {
            priority_level_with_max_lamports: PriorityLevel {
                priority_level: "veryHigh".to_string(),
                max_lamports: 1_000_000,
            },
        },
    };

    let mut request = client
        .post(JUPITER_SWAP_URL)
        .json(&swap_body);

    if let Ok(api_key) = env::var("JUPITER_API_KEY") {
        request = request.header("x-api-key", api_key);
    }

    let response = request.send().await?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(anyhow!("Jupiter swap failed ({}): {}", status, body));
    }

    let swap_response: SwapApiResponse = response.json().await?;
    Ok((
        swap_response.swap_transaction,
        swap_response.last_valid_block_height,
    ))
}


//why this is execute swap if the upper function is get_swap_transaction
pub async fn execute_swap(
    input_mint: &str,
    output_mint: &str,
    amount: u64,
    slippage_bps: u16,
) -> Result<SwapResult> {
    let keypair = load_keypair()?;
    let pubkey = keypair.pubkey().to_string();

    println!("[swap] signer: {}", pubkey);
    println!(
        "[swap] {} → {} | amount: {}",
        input_mint, output_mint, amount
    );

    // Step 1: Get quote
    let quote = get_quote(input_mint, output_mint, amount, slippage_bps).await?;
    println!(
        "[swap] quote: {} → {} (impact: {})",
        quote.in_amount, quote.out_amount, quote.price_impact_pct
    );

    let in_amount = quote.in_amount.clone();
    let out_amount = quote.out_amount.clone();
    let quote_json = serde_json::to_value(&quote)?;

    // Step 2: Get swap transaction
    let (swap_tx_b64, last_valid_block_height) =
        get_swap_transaction(quote_json, &pubkey).await?;
    println!("[swap] got swap tx, valid until block {}", last_valid_block_height);

    // Step 3: Deserialize, sign, and send
    let tx_bytes = base64::Engine::decode(
        &base64::engine::general_purpose::STANDARD,
        &swap_tx_b64,
    )?;

    let mut versioned_tx: VersionedTransaction = bincode::deserialize(&tx_bytes)?;

    let rpc = create_rpc_client();
    let latest_blockhash = rpc.get_latest_blockhash()?;

    versioned_tx
        .try_partial_sign(&[&keypair], latest_blockhash)
        .map_err(|e| anyhow!("Signing failed: {:?}", e))?;

    let signature: Signature = rpc.send_and_confirm_transaction(&versioned_tx)?;
    println!("[swap] confirmed: {}", signature);

    Ok(SwapResult {
        signature: signature.to_string(),
        input_mint: input_mint.to_string(),
        output_mint: output_mint.to_string(),
        in_amount,
        out_amount,
    })
}
