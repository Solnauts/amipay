use crate::database::{
    establish_connection,
    model::{
        DbLedger, DbUser, Dbrecipient, NewLedger, NewUser, NewWalletUser, UpdateWalletProfile,
    },
};
use crate::errors::{AppError, DbError, ValidationError};
use crate::schema::user;
use diesel::prelude::*;
use diesel::PgConnection;

pub enum UserInfoResponse {
    Text(String),
    FullInfo(DbUser),
    UniqueId(String),
    NUmber(i32),
    Recipient(Dbrecipient),
}

pub struct UserInfoRequest {
    pub intent: String,
    pub user_id: i32,
    pub recipient_name: Option<String>,
}

pub struct UpdateUserLedgerRequest {
    pub user_id: i32,
    pub sender_id: i32,
    pub receiver_id: i32,
    pub amount: i64,
    pub currency: String,
    pub tx_signature: Option<String>,
    pub status: String,
}

/// Get user info based on intent — returns typed AppError on failure.
pub fn get_user_info(request: UserInfoRequest) -> Result<UserInfoResponse, AppError> {
    use crate::schema::user::dsl::*;

    let connection = &mut establish_connection()?;

    let user_result = user
        .filter(id.eq(&request.user_id))
        .get_result::<DbUser>(connection)
        .map_err(|e| DbError::UserLookupFailed {
            user_id: request.user_id,
            reason: e.to_string(),
        })?;

    match request.intent.as_str() {
        "amount" => {
            let amount_val = user_result.amount.unwrap_or(0) as i32;
            Ok(UserInfoResponse::NUmber(amount_val))
        }

        "recipient" => {
            use crate::schema::recipient::dsl::*;
            let recipient_name = request.recipient_name.clone().unwrap_or_default();
            let recpient_result = recipient
                .filter(userid.eq(&request.user_id))
                .filter(alias_used.eq(&recipient_name))
                .get_result::<Dbrecipient>(connection);

            match recpient_result {
                Ok(value) => Ok(UserInfoResponse::Recipient(value)),
                Err(_) => Err(ValidationError::RecipientNotFound {
                    name: recipient_name,
                }
                .into()),
            }
        }

        "unique_id" => Ok(UserInfoResponse::UniqueId(user_result.unique_id)),

        "full_user" | "user_info" => {
            let full_user = user
                .filter(id.eq(request.user_id))
                .get_result::<DbUser>(connection);

            match full_user {
                Ok(value) => Ok(UserInfoResponse::FullInfo(value)),
                Err(e) => Err(DbError::UserLookupFailed {
                    user_id: request.user_id,
                    reason: e.to_string(),
                }
                .into()),
            }
        }

        "wallet_address" => match user_result.wallet_address {
            Some(value) => Ok(UserInfoResponse::Text(value)),
            None => Err(ValidationError::UserNotFound {
                identifier: format!("wallet for user_id={}", request.user_id),
            }
            .into()),
        },

        other => Err(DbError::UnexpectedResult {
            context: format!("unknown intent: {}", other),
        }
        .into()),
    }
}

/// Create a user via contact number flow (full data upfront).
pub fn create_user(
    conn: &mut PgConnection,
    name: String,
    user_pin: String,
    unique_id: String,
    method_type: String,
    email: Option<String>,
    user_usdc_ata: String,
) -> Result<DbUser, DbError> {
    let new_user = NewUser {
        name: Some(name),
        user_pin,
        amount: None,
        unique_id,
        method_type,
        email,
        user_usdc_ata: Some(user_usdc_ata),
        wallet_address: None,
    };

    diesel::insert_into(user::table)
        .values(&new_user)
        .get_result(conn)
        .map_err(|e| DbError::UserCreationFailed {
            reason: e.to_string(),
        })
}

// ── Wallet Login Flow DB Functions ──────────────────────────────────────

/// Find an existing user by their wallet address.
/// Returns None if no user exists with this wallet address.
pub fn find_user_by_wallet(conn: &mut PgConnection, addr: &str) -> Result<Option<DbUser>, DbError> {
    use crate::schema::user::dsl::*;

    user.filter(wallet_address.eq(addr))
        .first::<DbUser>(conn)
        .optional()
        .map_err(|e| DbError::WalletLookupFailed {
            address: addr.to_string(),
            reason: e.to_string(),
        })
}

/// Auto-register a new wallet user with just the wallet address.
pub fn create_wallet_user(conn: &mut PgConnection, addr: &str) -> Result<DbUser, DbError> {
    let new_wallet_user = NewWalletUser {
        wallet_address: Some(addr.to_string()),
        unique_id: addr.to_string(),
        method_type: "wallet".to_string(),
        user_pin: String::new(),
    };

    diesel::insert_into(user::table)
        .values(&new_wallet_user)
        .get_result(conn)
        .map_err(|e| DbError::UserCreationFailed {
            reason: e.to_string(),
        })
}

/// Update profile for a wallet user (set username and pin).
pub fn update_wallet_user_profile(
    conn: &mut PgConnection,
    target_user_id: i32,
    new_name: String,
    hashed_pin: String,
) -> Result<DbUser, DbError> {
    use crate::schema::user::dsl::*;

    let changeset = UpdateWalletProfile {
        name: Some(new_name),
        user_pin: hashed_pin,
    };

    diesel::update(user.filter(id.eq(target_user_id)))
        .set(&changeset)
        .get_result(conn)
        .map_err(|e| DbError::ProfileUpdateFailed {
            user_id: target_user_id,
            reason: e.to_string(),
        })
}

/// Record a ledger entry (kept for backward compat — prefer
/// `ledger_model_function::record_transfer_and_update_amounts` for the full flow)
pub fn add_user_ledger(request: UpdateUserLedgerRequest) -> Result<(), DbError> {
    use crate::schema::ledger::dsl::*;

    let connection = &mut establish_connection()?;

    let changeset = NewLedger {
        sender_id: request.sender_id,
        receiver_id: request.receiver_id,
        amount: request.amount,
        currency: request.currency,
        tx_signature: request.tx_signature,
        status: request.status,
    };

    diesel::insert_into(ledger)
        .values(&changeset)
        .get_result::<DbLedger>(connection)
        .map_err(|e| DbError::LedgerInsertFailed {
            reason: e.to_string(),
        })?;

    Ok(())
}

/// Recalculate and persist user.amount from their ledger history.
pub fn update_user_amount(user_id: i32) -> Result<i64, AppError> {
    use super::ledger_model_function::update_user_amount_from_ledger;

    let connection = &mut establish_connection()?;

    update_user_amount_from_ledger(connection, user_id).map_err(|e| {
        DbError::BalanceCalcFailed {
            user_id,
            reason: e.to_string(),
        }
        .into()
    })
}

pub fn get_transaction_history(user_id: i32, limit: i32) -> Result<DbLedger, AppError> {
    use crate::schema::ledger::dsl::*;

    let connection = &mut establish_connection()?;
    ledger
        .filter(id.eq(&user_id))
        .limit(limit as i64)
        .get_result::<DbLedger>(connection)
        .map_err(|e| {
            DbError::QueryFailed {
                context: format!("transaction_history for user {}", user_id),
                reason: e.to_string(),
            }
            .into()
        })
}

pub struct UserPinResponse {
    pub success: bool,
    pub description: Option<String>,
}

pub fn match_user_pin(user_id: i32, input_user_pin: String) -> Result<bool, AppError> {
    use crate::schema::user::dsl::*;

    let connection = &mut establish_connection()?;
    let user_result = user
        .filter(id.eq(&user_id))
        .get_result::<DbUser>(connection)
        .map_err(|e| DbError::UserLookupFailed {
            user_id,
            reason: e.to_string(),
        })?;

    let is_same_pin = bcrypt::verify(input_user_pin, &user_result.user_pin).map_err(|e| {
        DbError::QueryFailed {
            context: format!("pin verify for user {}", user_id),
            reason: e.to_string(),
        }
    })?;

    Ok(is_same_pin)
}

pub struct AmountValidResponse {
    pub success: bool,
    pub amount: i64,
    pub available: i64,
}

pub fn is_amount_valid(
    main_amount: i64,
    user_id: i32,
    conn: &mut PgConnection,
) -> Result<AmountValidResponse, AppError> {
    use crate::schema::user::dsl::*;

    let db_response = user
        .filter(id.eq(&user_id))
        .get_result::<DbUser>(conn)
        .map_err(|e| DbError::UserLookupFailed {
            user_id,
            reason: e.to_string(),
        })?;

    let user_amount = db_response.amount.unwrap_or(0);

    if user_amount < main_amount {
        Err(ValidationError::InsufficientBalance {
            requested: main_amount,
            available: user_amount,
        }
        .into())
    } else {
        Ok(AmountValidResponse {
            success: true,
            amount: main_amount,
            available: user_amount,
        })
    }
}
