use anchor_client::{
    Client, Cluster,
    solana_sdk::{
        signature::{Keypair, read_keypair_file},
        signer::Signer,
        system_program,
        instruction::Instruction,
    },
};
use contract::{accounts, instruction};
use dotenv::dotenv;
use solana_client::rpc_client::RpcClient;
use solana_commitment_config::CommitmentConfig;
use solana_sdk::{pubkey::Pubkey, signature::Signature, native_token::LAMPORTS_PER_SOL};
use spl_token_interface::{burn::burn, id as token_program_id};
use std::{env, error::Error, rc::Rc, str::FromStr};

pub const SOL_PRICE_USD: f64 = 150.0;
pub const FEE_BASIS_POINTS: i64 = 30;
pub const AIRDROP_THRESHOLD_LAMPORTS: i64 = 150_000_000;
pub const AIRDROP_AMOUNT_LAMPORTS: i64 = 2_000_000_000;
pub const AIRDROP_COOLDOWN_SECONDS: i64 = 7200;
pub const NETWORK_FEE_LAMPORTS: i64 = 5_000_000;

pub struct SwapResult {
    pub success: bool,
    pub usdc_burned: i64,
    pub sol_sent: i64,
    pub fee_collected: i64,
    pub tx_hash: String,
}

pub fn calculate_swap_amounts(usdc_lamports: i64) -> (i64, i64, i64) {
    let fee = (usdc_lamports * FEE_BASIS_POINTS) / 10000;
    let net_usdc = usdc_lamports - fee;
    let sol_lamports = ((net_usdc as f64 / SOL_PRICE_USD) * (LAMPORTS_PER_SOL as f64)) as i64;
    let total_sol = sol_lamports + NETWORK_FEE_LAMPORTS;
    (sol_lamports, total_sol, fee)
}

#[tokio::main]
pub async fn burn_user_usdc(
    user_ata: String,
    amount: i64,
) -> Result<String, Box<dyn Error>> {
    dotenv().ok();

    let keypair_path = env::var("SOLANA_KEYPAIR_PATH").expect("SOLANA_KEYPAIR_PATH must be set");
    let usdc_mint_str = env::var("SOLANA_USDC_MINT").expect("SOLANA_USDC_MINT must be set");

    let payer = read_keypair_file(&keypair_path).unwrap();
    let payer_ref: &'static Keypair = Box::leak(Box::new(payer));
    let rpc_url = env::var("SOLANA_RPC_URL").expect("SOLANA_RPC_URL must be set");

    let client = RpcClient::new_with_commitment(rpc_url, CommitmentConfig::confirmed());
    let usdc_mint = Pubkey::from_str(&usdc_mint_str)?;
    let user_ata_pubkey = Pubkey::from_str(&user_ata)?;

    let ix = spl_token_interface::instruction::burn(
        &token_program_id(),
        &user_ata_pubkey,
        &usdc_mint,
        &payer_ref.pubkey(),
        &[],
        amount as u64,
    )?;

    let recent_blockhash = client.get_latest_blockhash()?;
    
    let tx = solana_sdk::transaction::Transaction::new_signed_with_payer(
        &[ix],
        Some(&payer_ref.pubkey()),
        &[payer_ref],
        recent_blockhash,
    );

    let signature = client.send_and_confirm_transaction(&tx)?;
    println!("Burned {} USDC from {}, tx: {}", amount, user_ata, signature);
    
    Ok(signature.to_string())
}

#[tokio::main]
pub async fn send_sol_to_user(
    user_pubkey: String,
    amount: i64,
) -> Result<String, Box<dyn Error>> {
    dotenv().ok();

    let keypair_path = env::var("SOLANA_KEYPAIR_PATH").expect("SOLANA_KEYPAIR_PATH must be set");
    let rpc_url = env::var("SOLANA_RPC_URL").expect("SOLANA_RPC_URL must be set");

    let payer = read_keypair_file(&keypair_path).unwrap();
    let rpc_client = RpcClient::new_with_commitment(rpc_url, CommitmentConfig::confirmed());
    let user_pubkey_addr = Pubkey::from_str(&user_pubkey)?;

    let ix = solana_sdk::system_instruction::transfer(
        &payer.pubkey(),
        &user_pubkey_addr,
        amount as u64,
    );

    let recent_blockhash = rpc_client.get_latest_blockhash()?;
    
    let tx = solana_sdk::transaction::Transaction::new_signed_with_payer(
        &[ix],
        Some(&payer.pubkey()),
        &[&payer],
        recent_blockhash,
    );

    let signature = rpc_client.send_and_confirm_transaction(&tx)?;
    println!("Sent {} lamports SOL to {}, tx: {}", amount, user_pubkey, signature);
    
    Ok(signature.to_string())
}

#[tokio::main]
pub async fn request_airdrop(
    admin_pubkey: String,
    amount: i64,
) -> Result<String, Box<dyn Error>> {
    dotenv().ok();

    let rpc_url = env::var("SOLANA_RPC_URL").expect("SOLANA_RPC_URL must be set");
    let admin_address = Pubkey::from_str(&admin_pubkey)?;

    let client = RpcClient::new_with_commitment(rpc_url, CommitmentConfig::confirmed());
    
    let signature = client.request_airdrop(&admin_address, amount as u64)?;
    
    client.confirm_transaction(&signature)?;
    
    println!("Airdropped {} lamports SOL to {}, tx: {}", amount, admin_pubkey, signature);
    
    Ok(signature.to_string())
}

pub fn get_vault_pubkey() -> Result<String, Box<dyn Error>> {
    dotenv().ok();
    
    let keypair_path = env::var("SOLANA_KEYPAIR_PATH").expect("SOLANA_KEYPAIR_PATH must be set");
    let rpc_url = env::var("SOLANA_RPC_URL").expect("SOLANA_RPC_URL must be set");
    let program_id_str = env::var("SOLANA_PROGRAM_ID").expect("SOLANA_PROGRAM_ID must be set");
    
    let signer = read_keypair_file(&keypair_path)?.pubkey();
    let program_id = Pubkey::from_str(&program_id_str)?;
    
    let client = RpcClient::new_with_commitment(rpc_url, CommitmentConfig::confirmed());
    
    let vault_pubkey = Pubkey::create_with_seed(&signer, "vault", &program_id)?;
    
    let balance = client.get_balance(&vault_pubkey).unwrap_or(0);
    println!("Vault balance: {} lamports", balance);
    
    Ok(vault_pubkey.to_string())
}
