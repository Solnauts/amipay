use anchor_lang::prelude::*;

//the acccount should be init before

//account struct fo the mainbrain state

#[account]
#[derive(InitSpace)]
pub struct MainAccountShape {
    pub usdc_mint: Pubkey,
    pub main_vault_account: Pubkey,
    pub bump: u8,
}
