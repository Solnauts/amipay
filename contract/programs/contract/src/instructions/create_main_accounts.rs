use crate::brainstructs::MainAccountShape;
use crate::errors::InitializeAccountErrors;
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
// use std:
const USDC_MINT: Pubkey = Pubkey::from_str_const("USDCoctVLVnvTXBEuP9s8hntucdJokbo17RwHuNXemT");
const ADMIN: Pubkey = Pubkey::from_str_const("9XuNexvJhHUMxtKBdzsF1zsffAMzGbp4JuRAWaevxZAJ");
//function for the initilizing the struct
//THIS IS THE MAIN VAULT THAT CREATE ONCE AND HOLD THE ACCOUNTS
#[derive(Accounts)]
pub struct CreateMainAccounts<'info> {
    //the signer is admin signer keypair sign for all the transactions
    #[account(mut, constraint=signer.key() == ADMIN @InitializeAccountErrors::InvalidAdmin)]
    pub signer: Signer<'info>,

    //mint account for the tokens
    #[account(constraint = usdc_mint.key() == USDC_MINT @InitializeAccountErrors::IncorrectUscMint)]
    pub usdc_mint: InterfaceAccount<'info, Mint>,

    //system program field
    pub system_program: Program<'info, System>,

    //create or update the main state account
    #[account( init_if_needed, payer = signer, space = 8 + MainAccountShape::INIT_SPACE, seeds = [b"main_state", usdc_mint.key().as_ref(), signer.key().as_ref()], bump)]
    pub main_state_account: Account<'info, MainAccountShape>,

    //Program own usdc_ata as a fee_collector
    #[account(init_if_needed , payer = signer,     associated_token::mint = usdc_mint,
        associated_token::authority = main_state_account,
        associated_token::token_program = token_program) ]
    pub fee_collector_usdc_ata: InterfaceAccount<'info, TokenAccount>,
    //token program
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    //create usdc_vault (or reuse existing)
    #[account(init_if_needed, payer = signer, token::mint= usdc_mint, token::authority = main_state_account, token::token_program = token_program, seeds = [b"main_usdc_vault",usdc_mint.key().as_ref(), signer.key().as_ref()], bump)]
    pub main_usdc_vault: InterfaceAccount<'info, TokenAccount>,
}
