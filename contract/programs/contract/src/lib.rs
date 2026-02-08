use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Token},
    token_interface::{self, Burn, Mint, MintTo, TokenAccount, TokenInterface, TransferChecked},
};
mod datastructs;

use datastructs::MainAccountShape;

declare_id!("HeHSU8GmNjDF7kwM7j2fbheeigdZD9AJzeMC2u5SGCs5");

#[program]
pub mod contract {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    //signer
    #[account(mut)]
    //key in the user behalf
    pub signer: Signer<'info>,

    //mint account for the tokens
    pub usdc_mint: InterfaceAccount<'info, Mint>,

    //system program field
    pub system_program: Program<'info, System>,

    //account init
    pub main_state_account: Account<'info, MainAccountShape>,

    //token program
    pub token_program: Interface<'info, TokenInterface>,

    //create usdc_vault
    #[account(init, payer = signer, token::mint= usdc_mint, token::authority = main_state_account, token::token_program  = token_program, seeds = [b"user_usdc_ata",usdc_mint.key().as_ref()], bump)]
    pub usdc_vault: InterfaceAccount<'info, TokenAccount>,
}

//for the transfer
#[derive(Accounts)]
pub struct Swap<'info> {
    //signer
    #[account(mut)]
    pub signer: Signer<'info>,

    //mint account for the tokens
    pub usdc_mint: InterfaceAccount<'info, Mint>,

    //system program field
    pub system_program: Program<'info, System>,

    //token program
    pub token_program: Interface<'info, TokenInterface>,

    //brain state account
    pub main_state_account: Account<'info, MainAccountShape>,

    //user usdc account
    #[account(init, payer = signer, token::mint= usdc_mint, token::authority = main_state_account, token::token_program  = token_program, seeds = [b"user_usdc_ata",usdc_mint.key().as_ref()], bump)]
    pub usdc_vault: InterfaceAccount<'info, TokenAccount>,
}
