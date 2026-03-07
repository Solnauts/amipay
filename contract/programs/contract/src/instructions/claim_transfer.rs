use crate::brainstructs::MainAccountShape;
use crate::errors::InitializeAccountErrors;
use crate::errors::TransferToVaultError;
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};
const USDC_MINT: Pubkey = Pubkey::from_str_const("USDCoctVLVnvTXBEuP9s8hntucdJokbo17RwHuNXemT");

//Transfer from Program own Usdc ata ==> to main vault of the program
#[derive(Accounts)]
pub struct ClaimByUser<'info> {
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

    //Program own fee_collector_usdc_ata
    #[account(mut,associated_token::mint = usdc_mint, associated_token::authority = main_state_account )]
    pub fee_collector_usdc_ata: InterfaceAccount<'info, TokenAccount>,

    //user which claim  usdc account ata
    #[account(mut, token::authority = main_state_account, token::mint = usdc_mint)]
    pub user_usdc_ata: InterfaceAccount<'info, TokenAccount>,

    //main vault account
    #[account(mut, token::authority = main_state_account, token::mint = usdc_mint, seeds = [b"main_usdc_vault",usdc_mint.key().as_ref(), signer.key().as_ref()], bump)]
    pub main_usdc_vault: InterfaceAccount<'info, TokenAccount>,
}

impl<'info> ClaimByUser<'info> {
    //transfer from user wallet to the mainvault
    //transfer from user wallet to the mainvault
    pub fn claim_by_user(&self, amount: u64) -> Result<()> {
        //main the account is not working fine on this

        let decimals = self.usdc_mint.decimals;

        let cpi_accounts = TransferChecked {
            mint: self.usdc_mint.to_account_info(),
            from: self.main_usdc_vault.to_account_info(), // TRANSFER  PROGRAM OWNED ATA
            to: self.user_usdc_ata.to_account_info(),
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

        let net_amount = amount - fee_amount;

        token_interface::transfer_checked(cpi_context, net_amount, decimals)?;

        // Transfer the fee to the fee_collector_usdc_ata
//HE WE DO THE DOUBLE TRASFER FOR THE FEE COLLECT
        let cpi_account = TransferChecked {
            mint: self.usdc_mint.to_account_info(),
            from: self.main_usdc_vault.to_account_info(), // PROGRAM USER ATA T
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
