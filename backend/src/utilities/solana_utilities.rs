use anchor_client::{
    Client, Cluster,
    solana_sdk::{
        signature::{Keypair, read_keypair_file},
        signer::Signer,
        system_program,
    },
};
use solana_sdk::{pubkey, account::Account};
use anchor_lang::prelude::*;
use contract::{accounts, instruction, program::Contract, ID_CONST};
use std::{rc::Rc, str::FromStr};
use solana_client::rpc_client::RpcClient;

use solana_commitment_config::CommitmentConfig;
use tokio::{self, runtime::Id};

//call the function in the solana rpc
pub fn create_user_ata() -> Result<(), Box<dyn error::Error>> {
    //call the solana rpc to call to create the accounts
    let payer = read_keypair_file("~/.config/solana/id.json").unwrap();

    let client = Client::new(Cluster::Devnet, Rc::new(payer));

    let program = client.program(contract::ID).unwrap();

    //fetch the main_state_account
   let main_state_account =  

    //place the request on the solana blockchain
    program.request().accounts(accounts::Initialize {})
}


#[tokio::main]
async fn get_accounts() -> std::result::Result<solana_sdk::account::Account, Error>  {
    let client = RpcClient::new_with_commitment(
        String::from("https://api.devnet.solana.com"),
        CommitmentConfig::confirmed()
    );
   
    let usdc_mint = Pubkey::from_str("USDCoctVLVnvTXBEuP9s8hntucdJokbo17RwHuNXemT").unwrap();
    let signer =read_keypair_file("~/.config/solana/id.json").unwrap().pubkey();
    let account_seed = [b"main_state", usdc_mint.as_ref(), signer.as_ref()]; 
  
    //the program id of the program  
    let program_id  = Pubkey::from_str("HeHSU8GmNjDF7kwM7j2fbheeigdZD9AJzeMC2u5SGCs5").unwrap();

    let pda = Pubkey::find_program_address(&account_seed, &program_id).0.to_string();
 
    let required_pda = pubkey::Pubkey::from_str(&pda).unwrap();
   let main_state_account = client.get_account(&required_pda).unwrap();


    Ok(main_state_account)

}
