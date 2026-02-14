use anchor_lang::prelude::*;

//account struct fo the mainbrain state
#[account]
#[derive(InitSpace)]
pub struct MainAccountShape {
    pub admin_signer: Pubkey,
    pub usdc_mint: Pubkey,
    pub main_vault_account: Pubkey,
    pub self_bump: u8,
    pub main_usdc_vault_bump: u8,
    pub fee: u64,
    pub fee_collector_usdc_ata: Pubkey,
}
