use actix_web::{HttpResponse, Responder, error, get, post, web};
use serde::{Deserialize, Serialize};
use solana_client::nonblocking::rpc_client::RpcClient;
use solana_commitment_config::CommitmentConfig;
use solana_sdk::{
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    transaction::Transaction,
};
use std::str::FromStr;

#[derive(Deserialize, Debug, Serialize)]
pub struct NewUser {
    name: String,
    password: String,
}
use crate::database::model_functions::get_user;

#[post("/trigger-transaction")]
async fn trigger_solana_and_db() -> actix_web::Result<impl Responder> {
    // SETUP SOLANA RPC CLIENT (Async)
    // usage of nonblocking client is crucial for Actix performance
    let rpc_url = "https://api.devnet.solana.com".to_string();
    let client = RpcClient::new_with_commitment(rpc_url, CommitmentConfig::confirmed());

    // 2. DEFINE KEYS & INSTRUCTION
    // TODO: Replace with your specific Contract/Program ID
    let program_id = Pubkey::from_str("YourContractKeyHere1111111111111111111111111")
        .map_err(|e| error::ErrorBadRequest(format!("Invalid Program ID: {}", e)))?;

    // Load your wallet (Payer)
    // This is just for demonstration (generating a random ephemeral keypair).
    let payer = Keypair::new();

    //check this in solana
    // Construct the instruction specific to your contract
    let instruction = Instruction::new_with_bincode(
        program_id,
        &[0], // DATA: Put your instruction data/arguments here
        vec![
            // ACCOUNTS: Add the accounts your contract requires
            AccountMeta::new(payer.pubkey(), true),
        ],
    );

    // 3. BUILD AND SEND TRANSACTION
    // We must get the latest blockhash strictly before sending
    let latest_blockhash = client
        .get_latest_blockhash()
        .await
        .map_err(|e| error::ErrorInternalServerError(format!("RPC Error: {}", e)))?;

    let transaction = Transaction::new_signed_with_payer(
        &[instruction],
        Some(&payer.pubkey()),
        &[&payer],
        latest_blockhash,
    );

    // Send and wait for confirmation (Async)
    let signature = client
        .send_and_confirm_transaction(&transaction)
        .await
        .map_err(|e| error::ErrorInternalServerError(format!("Solana Tx Failed: {}", e)))?;

    println!("Solana Transaction Confirmed. Signature: {}", signature);

    // 4. CALL DATABASE (Blocking)

    //learn about the web::block
    // We use `web::block` to offload it to the thread pool.
    let db_result = web::block(move || get_user()).await?; // Handle thread pool errors

    // 5. SEND HTTP RESPONSE
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "success",
        "database_message": db_result
    })))
}

async fn create_wallet(data: web::Json<NewUser>) -> impl Responder {
    //extract the data from the data
    let web::Json(NewUser { name, password }) = data;

    //call the create_user database function

    HttpResponse::Ok().body("user successfully created")
}
