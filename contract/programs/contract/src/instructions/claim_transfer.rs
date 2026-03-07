use crate::brainstructs::MainAccountShape;
use crate::errors::InitializeAccountErrors;
use crate::errors::TransferToVaultError;
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};
const USDC_MINT: Pubkey = Pubkey::from_str_const("USDCoctVLVnvTXBEuP9s8hntucdJokbo17RwHuNXemT");

// Withdraw: user_usdc_ata ==> net amount to destination (user's external wallet ATA),
//           fee to main_usdc_vault
#[derive(Accounts)]
pub struct ClaimByUser<'info> {
    //signer (admin)
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

    //user's program-owned usdc ata (source of funds for withdrawal)
    #[account(mut, token::authority = main_state_account, token::mint = usdc_mint)]
    pub user_usdc_ata: InterfaceAccount<'info, TokenAccount>,

    //destination: user's external wallet usdc token account (where they receive the withdraw)
    /// CHECK: This is the user's own USDC token account (not program-owned).
    /// We only validate that it has the correct mint.
    #[account(mut, token::mint = usdc_mint)]
    pub destination_usdc_ata: InterfaceAccount<'info, TokenAccount>,

    //main vault account (fee goes here)
    #[account(mut, token::authority = main_state_account, token::mint = usdc_mint, seeds = [b"main_usdc_vault",usdc_mint.key().as_ref(), signer.key().as_ref()], bump)]
    pub main_usdc_vault: InterfaceAccount<'info, TokenAccount>,
}

impl<'info> ClaimByUser<'info> {
    //withdraw from user_usdc_ata: net amount → destination, fee → main vault
    pub fn claim_by_user(&self, amount: u64) -> Result<()> {
        // Validate the withdrawal amount
        require_gt!(amount, 0, TransferToVaultError::InsufficientAmountError);
        require_gte!(
            self.user_usdc_ata.amount,
            amount,
            TransferToVaultError::InsufficientAmountError
        );

        let decimals = self.usdc_mint.decimals;

        let usdc_mint = self.main_state_account.usdc_mint;
        let admin = self.signer.key();

        // PDA signer seeds for main_state_account (authority over user_usdc_ata)
        let seeds = [
            b"main_state",
            usdc_mint.as_ref(),
            admin.as_ref(),
            &[self.main_state_account.self_bump],
        ];
        let signer_seeds = &[&seeds[..]];

        // Calculate fee
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

        let net_amount = amount
            .checked_sub(fee_amount)
            .ok_or(TransferToVaultError::AmountOverFlow)?;

        // 1) Transfer net amount: user_usdc_ata -> destination_usdc_ata (user's external wallet)
        let cpi_accounts_dest = TransferChecked {
            mint: self.usdc_mint.to_account_info(),
            from: self.user_usdc_ata.to_account_info(),
            to: self.destination_usdc_ata.to_account_info(),
            authority: self.main_state_account.to_account_info(),
        };

        let cpi_context_dest = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            cpi_accounts_dest,
            signer_seeds,
        );

        token_interface::transfer_checked(cpi_context_dest, net_amount, decimals)?;

        // 2) Transfer fee: user_usdc_ata -> main_usdc_vault
        let cpi_accounts_fee = TransferChecked {
            mint: self.usdc_mint.to_account_info(),
            from: self.user_usdc_ata.to_account_info(),
            to: self.main_usdc_vault.to_account_info(),
            authority: self.main_state_account.to_account_info(),
        };

        // Re-derive signer seeds (borrow checker)
        let seeds_fee = [
            b"main_state",
            usdc_mint.as_ref(),
            admin.as_ref(),
            &[self.main_state_account.self_bump],
        ];
        let signer_seeds_fee = &[&seeds_fee[..]];

        let cpi_context_fee = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            cpi_accounts_fee,
            signer_seeds_fee,
        );

        token_interface::transfer_checked(cpi_context_fee, fee_amount, decimals)?;

        Ok(())
    }
}
