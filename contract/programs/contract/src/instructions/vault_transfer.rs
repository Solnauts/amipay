use crate::brainstructs::MainAccountShape;
use crate::errors::InitializeAccountErrors;
use crate::errors::TransferToVaultError;
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};
const USDC_MINT: Pubkey = Pubkey::from_str_const("USDCoctVLVnvTXBEuP9s8hntucdJokbo17RwHuNXemT");

//Transfer from Program own Usdc ata ==> to main vault of the program
#[derive(Accounts)]
pub struct TransferToVault<'info> {
    //signer
    #[account(mut, constraint = signer.key() == main_state_account.admin_signer @InitializeAccountErrors::UnauthorizedSigner)]
    pub signer: Signer<'info>,

    //mint account for the tokens
    #[account(constraint = usdc_mint.key() == USDC_MINT @InitializeAccountErrors::IncorrectUscMint)]
    pub usdc_mint: InterfaceAccount<'info, Mint>,

    //system program field
    pub system_program: Program<'info, System>,

    //token program
    pub token_program: Interface<'info, TokenInterface>,

    //brain state account
    #[account(seeds = [b"main_state", usdc_mint.key().as_ref(), signer.key().as_ref()], bump = main_state_account.self_bump)]
    pub main_state_account: Account<'info, MainAccountShape>,

    #[account(mut,associated_token::mint = usdc_mint, associated_token::authority = main_state_account )]
    pub fee_collector_usdc_ata: InterfaceAccount<'info, TokenAccount>,
    //user usdc account
    #[account(mut, token::authority = main_state_account, token::mint = usdc_mint)]
    pub user_usdc_ata: InterfaceAccount<'info, TokenAccount>,

    //main vault account
    #[account(mut, token::authority = main_state_account, token::mint = usdc_mint, seeds = [b"main_usdc_vault",usdc_mint.key().as_ref(), signer.key().as_ref()], bump)]
    pub main_usdc_vault: InterfaceAccount<'info, TokenAccount>,
}

impl<'info> TransferToVault<'info> {
    //transfer from user wallet to the mainvault
    //transfer from user wallet to the mainvault
    pub fn main_transfer(&self, amount: u64) -> Result<()> {
        //main the account is not working fine on this
        require_gt!(amount, 0, TransferToVaultError::InsufficientAmountError);
        require_gte!(
            self.user_usdc_ata.amount,
            amount,
            TransferToVaultError::InsufficientAmountError
        );
        //checks for the amount
        // self.checks(amount)?;
        // //transfer to the main vault
        // self.transfer_to_main_vault(amount)?;
        Ok(())
    }

    //should be the private functions

    // fn checks(&self, amount: u64) -> Result<()> {
    //     //if transfering amount is zero
    //     if amount <= 0 {
    //         return err!(TransferToVaultError::InvalidAmmount);
    //     }
    //
    //     //if account has the sufficient amount
    //     if self.user_usdc_ata.amount < amount {
    //         return err!(TransferToVaultError::InsufficientAmountError);
    //     }
    //
    //     Ok(())
    // }

    //should be the private functions

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
    pub fn transfer_to_main_vault(&self, amount: u64) -> Result<()> {
        let decimals = self.usdc_mint.decimals;

        let cpi_accounts = TransferChecked {
            mint: self.usdc_mint.to_account_info(),
            from: self.user_usdc_ata.to_account_info(),
            to: self.main_usdc_vault.to_account_info(),
            authority: self.main_state_account.to_account_info(),
        };

        let cpi_program = self.token_program.to_account_info();

        let usdc_mint = self.main_state_account.usdc_mint;
        let admin = self.signer.key();
        // the seeds is of the account that owns the vault
        let seeds = [
            b"main_state",
            usdc_mint.as_ref(),
            admin.as_ref(),
            &[self.main_state_account.self_bump],
        ];
        let signer_seeds = &[&seeds[..]];
        let cpi_context = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

        // Cuting the fee form the user_usdc_ata to transfer to main ata
        let fee_amount = amount
            .checked_mul(
                self.main_state_account
                    .fee
                    .checked_div(2)
                    .ok_or(TransferToVaultError::AmountOverFlow)?,
            )
            .ok_or(TransferToVaultError::AmountOverFlow)?
            .checked_div(10000)
            .ok_or(TransferToVaultError::AmountOverFlow)?;

        //Amount goes after fee cut into the program wallet from user_usdc_ata
        let net_amount = amount - fee_amount;

        token_interface::transfer_checked(cpi_context, net_amount, decimals)?;

        // Transfer the fee to the fee_collector_usdc_ata

        let cpi_account = TransferChecked {
            mint: self.usdc_mint.to_account_info(),
            from: self.user_usdc_ata.to_account_info(),
            to: self.fee_collector_usdc_ata.to_account_info(),
            authority: self.main_state_account.to_account_info(),
        };

        let seeds = [
            b"main_state",
            usdc_mint.as_ref(),
            admin.as_ref(),
            &[self.main_state_account.self_bump],
        ];
        let signer_seeds = &[&seeds[..]];
        let cpi_context = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            cpi_account,
            signer_seeds,
        );

        token_interface::transfer_checked(cpi_context, fee_amount, decimals)?;

        Ok(())
    }
}
