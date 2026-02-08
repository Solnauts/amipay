use anchor_lang::prelude::*;
mod brainstructs;
mod errors;
mod instructions;

use crate::instructions::initialize::Initialize;
use crate::instructions::transfertovault::TransferToVault;
use brainstructs::MainAccountShape;

declare_id!("HeHSU8GmNjDF7kwM7j2fbheeigdZD9AJzeMC2u5SGCs5");

#[program]
pub mod contract {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
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
