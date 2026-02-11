//add all the error enums in here
use anchor_lang::prelude::*;

#[error_code]
pub enum InitializeAccountErrors {
    #[msg("incorrect usdc mint address")]
    IncorrectUscMint,
}
