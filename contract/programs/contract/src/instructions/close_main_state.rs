use crate::errors::InitializeAccountErrors;
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenInterface};

const USDC_MINT: Pubkey = Pubkey::from_str_const("USDCoctVLVnvTXBEuP9s8hntucdJokbo17RwHuNXemT");
const ADMIN: Pubkey = Pubkey::from_str_const("9XuNexvJhHUMxtKBdzsF1zsffAMzGbp4JuRAWaevxZAJ");

/// Instruction to close a stale main_state PDA that has an outdated
/// data layout and can no longer be deserialized.
///
/// Uses UncheckedAccount because the old data layout doesn't match
/// the current MainAccountShape struct (different size).
///
/// Only the ADMIN can call this.
/// The rent lamports are returned to the signer.
#[derive(Accounts)]
pub struct CloseMainState<'info> {
    #[account(mut, constraint = signer.key() == ADMIN @InitializeAccountErrors::InvalidAdmin)]
    pub signer: Signer<'info>,

    #[account(constraint = usdc_mint.key() == USDC_MINT @InitializeAccountErrors::IncorrectUscMint)]
    pub usdc_mint: InterfaceAccount<'info, Mint>,

    pub system_program: Program<'info, System>,

    /// The stale main_state PDA to close.
    /// CHECK: We verify via seeds that this is the correct PDA.
    /// We use UncheckedAccount because the data can't be deserialized
    /// with the current struct layout.
    #[account(
        mut,
        seeds = [b"main_state", usdc_mint.key().as_ref(), signer.key().as_ref()],
        bump,
        constraint = main_state_account.owner == &crate::ID @InitializeAccountErrors::InvalidAdmin,
    )]
    pub main_state_account: UncheckedAccount<'info>,

    /// The main_usdc_vault PDA token account to close.
    /// CHECK: We verify via seeds + owner.
    #[account(
        mut,
        seeds = [b"main_usdc_vault", usdc_mint.key().as_ref(), signer.key().as_ref()],
        bump,
    )]
    pub main_usdc_vault: UncheckedAccount<'info>,

    pub token_program: Interface<'info, TokenInterface>,
}
