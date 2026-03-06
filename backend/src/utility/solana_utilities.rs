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
// ═══════════════════════════════════════════════════════════════════════════

#[tokio::main]
pub async fn transfer_to_vault(unique_id: String, amount: u64) -> Result<RpcResponse, SolanaError> {
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

    // derive user_usdc_ata PDA
    let user_usdc_ata_seed = [
        user_usdc_ata_seed_str.as_bytes(),
        unique_id_ref.as_bytes(),
        usdc_mint.as_ref(),
    ];
    let user_usdc_ata_pubkey =
        anchor_lang::prelude::Pubkey::find_program_address(&user_usdc_ata_seed, &program_id).0;

    // derive main_usdc_vault PDA
    let main_usdc_vault_seed = [
        b"main_usdc_vault" as &[u8],
        usdc_mint.as_ref(),
        payer_pubkey.as_ref(),
    ];
    let main_usdc_vault =
        anchor_lang::prelude::Pubkey::find_program_address(&main_usdc_vault_seed, &program_id).0;

    // derive fee_collector_usdc_ata
    let associated_token_program_id = parse_pubkey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")?;
    let fee_collector_usdc_ata_seeds = [
        main_state_account.as_ref(),
        token_program_id.as_ref(),
        usdc_mint.as_ref(),
    ];
    let fee_collector_usdc_ata = anchor_lang::prelude::Pubkey::find_program_address(
        &fee_collector_usdc_ata_seeds,
        &associated_token_program_id,
    )
    .0;

    program
        .request()
        .args(instruction::Transfertovault { amount })
        .accounts(accounts::TransferToVault {
            signer: payer_pubkey,
            usdc_mint,
            system_program: system_program::id(),
            token_program: token_program_id,
            main_state_account,
            fee_collector_usdc_ata,
            user_usdc_ata: user_usdc_ata_pubkey,
            main_usdc_vault,
        })
        .signer(payer_ref)
        .send()
        .await
        .map_err(|e| SolanaError::TransferToVaultFailed {
            unique_id: unique_id.clone(),
            amount,
            reason: e.to_string(),
        })?;

    let user_usdc_ata = get_user_ata(unique_id_ref.to_string()).await.map_err(|e| {
        SolanaError::TransferToVaultFailed {
            unique_id: unique_id.clone(),
            amount,
            reason: format!("post-transfer ATA lookup: {}", e),
        }
    })?;

    Ok(RpcResponse {
        success: true,
        value: user_usdc_ata.1,
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
//  CLAIM AMOUNT
// ═══════════════════════════════════════════════════════════════════════════

#[tokio::main]
pub async fn claim_amount(unique_id: String, amount: u64) -> Result<RpcResponse, SolanaError> {
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

    // derive user_usdc_ata PDA
    let user_usdc_ata_seed = [
        user_usdc_ata_seed_str.as_bytes(),
        unique_id_ref.as_bytes(),
        usdc_mint.as_ref(),
    ];
    let user_usdc_ata_pubkey =
        anchor_lang::prelude::Pubkey::find_program_address(&user_usdc_ata_seed, &program_id).0;

    // derive main_usdc_vault PDA
    let main_usdc_vault_seed = [
        b"main_usdc_vault" as &[u8],
        usdc_mint.as_ref(),
        payer_pubkey.as_ref(),
    ];
    let main_usdc_vault =
        anchor_lang::prelude::Pubkey::find_program_address(&main_usdc_vault_seed, &program_id).0;

    // derive fee_collector_usdc_ata
    let associated_token_program_id = parse_pubkey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")?;
    let fee_collector_usdc_ata_seeds = [
        main_state_account.as_ref(),
        token_program_id.as_ref(),
        usdc_mint.as_ref(),
    ];
    let fee_collector_usdc_ata = anchor_lang::prelude::Pubkey::find_program_address(
        &fee_collector_usdc_ata_seeds,
        &associated_token_program_id,
    )
    .0;

    program
        .request()
        .args(instruction::ClaimByUser { amount })
        .accounts(accounts::ClaimByUser {
            signer: payer_pubkey,
            usdc_mint,
            system_program: system_program::id(),
            token_program: token_program_id,
            main_state_account,
            fee_collector_usdc_ata,
            user_usdc_ata: user_usdc_ata_pubkey,
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
//  GET USER ATA BALANCE
// ═══════════════════════════════════════════════════════════════════════════

pub fn get_user_ata_balance(
    unique_id: String,
    amount_claim: u64,
) -> std::result::Result<AmountResponse, SolanaError> {
    let rpc_url = load_env("SOLANA_RPC_URL")?;
    let client = RpcClient::new_with_commitment(rpc_url, CommitmentConfig::confirmed());

    let program_id_str = load_env("SOLANA_PROGRAM_ID")?;
    let usdc_mint_str = load_env("SOLANA_USDC_MINT")?;
    let user_ata_seed_str = load_env("SOLANA_SEED_USER_USDC_ATA")?;
    let usdc_mint = parse_solana_pubkey(&usdc_mint_str)?;
    let program_id = parse_solana_pubkey(&program_id_str)?;

    let user_ata_seed = [
        user_ata_seed_str.as_bytes(),
        unique_id.as_bytes(),
        usdc_mint.as_ref(),
    ];

    let user_ata_pda_address = Pubkey::find_program_address(&user_ata_seed, &program_id);

    let balance = client.get_balance(&user_ata_pda_address.0).map_err(|e| {
        SolanaError::BalanceCheckFailed {
            unique_id: unique_id.clone(),
            reason: e.to_string(),
        }
    })?;

    if balance >= amount_claim {
        Ok(AmountResponse {
            success: true,
            amount: balance,
            issue: None,
        })
    } else {
        Ok(AmountResponse {
            success: false,
            amount: balance,
            issue: Some("Insufficient Balance".to_string()),
        })
    }
}
