use anchor_lang::prelude::*;

pub mod brainstructs;
pub mod errors;
pub mod instructions;

use instructions::*;

use crate::errors::InitializeAccountErrors;
declare_id!("HeHSU8GmNjDF7kwM7j2fbheeigdZD9AJzeMC2u5SGCs5");

#[program]
pub mod contract {
    use anchor_lang::prelude::program::set_return_data;

    use super::*;
    //create main accounts
    //initialize
    pub fn create_main_accounts(ctx: Context<CreateMainAccounts>, fee: u64) -> Result<()> {
        let main_state_account = &mut ctx.accounts.main_state_account;
        main_state_account.admin_signer = ctx.accounts.signer.key();
        main_state_account.usdc_mint = ctx.accounts.usdc_mint.key();
        main_state_account.main_vault_account = ctx.accounts.main_usdc_vault.key();
        main_state_account.self_bump = ctx.bumps.main_state_account;
        main_state_account.main_usdc_vault_bump = ctx.bumps.main_usdc_vault;
        main_state_account.fee_collector_usdc_ata = ctx.accounts.fee_collector_usdc_ata.key();
        //Fee cant be higher than the 5%
        require_gte!(500, fee, InitializeAccountErrors::FeeIsTooHigh);
        main_state_account.fee = fee;
        msg!("all main states created");
        Ok(())
    }

    //initialize
    pub fn initialize(ctx: Context<Initialize>, _unique_id: String) -> Result<()> {
        //return the user public address from this function
        msg!("Greetings from: {:?}", ctx.program_id);

        //return to client
        set_return_data(ctx.accounts.user_usdc_ata.key().as_ref());
        Ok(())
    }

    //transfer to vault
    pub fn transfertovault(ctx: Context<TransferToVault>, amount: u64) -> Result<()> {
        //validate and transfer: net amount to receiver, fee to main vault
        ctx.accounts.main_transfer(amount)?;
        ctx.accounts.transfer_to_receiver_and_vault(amount)?;
        Ok(())
    }
    pub fn claim_by_user(ctx: Context<ClaimByUser>, amount: u64) -> Result<()> {
        //return the user public address from this function
        ctx.accounts.claim_by_user(amount)?;
        Ok(())
    }

    /// Close a stale main_state PDA and its associated main_usdc_vault PDA.
    /// This is needed when the MainAccountShape struct layout changes and
    /// old accounts can no longer be deserialized.
    pub fn close_main_state(ctx: Context<CloseMainState>) -> Result<()> {
        // --- Close the main_usdc_vault (token account via CPI if it exists) ---
        let vault_info = ctx.accounts.main_usdc_vault.to_account_info();
        if vault_info.lamports() > 0 && vault_info.data_len() > 0 {
            // For a token account owned by Token Program, we need CPI close.
            // But since main_state can't be deserialized, we derive the bump from ctx.
            // Actually, since main_state is the authority and we can't read self_bump,
            // we'll use the bump from ctx.bumps for main_state_account.
            let usdc_mint = ctx.accounts.usdc_mint.key();
            let admin = ctx.accounts.signer.key();
            let bump = ctx.bumps.main_state_account;
            let seeds = [
                b"main_state" as &[u8],
                usdc_mint.as_ref(),
                admin.as_ref(),
                &[bump],
            ];
            let signer_seeds = &[&seeds[..]];

            let cpi_accounts = anchor_spl::token_interface::CloseAccount {
                account: vault_info.clone(),
                destination: ctx.accounts.signer.to_account_info(),
                authority: ctx.accounts.main_state_account.to_account_info(),
            };

            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts,
                signer_seeds,
            );

            anchor_spl::token_interface::close_account(cpi_ctx)?;
            msg!("Closed main_usdc_vault PDA");
        }

        // --- Close the main_state PDA (program-owned, manual close) ---
        let state_info = ctx.accounts.main_state_account.to_account_info();
        let signer_info = ctx.accounts.signer.to_account_info();

        // Transfer all lamports from state to signer
        let state_lamports = state_info.lamports();
        **signer_info.try_borrow_mut_lamports()? += state_lamports;
        **state_info.try_borrow_mut_lamports()? = 0;

        // Zero out the data
        let mut data = state_info.try_borrow_mut_data()?;
        for byte in data.iter_mut() {
            *byte = 0;
        }

        msg!("Closed main_state PDA");
        Ok(())
    }
}
