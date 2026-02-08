use anchor_lang::prelude::*;

pub mod brainstructs;
pub mod errors;
pub mod instructions;

use instructions::*;

declare_id!("HeHSU8GmNjDF7kwM7j2fbheeigdZD9AJzeMC2u5SGCs5");

#[program]
pub mod contract {
    use super::*;

    pub fn initialize(ctx: Context<InitializeMainAccounts>) -> Result<()> {
        //return the user public address from this function
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }

    pub fn transfertovault(ctx: Context<TransferToVault>) -> Result<()> {
        //return the user public address from this function
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}
