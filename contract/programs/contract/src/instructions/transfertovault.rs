use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Token},
    token_interface::{self, Burn, Mint, MintTo, TokenAccount, TokenInterface, TransferChecked},
};

use crate::brainstructs::MainAccountShape;

//for the transfer
#[derive(Accounts)]
pub struct TransferToVault<'info> {
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
    #[account(mut, token::authority = main_state_account)]
    pub user_usdc_ata: InterfaceAccount<'info, TokenAccount>,

    //main vault account
    #[account(mut, token::authority = main_state_account)]
    pub main_usdc_vault: InterfaceAccount<'info, TokenAccount>,
}

#[error_code]
pub enum TransferToVaultError {
    #[msg("insufficient amount to transfer")]
    InsufficientAmountError,
}

impl<'info> TransferToVault<'info> {
    //transfer from user wallet to the mainvault
    pub fn main_transfer(&self, amount: u64) -> Result<()> {
        //main the account is not working fine on this

        //checks for the amount
        self.checks(amount)?;
        //transfer to the main vault
        self.transfer_to_main_vault(amount)?;

        Ok(())
    }

    //should be the private functions

    fn checks(&self, amount: u64) -> Result<()> {
        //if account has the sufficient amount
        if self.user_usdc_ata.amount < amount {
            return err!(TransferToVaultError::InsufficientAmountError);
        }

        Ok(())
    }

    ////fee
    //fn deduct_and_transfer_fee(self, amount_in: u64) -> u64 {
    //    //constants for the fee
    //    const FEE_NUMERATOR: u128 = 100;
    //    const FEE_DENOMINATOR: u128 = 1000;
    //
    //    let amount_needed = amount_in as u128;
    //
    //    //calculate the fee
    //    let fee = (amount_needed * FEE_NUMERATOR) / FEE_DENOMINATOR;
    //
    //    //transfer fee from here to the main signer wallet
    //
    //    //return input_amount - fee
    //    (amount_needed - fee) as u64
    //}
    //
    //fn transfer_fee(&self, fee_amount: &u64) -> Result<()> {
    //    let decimals = self.usdc_mint.decimals;
    //
    //    let cpi_accounts = TransferChecked {
    //        mint: self.usdc_mint.to_account_info(),
    //        from: self.user_usdc_ata.to_account_info(),
    //        to: self.main_usdc_vault.to_account_info(),
    //        authority: self.main_state_account.to_account_info(),
    //    };
    //
    //    let cpi_program = self.token_program.to_account_info();
    //
    //    let usdc_mint = self.main_state_account.usdc_mint;
    //    let seeds = [
    //        b"pool_state_v3",
    //        usdc_mint.as_ref(),
    //        &[self.main_state_account.bump],
    //    ];
    //    let signer_seeds = &[&seeds[..]];
    //    let cpi_context = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
    //    token_interface::transfer_checked(cpi_context, *fee_amount, decimals)?;
    //    Ok(())
    //}

    //transfer to the main vault
    fn transfer_to_main_vault(&self, amount: u64) -> Result<()> {
        let decimals = self.usdc_mint.decimals;

        let cpi_accounts = TransferChecked {
            mint: self.usdc_mint.to_account_info(),
            from: self.user_usdc_ata.to_account_info(),
            to: self.main_usdc_vault.to_account_info(),
            authority: self.main_state_account.to_account_info(),
        };

        let cpi_program = self.token_program.to_account_info();

        let usdc_mint = self.main_state_account.usdc_mint;
        let seeds = [
            b"pool_state_v3",
            usdc_mint.as_ref(),
            &[self.main_state_account.bump],
        ];
        let signer_seeds = &[&seeds[..]];
        let cpi_context = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        token_interface::transfer_checked(cpi_context, amount, decimals)?;
        Ok(())
    }
}
