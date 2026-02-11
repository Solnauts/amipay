use anchor_client::{
    Client, Cluster,
    solana_sdk::{
        signature::{Keypair, read_keypair_file},
        signer::Signer,
        system_program,
    },
};
use anchor_lang::prelude::*;
use contract::{accounts, instruction};

//call the function in the solana rpc
pub fn create_user_ata() -> Result<(), Box<dyn std::error::Error>> {
    //call the solana rpc to call to create the accounts
}
