use anchor_client::{
    Client, Cluster,
    solana_sdk::{
        signature::{Keypair, Signature, read_keypair_file},
        signer::Signer,
        system_program,
    },
};
use contract::{ID_CONST, accounts, instruction, program::Contract};
use solana_client::rpc_client::RpcClient;
use solana_commitment_config::CommitmentConfig;
use solana_sdk::pubkey::{self, Pubkey};
use spl_token_interface::id as token_program_value;
use std::{error::Error, rc::Rc, str::FromStr};
use tokio::{self};

//call the function in the solana rpc
pub struct RpcResponse {
    pub success: bool,
    pub value: Signature,
}

#[tokio::main]
pub async fn create_user_ata() -> Result<RpcResponse, Box<dyn Error>> {
    //call the solana rpc to call to create the accounts
    let payer = read_keypair_file("~/.config/solana/id.json").unwrap();
    let payer_pubkey = payer.pubkey();
    let payer_ref: &'static Keypair = Box::leak(Box::new(payer));
    let client = Client::new(Cluster::Devnet, Rc::new(payer_ref));

    let program = client.program(contract::ID).unwrap();

    //fetch the main_state_account
    let required_state_account = get_accounts().unwrap().1;
    let main_state_account =
        anchor_lang::prelude::Pubkey::from_str(&required_state_account.to_string()).unwrap();

    //the program id of the program
    let program_id =
        anchor_lang::prelude::Pubkey::from_str("HeHSU8GmNjDF7kwM7j2fbheeigdZD9AJzeMC2u5SGCs5")
            .unwrap();

    //fetch usdc_mint
    let usdc_mint =
        anchor_lang::prelude::Pubkey::from_str("USDCoctVLVnvTXBEuP9s8hntucdJokbo17RwHuNXemT")
            .unwrap();
    let needed_val = token_program_value().to_string();
    let token_program_id = anchor_lang::prelude::Pubkey::from_str(&needed_val).unwrap();
    let user_usdc_ata_seed = [b"user_usdc_ata", usdc_mint.as_ref()];
    let user_usdc_ata_pubkey =
        anchor_lang::prelude::Pubkey::find_program_address(&user_usdc_ata_seed, &program_id).0;

    //place the request on the solana blockchain
    let rpc_response = program
        .request()
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
        .unwrap();

    //send the response from this t
    let response = RpcResponse {
        success: true,
        value: rpc_response,
    };

    Ok(response)
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
