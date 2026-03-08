use crate::errors::SolanaError;
use anchor_client::{
    Client, Cluster,
    solana_sdk::{
        signature::{Keypair, read_keypair_file},
        signer::Signer,
        system_program,
    },
};
use contract::{accounts, instruction};
use dotenv::dotenv;
use solana_client::rpc_client::RpcClient;
use solana_commitment_config::CommitmentConfig;
use solana_sdk::pubkey::{self, Pubkey};
use spl_token_interface::id as token_program_value;
use std::{env, rc::Rc, str::FromStr};
use tokio::{self};

//call the function in the solana rpc
pub struct RpcResponse {
    pub success: bool,
    pub value: pubkey::Pubkey,
}

pub struct AmountResponse {
    pub success: bool,
    pub amount: u64,
    pub issue: Option<String>,
}

// ── Helpers: load env vars & keypair without panicking ───────────────────

fn load_env(var_name: &str) -> Result<String, SolanaError> {
    env::var(var_name).map_err(|_| SolanaError::MissingEnvVar {
        var_name: var_name.to_string(),
    })
}

fn load_keypair(path: &str) -> Result<Keypair, SolanaError> {
    read_keypair_file(path).map_err(|e| SolanaError::KeypairLoadFailed {
        path: path.to_string(),
        reason: e.to_string(),
    })
}

fn parse_pubkey(input: &str) -> Result<anchor_lang::prelude::Pubkey, SolanaError> {
    anchor_lang::prelude::Pubkey::from_str(input).map_err(|e| SolanaError::InvalidPubkey {
        input: input.to_string(),
        reason: e.to_string(),
    })
}

fn parse_solana_pubkey(input: &str) -> Result<Pubkey, SolanaError> {
    Pubkey::from_str(input).map_err(|e| SolanaError::InvalidPubkey {
        input: input.to_string(),
        reason: e.to_string(),
    })
}

// ═══════════════════════════════════════════════════════════════════════════
//  CREATE USER ATA
// ═══════════════════════════════════════════════════════════════════════════

#[tokio::main]
pub async fn create_user_ata(unique_id: String) -> Result<RpcResponse, SolanaError> {
    dotenv().ok();

    let keypair_path = load_env("SOLANA_KEYPAIR_PATH")?;
    let program_id_str = load_env("SOLANA_PROGRAM_ID")?;
    let usdc_mint_str = load_env("SOLANA_USDC_MINT")?;
    let user_usdc_ata_seed_str = load_env("SOLANA_SEED_USER_USDC_ATA")?;

    let payer = load_keypair(&keypair_path)?;
    let payer_pubkey = payer.pubkey();
    let payer_ref: &'static Keypair = Box::leak(Box::new(payer));
    let client = Client::new(Cluster::Devnet, Rc::new(payer_ref));

    let unique_id_ref: &'static String = Box::leak(Box::new(unique_id.clone()));
    let program = client
        .program(contract::ID)
        .map_err(|e| SolanaError::ProgramClientFailed {
            reason: e.to_string(),
        })?;

    let required_state_account = get_main_state_accounts()
        .await
        .map_err(|e| SolanaError::RpcError {
            reason: format!("get_main_state_accounts: {}", e),
        })?
        .1;
    let main_state_account = parse_pubkey(&required_state_account.to_string())?;

    let program_id = parse_pubkey(&program_id_str)?;
    let usdc_mint = parse_pubkey(&usdc_mint_str)?;
    let needed_val = token_program_value().to_string();
    let token_program_id = parse_pubkey(&needed_val)?;

    // Derive user_usdc_ata PDA — must include unique_id as a seed component so
    // the client-side derivation matches what the on-chain program computes.
    // (Previously unique_id was missing here, producing the wrong PDA address.)
    let user_usdc_ata_seed = [
        user_usdc_ata_seed_str.as_bytes(),
        unique_id_ref.as_bytes(),
        usdc_mint.as_ref(),
    ];
    let user_usdc_ata_pubkey =
        anchor_lang::prelude::Pubkey::find_program_address(&user_usdc_ata_seed, &program_id).0;

    program
        .request()
        .args(instruction::Initialize {
            _unique_id: unique_id_ref.to_string(),
        })
        .accounts(accounts::Initialize {
            main_state_account,
            signer: payer_pubkey,
            usdc_mint,
            token_program: token_program_id,
            system_program: system_program::id(),
            user_usdc_ata: user_usdc_ata_pubkey,
        })
        .signer(payer_ref)
        .send()
        .await
        .map_err(|e| SolanaError::AtaCreationFailed {
            unique_id: unique_id.clone(),
            reason: e.to_string(),
        })?;

    let user_usdc_ata = get_user_ata(unique_id_ref.to_string()).await.map_err(|e| {
        SolanaError::AtaCreationFailed {
            unique_id: unique_id.clone(),
            reason: format!("post-creation ATA lookup: {}", e),
        }
    })?;

    Ok(RpcResponse {
        success: true,
        value: user_usdc_ata.1,
    })
}

// ═══════════════════════════════════════════════════════════════════════════
//  TRANSFER TO VAULT
//  Sends net amount (amount - fee) from sender's ATA to receiver's ATA,
//  and the fee from sender's ATA to the main vault.
// ═══════════════════════════════════════════════════════════════════════════

#[tokio::main]
pub async fn transfer_to_vault(
    sender_unique_id: String,
    receiver_unique_id: String,
    amount: u64,
) -> Result<RpcResponse, SolanaError> {
    dotenv().ok();

    let keypair_path = load_env("SOLANA_KEYPAIR_PATH")?;
    let program_id_str = load_env("SOLANA_PROGRAM_ID")?;
    let usdc_mint_str = load_env("SOLANA_USDC_MINT")?;
    let user_usdc_ata_seed_str = load_env("SOLANA_SEED_USER_USDC_ATA")?;
    let main_state_seed_str = load_env("SOLANA_SEED_MAIN_STATE")?;

    let payer = load_keypair(&keypair_path)?;
    let payer_pubkey = payer.pubkey();
    let payer_ref: &'static Keypair = Box::leak(Box::new(payer));
    let client = Client::new(Cluster::Devnet, Rc::new(payer_ref));

    let sender_unique_id_ref: &'static String = Box::leak(Box::new(sender_unique_id.clone()));
    let receiver_unique_id_ref: &'static String = Box::leak(Box::new(receiver_unique_id.clone()));
    let program = client
        .program(contract::ID)
        .map_err(|e| SolanaError::ProgramClientFailed {
            reason: e.to_string(),
        })?;

    let program_id = parse_pubkey(&program_id_str)?;
    let usdc_mint = parse_pubkey(&usdc_mint_str)?;
    let needed_val = token_program_value().to_string();
    let token_program_id = parse_pubkey(&needed_val)?;

    // derive main_state_account PDA
    let main_state_seed = [
        main_state_seed_str.as_bytes(),
        usdc_mint.as_ref(),
        payer_pubkey.as_ref(),
    ];
    let main_state_account =
        anchor_lang::prelude::Pubkey::find_program_address(&main_state_seed, &program_id).0;

    // derive sender's usdc ata PDA
    let sender_usdc_ata_seed = [
        user_usdc_ata_seed_str.as_bytes(),
        sender_unique_id_ref.as_bytes(),
        usdc_mint.as_ref(),
    ];
    let sender_usdc_ata_pubkey =
        anchor_lang::prelude::Pubkey::find_program_address(&sender_usdc_ata_seed, &program_id).0;

    // derive receiver's usdc ata PDA
    let receiver_usdc_ata_seed = [
        user_usdc_ata_seed_str.as_bytes(),
        receiver_unique_id_ref.as_bytes(),
        usdc_mint.as_ref(),
    ];
    let receiver_usdc_ata_pubkey =
        anchor_lang::prelude::Pubkey::find_program_address(&receiver_usdc_ata_seed, &program_id).0;

    // derive main_usdc_vault PDA
    let main_usdc_vault_seed = [
        b"main_usdc_vault" as &[u8],
        usdc_mint.as_ref(),
        payer_pubkey.as_ref(),
    ];
    let main_usdc_vault =
        anchor_lang::prelude::Pubkey::find_program_address(&main_usdc_vault_seed, &program_id).0;

    program
        .request()
        .args(instruction::Transfertovault { amount })
        .accounts(accounts::TransferToVault {
            signer: payer_pubkey,
            usdc_mint,
            system_program: system_program::id(),
            token_program: token_program_id,
            main_state_account,
            sender_usdc_ata: sender_usdc_ata_pubkey,
            receiver_usdc_ata: receiver_usdc_ata_pubkey,
            main_usdc_vault,
        })
        .signer(payer_ref)
        .send()
        .await
        .map_err(|e| SolanaError::TransferToVaultFailed {
            unique_id: sender_unique_id.clone(),
            amount,
            reason: e.to_string(),
        })?;

    let sender_ata = get_user_ata(sender_unique_id_ref.to_string())
        .await
        .map_err(|e| SolanaError::TransferToVaultFailed {
            unique_id: sender_unique_id.clone(),
            amount,
            reason: format!("post-transfer sender ATA lookup: {}", e),
        })?;

    Ok(RpcResponse {
        success: true,
        value: sender_ata.1,
    })
}

// ═══════════════════════════════════════════════════════════════════════════
//  GET MAIN STATE ACCOUNTS
// ═══════════════════════════════════════════════════════════════════════════

async fn get_main_state_accounts()
-> std::result::Result<(solana_sdk::account::Account, pubkey::Pubkey), SolanaError> {
    dotenv().ok();

    let rpc_url = load_env("SOLANA_RPC_URL")?;
    let usdc_mint_str = load_env("SOLANA_USDC_MINT")?;
    let program_id_str = load_env("SOLANA_PROGRAM_ID")?;
    let keypair_path = load_env("SOLANA_KEYPAIR_PATH")?;
    let main_state_seed = load_env("SOLANA_SEED_MAIN_STATE")?;

    let client = RpcClient::new_with_commitment(rpc_url, CommitmentConfig::confirmed());

    let usdc_mint = parse_solana_pubkey(&usdc_mint_str)?;
    let signer = load_keypair(&keypair_path)?.pubkey();
    let account_seed = [
        main_state_seed.as_bytes(),
        usdc_mint.as_ref(),
        signer.as_ref(),
    ];

    let program_id = parse_solana_pubkey(&program_id_str)?;

    let pda = Pubkey::find_program_address(&account_seed, &program_id)
        .0
        .to_string();

    let required_pda = parse_solana_pubkey(&pda)?;
    let main_state_account =
        client
            .get_account(&required_pda)
            .map_err(|_e| SolanaError::AccountNotFound {
                pubkey: required_pda.to_string(),
            })?;

    Ok((main_state_account, required_pda))
}

// ═══════════════════════════════════════════════════════════════════════════
//  CLAIM AMOUNT (Withdraw)
//  Sends net amount (amount - fee) from user's program-owned ATA to their
//  external wallet USDC ATA, and the fee from user's ATA to main_usdc_vault.
// ═══════════════════════════════════════════════════════════════════════════

#[tokio::main]
pub async fn claim_amount(
    unique_id: String,
    destination_usdc_ata_str: String,
    amount: u64,
) -> Result<RpcResponse, SolanaError> {
    dotenv().ok();

    let keypair_path = load_env("SOLANA_KEYPAIR_PATH")?;
    let program_id_str = load_env("SOLANA_PROGRAM_ID")?;
    let usdc_mint_str = load_env("SOLANA_USDC_MINT")?;
    let user_usdc_ata_seed_str = load_env("SOLANA_SEED_USER_USDC_ATA")?;
    let main_state_seed_str = load_env("SOLANA_SEED_MAIN_STATE")?;

    let payer = load_keypair(&keypair_path)?;
    let payer_pubkey = payer.pubkey();
    let payer_ref: &'static Keypair = Box::leak(Box::new(payer));
    let client = Client::new(Cluster::Devnet, Rc::new(payer_ref));

    let unique_id_ref: &'static String = Box::leak(Box::new(unique_id.clone()));
    let program = client
        .program(contract::ID)
        .map_err(|e| SolanaError::ProgramClientFailed {
            reason: e.to_string(),
        })?;

    let program_id = parse_pubkey(&program_id_str)?;
    let usdc_mint = parse_pubkey(&usdc_mint_str)?;
    let needed_val = token_program_value().to_string();
    let token_program_id = parse_pubkey(&needed_val)?;

    // derive main_state_account PDA
    let main_state_seed = [
        main_state_seed_str.as_bytes(),
        usdc_mint.as_ref(),
        payer_pubkey.as_ref(),
    ];
    let main_state_account =
        anchor_lang::prelude::Pubkey::find_program_address(&main_state_seed, &program_id).0;

    // derive user_usdc_ata PDA (program-owned — source of funds)
    let user_usdc_ata_seed = [
        user_usdc_ata_seed_str.as_bytes(),
        unique_id_ref.as_bytes(),
        usdc_mint.as_ref(),
    ];
    let user_usdc_ata_pubkey =
        anchor_lang::prelude::Pubkey::find_program_address(&user_usdc_ata_seed, &program_id).0;

    // derive main_usdc_vault PDA (fee destination)
    let main_usdc_vault_seed = [
        b"main_usdc_vault" as &[u8],
        usdc_mint.as_ref(),
        payer_pubkey.as_ref(),
    ];
    let main_usdc_vault =
        anchor_lang::prelude::Pubkey::find_program_address(&main_usdc_vault_seed, &program_id).0;

    // parse destination USDC ATA (user's external wallet token account)
    let destination_usdc_ata = parse_pubkey(&destination_usdc_ata_str)?;

    program
        .request()
        .args(instruction::ClaimByUser { amount })
        .accounts(accounts::ClaimByUser {
            signer: payer_pubkey,
            usdc_mint,
            system_program: system_program::id(),
            token_program: token_program_id,
            main_state_account,
            user_usdc_ata: user_usdc_ata_pubkey,
            destination_usdc_ata,
            main_usdc_vault,
        })
        .signer(payer_ref)
        .send()
        .await
        .map_err(|e| SolanaError::ClaimFailed {
            unique_id: unique_id.clone(),
            amount,
            reason: e.to_string(),
        })?;

    let user_usdc_ata =
        get_user_ata(unique_id_ref.to_string())
            .await
            .map_err(|e| SolanaError::ClaimFailed {
                unique_id: unique_id.clone(),
                amount,
                reason: format!("post-claim ATA lookup: {}", e),
            })?;

    Ok(RpcResponse {
        success: true,
        value: user_usdc_ata.1,
    })
}

// ═══════════════════════════════════════════════════════════════════════════
//  GET USER ATA
// ═══════════════════════════════════════════════════════════════════════════

async fn get_user_ata(
    unique_id: String,
) -> std::result::Result<(solana_sdk::account::Account, pubkey::Pubkey), SolanaError> {
    dotenv().ok();

    let rpc_url = load_env("SOLANA_RPC_URL")?;
    let program_id_str = load_env("SOLANA_PROGRAM_ID")?;
    let usdc_mint_str = load_env("SOLANA_USDC_MINT")?;
    let user_ata_seed_str = load_env("SOLANA_SEED_USER_USDC_ATA")?;

    let client = RpcClient::new_with_commitment(rpc_url, CommitmentConfig::confirmed());
    let program_id = parse_solana_pubkey(&program_id_str)?;
    let usdc_mint = parse_solana_pubkey(&usdc_mint_str)?;
    let user_ata_seed = [
        user_ata_seed_str.as_bytes(),
        unique_id.as_bytes(),
        usdc_mint.as_ref(),
    ];
    let user_ata_pda_address = Pubkey::find_program_address(&user_ata_seed, &program_id);

    let user_usdc_ata_account =
        client
            .get_account(&user_ata_pda_address.0)
            .map_err(|_e| SolanaError::AccountNotFound {
                pubkey: user_ata_pda_address.0.to_string(),
            })?;

    Ok((user_usdc_ata_account, user_ata_pda_address.0))
}

// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
//  GET USER ATA BALANCE
//  Takes the stored ATA pubkey (from user.user_usdc_ata) and checks the
//  real USDC token balance using get_token_account_balance.
// ═══════════════════════════════════════════════════════════════════════════

pub fn get_user_ata_balance(
    user_usdc_ata: String,
    amount_claim: u64,
) -> std::result::Result<AmountResponse, SolanaError> {
    dotenv().ok();
    let rpc_url = load_env("SOLANA_RPC_URL")?;
    let client = RpcClient::new_with_commitment(rpc_url, CommitmentConfig::confirmed());

    let ata_pubkey = parse_solana_pubkey(&user_usdc_ata)?;

    // get_token_account_balance returns the actual USDC amount stored in the
    // SPL token account, not the SOL lamport balance of the account.
    let token_balance = client.get_token_account_balance(&ata_pubkey).map_err(|e| {
        SolanaError::BalanceCheckFailed {
            unique_id: user_usdc_ata.clone(),
            reason: e.to_string(),
        }
    })?;

    // ui_amount_string is the human-readable amount; amount is the raw u64
    // represented as a string — parse it back to u64 for comparison.
    let raw_balance: u64 =
        token_balance
            .amount
            .parse::<u64>()
            .map_err(|e| SolanaError::BalanceCheckFailed {
                unique_id: user_usdc_ata.clone(),
                reason: format!(
                    "failed to parse token balance '{}': {}",
                    token_balance.amount, e
                ),
            })?;

    if raw_balance >= amount_claim {
        Ok(AmountResponse {
            success: true,
            amount: raw_balance,
            issue: None,
        })
    } else {
        Ok(AmountResponse {
            success: false,
            amount: raw_balance,
            issue: Some("Insufficient Balance".to_string()),
        })
    }
}
