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