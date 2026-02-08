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

    //initialize
    pub fn initialize(ctx: Context<InitializeMainAccounts>) -> Result<()> {
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
