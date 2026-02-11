use anchor_lang::prelude::*;

//account struct fo the mainbrain state
#[account]
#[derive(InitSpace)]
pub struct MainAccountShape {
    pub admin_signer: Pubkey,
    pub usdc_mint: Pubkey,
    pub main_vault_account: Pubkey,
    pub bump: u8,
}
