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
use std::{env, error::Error, rc::Rc, str::FromStr};
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

#[tokio::main]
pub async fn create_user_ata(unique_id: String) -> Result<RpcResponse, Box<dyn Error>> {
    // Load environment variables
    dotenv().ok();

    let keypair_path = env::var("SOLANA_KEYPAIR_PATH").expect("SOLANA_KEYPAIR_PATH must be set");
    let program_id_str = env::var("SOLANA_PROGRAM_ID").expect("SOLANA_PROGRAM_ID must be set");
    let usdc_mint_str = env::var("SOLANA_USDC_MINT").expect("SOLANA_USDC_MINT must be set");
    let user_usdc_ata_seed_str =
        env::var("SOLANA_SEED_USER_USDC_ATA").expect("SOLANA_SEED_USER_USDC_ATA must be set");

    //call the solana rpc to call to create the accounts
    let payer = read_keypair_file(&keypair_path).unwrap();
    let payer_pubkey = payer.pubkey();
    let payer_ref: &'static Keypair = Box::leak(Box::new(payer));
    let client = Client::new(Cluster::Devnet, Rc::new(payer_ref));

    //let unique_id
    let unique_id_ref: &'static String = Box::leak(Box::new(unique_id));
    let program = client.program(contract::ID).unwrap();

    //fetch the main_state_account
    let required_state_account = get_main_state_accounts().await.unwrap().1;
    let main_state_account =
        anchor_lang::prelude::Pubkey::from_str(&required_state_account.to_string()).unwrap();

    //the program id of the program
    let program_id = anchor_lang::prelude::Pubkey::from_str(&program_id_str).unwrap();

    //fetch usdc_mint
    let usdc_mint = anchor_lang::prelude::Pubkey::from_str(&usdc_mint_str).unwrap();
    let needed_val = token_program_value().to_string();
    let token_program_id = anchor_lang::prelude::Pubkey::from_str(&needed_val).unwrap();
    let user_usdc_ata_seed = [user_usdc_ata_seed_str.as_bytes(), usdc_mint.as_ref()];
    let user_usdc_ata_pubkey =
        anchor_lang::prelude::Pubkey::find_program_address(&user_usdc_ata_seed, &program_id).0;

    //place the request on the solana blockchain
    let _rpc_response = program
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
        .unwrap();

    //get the user ata
    let user_usdc_ata = get_user_ata(unique_id_ref.to_string()).await.unwrap();

    //send the response from this t
    let response = RpcResponse {
        success: true,
        value: user_usdc_ata.1,
    };

    Ok(response)
}

//for geting main_state_account;
async fn get_main_state_accounts()
-> std::result::Result<(solana_sdk::account::Account, pubkey::Pubkey), Box<dyn Error>> {
    dotenv().ok();

    let rpc_url = env::var("SOLANA_RPC_URL").expect("SOLANA_RPC_URL must be set");
    let usdc_mint_str = env::var("SOLANA_USDC_MINT").expect("SOLANA_USDC_MINT must be set");
    let program_id_str = env::var("SOLANA_PROGRAM_ID").expect("SOLANA_PROGRAM_ID must be set");
    let keypair_path = env::var("SOLANA_KEYPAIR_PATH").expect("SOLANA_KEYPAIR_PATH must be set");
    let main_state_seed =
        env::var("SOLANA_SEED_MAIN_STATE").expect("SOLANA_SEED_MAIN_STATE must be set");

    let client = RpcClient::new_with_commitment(rpc_url, CommitmentConfig::confirmed());

    let usdc_mint = Pubkey::from_str(&usdc_mint_str).unwrap();
    let signer = read_keypair_file(&keypair_path).unwrap().pubkey();
    let account_seed = [
        main_state_seed.as_bytes(),
        usdc_mint.as_ref(),
        signer.as_ref(),
    ];

    //the program id of the program
    let program_id = Pubkey::from_str(&program_id_str).unwrap();

    let pda = Pubkey::find_program_address(&account_seed, &program_id)
        .0
        .to_string();

    let required_pda = pubkey::Pubkey::from_str(&pda).unwrap();
    let main_state_account = client.get_account(&required_pda);

    //fix the issue
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

//fn get user ata
async fn get_user_ata(
    unique_id: String,
) -> std::result::Result<(solana_sdk::account::Account, pubkey::Pubkey), Box<dyn Error>> {
    dotenv().ok();

    let rpc_url = env::var("SOLANA_RPC_URL").expect("SOLANA_RPC_URL must be set");
    let program_id_str = env::var("SOLANA_PROGRAM_ID").expect("SOLANA_PROGRAM_ID must be set");
    let usdc_mint_str = env::var("SOLANA_USDC_MINT").expect("SOLANA_USDC_MINT must be set");
    let user_ata_seed_str =
        env::var("SOLANA_SEED_USER_USDC_ATA").expect("SOLANA_SEED_USER_USDC_ATA must be set");

    let client = RpcClient::new_with_commitment(rpc_url, CommitmentConfig::confirmed());
    let program_id = Pubkey::from_str(&program_id_str).unwrap();
    let usdc_mint = Pubkey::from_str(&usdc_mint_str).unwrap();
    let user_ata_seed = [
        user_ata_seed_str.as_bytes(),
        unique_id.as_bytes(),
        usdc_mint.as_ref(),
    ];
    let user_ata_pda_address = Pubkey::find_program_address(&user_ata_seed, &program_id);

    let user_usdc_ata_account = client.get_account(&user_ata_pda_address.0);

    //fix the issue
    match user_usdc_ata_account {
        Ok(value) => {
            println!("Success! the value is : {:?}", value);
            Ok((value, user_ata_pda_address.0))
        }
        Err(error) => {
            println!("error while fetching account {:?} ", error);
            Err(error.into())
        }
    }
}

pub async fn get_user_ata_balance(
    unqiue_id: String,
    amount_claim: u64,
) -> std::result::Result<AmountResponse, Box<dyn Error>> {
    //make the client
    let rpc_url = env::var("SOLANA_RPC_URL").expect("SOLANA_RPC_URL must be set");
    let client = RpcClient::new_with_commitment(rpc_url, CommitmentConfig::confirmed());

    //get the userid and make the seed
    let program_id_str = env::var("SOLANA_PROGRAM_ID").expect("SOLANA_PROGRAM_ID must be set");
    let usdc_mint_str = env::var("SOLANA_USDC_MINT").expect("SOLANA_USDC_MINT must be set");
    let user_ata_seed_str =
        env::var("SOLANA_SEED_USER_USDC_ATA").expect("SOLANA_SEED_USER_USDC_ATA must be set");
    let usdc_mint = Pubkey::from_str(&usdc_mint_str).unwrap();
    let program_id = Pubkey::from_str(&program_id_str).unwrap();

    let user_ata_seed = [
        user_ata_seed_str.as_bytes(),
        unqiue_id.as_bytes(),
        usdc_mint.as_ref(),
    ];

    //user ata pda address
    let user_ata_pda_address = Pubkey::find_program_address(&user_ata_seed, &program_id);

    let user_usdc_ata_account = client.get_balance(&user_ata_pda_address.0);

    //user usdc ata
    match user_usdc_ata_account {
        Ok(value) => {
            println!("Success! the value is : {:?}", value);
            if value >= amount_claim {
                let response = AmountResponse {
                    success: true,
                    amount: value,
                    issue: None,
                };
                Ok(response)
            } else {
                let response = AmountResponse {
                    success: false,
                    amount: value,
                    issue: Some("Insufficient Balance".to_string()),
                };
                Ok(response)
            }
        }
        Err(error) => {
            println!("error while fetching account {:?} ", error);
            Err(error.into())
        }
    }
}
