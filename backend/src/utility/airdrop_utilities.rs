use crate::utility::swap_utilities::{
    request_airdrop as sol_request_airdrop, AIRDROP_AMOUNT_LAMPORTS,
};
use dotenv::dotenv;
use std::{env, error::Error};

pub async fn trigger_airdrop() -> Result<String, Box<dyn Error>> {
    dotenv().ok();

    let admin_pubkey = env::var("SOLANA_ADMIN_PUBKEY").expect("SOLANA_ADMIN_PUBKEY must be set");

    let tx_hash = sol_request_airdrop(admin_pubkey, AIRDROP_AMOUNT_LAMPORTS).await?;
    
    println!("Airdrop triggered! Tx: {}", tx_hash);
    
    Ok(tx_hash)
}

pub fn get_airdrop_threshold() -> i64 {
    150_000_000
}

pub fn get_airdrop_amount() -> i64 {
    AIRDROP_AMOUNT_LAMPORTS
}

pub fn get_airdrop_cooldown() -> i64 {
    7200
}
