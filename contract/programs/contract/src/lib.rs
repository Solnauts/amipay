use anchor_lang::prelude::*;

pub mod brainstructs;
pub mod errors;
pub mod instructions;

use instructions::*;

declare_id!("HeHSU8GmNjDF7kwM7j2fbheeigdZD9AJzeMC2u5SGCs5");

#[program]
pub mod contract {
    use anchor_lang::prelude::program::set_return_data;

    use super::*;
    //create main accounts
    //initialize
    pub fn create_main_accounts(ctx: Context<CreateMainAccounts>) -> Result<()> {
        let main_state_account = &mut ctx.accounts.main_state_account;
        main_state_account.admin_signer = ctx.accounts.signer.key();
        main_state_account.usdc_mint = ctx.accounts.usdc_mint.key();
        main_state_account.main_vault_account = ctx.accounts.main_usdc_vault.key();
        main_state_account.self_bump = ctx.bumps.main_state_account;
        main_state_account.main_usdc_vault_bump = ctx.bumps.main_usdc_vault;

        msg!("all main states created");
        Ok(())
    }

    //initialize
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        //return the user public address from this function
        msg!("Greetings from: {:?}", ctx.program_id);

        //return to client
        set_return_data(ctx.accounts.user_usdc_ata.key().as_ref());
        Ok(())
    }

    //transfer to vault
    pub fn transfertovault(ctx: Context<TransferToVault>, amount: u64) -> Result<()> {
        //return the user public address from this function
        ctx.accounts.main_transfer(amount)?;
        Ok(())
    }
}
