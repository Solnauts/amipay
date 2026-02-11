use crate::brainstructs::MainAccountShape;
use crate::errors::InitializeAccountErrors;
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

const USDC_MINT: Pubkey = Pubkey::from_str_const("USDCoctVLVnvTXBEuP9s8hntucdJokbo17RwHuNXemT");

//function for the initilizing the struct
#[derive(Accounts)]
pub struct CreaateMainAccounts<'info> {
    //the signer is admin signer keypair sign for all the transactions
    #[account(mut, constraint = signer.key() == main_state_account.admin_signer @InitializeAccountErrors::UnauthorizedSigner)]
    pub signer: Signer<'info>,

    //mint account for the tokens
    #[account(constraint = usdc_mint.key() == USDC_MINT @InitializeAccountErrors::IncorrectUscMint)]
    pub usdc_mint: InterfaceAccount<'info, Mint>,

    //system program field
    pub system_program: Program<'info, System>,

    //pass the account that is already initilized
    #[account( init, payer = signer, space = 8 + MainAccountShape::INIT_SPACE, seeds = [b"main_state", usdc_mint.key().as_ref(), signer.key().as_ref()], bump)]
    pub main_state_account: Account<'info, MainAccountShape>,

    //token program
    pub token_program: Interface<'info, TokenInterface>,

    //create usdc_vault
    #[account(init, payer = signer, token::mint= usdc_mint, token::authority = main_state_account, token::token_program = token_program, seeds = [b"main_usdc_vault",usdc_mint.key().as_ref()], bump)]
    pub main_usdc_vault: InterfaceAccount<'info, TokenAccount>,
}
