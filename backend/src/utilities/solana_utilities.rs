use anchor_client::{
    Client, Cluster,
    solana_sdk::{
        signature::{Keypair, read_keypair_file},
        signer::Signer,
        system_program,
    },
};
use contract::{ID_CONST, accounts, instruction, program::Contract};
use solana_client::rpc_client::RpcClient;
use solana_commitment_config::CommitmentConfig;
use solana_sdk::pubkey::{self, Pubkey};
use std::{error::Error, rc::Rc, str::FromStr};
use tokio::{self};
//call the function in the solana rpc
pub fn create_user_ata() -> Result<(), Box<dyn Error>> {
    //call the solana rpc to call to create the accounts
    let payer = read_keypair_file("~/.config/solana/id.json").unwrap();

    let client = Client::new(Cluster::Devnet, Rc::new(payer));

    let program = client.program(contract::ID).unwrap();

    //fetch the main_state_account
    let main_state_account = get_accounts().unwrap().1;
anchor_lang::prelude::Pubkey::from_str
    //fetch usdc_mint
    let usdc_mint = Pubkey::from_str("USDCoctVLVnvTXBEuP9s8hntucdJokbo17RwHuNXemT").unwrap();

    //place the request on the solana blockchain
    program.request().accounts(accounts::Initialize {
        main_state_account,
        signer: payer.pubkey(),
        usdc_mint,
        system_program: system_program::id(),
    })
}

#[tokio::main]
async fn get_accounts()
-> std::result::Result<(solana_sdk::account::Account, pubkey::Pubkey), Box<dyn Error>> {
    let client = RpcClient::new_with_commitment(
        String::from("https://api.devnet.solana.com"),
        CommitmentConfig::confirmed(),
    );

    let usdc_mint = Pubkey::from_str("USDCoctVLVnvTXBEuP9s8hntucdJokbo17RwHuNXemT").unwrap();
    let signer = read_keypair_file("~/.config/solana/id.json")
        .unwrap()
        .pubkey();
    let account_seed = [b"main_state", usdc_mint.as_ref(), signer.as_ref()];

    //the program id of the program
    let program_id = Pubkey::from_str("HeHSU8GmNjDF7kwM7j2fbheeigdZD9AJzeMC2u5SGCs5").unwrap();

    let pda = Pubkey::find_program_address(&account_seed, &program_id)
        .0
        .to_string();

    let required_pda = pubkey::Pubkey::from_str(&pda).unwrap();
    let main_state_account = client.get_account(&required_pda);

    match main_state_account {
        Ok(value) => {
            println!("Success! the value is : {:?}", value);
            Ok((value, required_pda))
        }
        Err(error) => {
            println!("error while fetching account {:?} ", error);
            Err(error.into())
        }
    }
}
