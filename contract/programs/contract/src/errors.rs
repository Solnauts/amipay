//add all the error enums in here
use anchor_lang::prelude::*;

#[error_code]
pub enum InitializeAccountErrors {
    #[msg("incorrect usdc mint address")]
    IncorrectUscMint,
    #[msg("Admin is not verify")]
    InvalidAdmin,
    #[msg("unauthorized signer account")]
    UnauthorizedSigner,
    #[msg("Fee can be higher than the 5%")]
    FeeIsTooHigh,
}

#[error_code]
pub enum TransferToVaultError {
    #[msg("insufficient amount to transfer")]
    InsufficientAmountError,

    #[msg("the amount should be greater then 0")]
    InvalidAmmount,
    #[msg("In multiply the calculation overflow")]
    AmountOverFlow,
}
