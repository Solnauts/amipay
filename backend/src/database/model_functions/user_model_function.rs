use crate::database::{
    establish_connection,
    model::{
        DbLedger, DbUser, Dbrecipient, NewLedger, NewUser, NewWalletUser, UpdateWalletProfile,
    },
};
use crate::schema::user;
use diesel::PgConnection;
use diesel::prelude::*;

pub struct DBResponse {
    pub success: bool,
    pub data: DbUser,
}

pub enum UserInfoResponse {
    Text(String),
    FullInfo(DbUser),
    UniqueId(String),
    NUmber(i32),
    Recipient(Dbrecipient),
    Error(String),
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

pub struct LedgerResponse {
    success: bool,
}

//has to change the return type
pub fn get_user_info(request: UserInfoRequest) -> UserInfoResponse {
    use crate::schema::user::dsl::*;
    //check if the user has enough

    let connection = &mut establish_connection();
    let user_result = user
        .filter(id.eq(&request.user_id))
        .get_result::<DbUser>(connection)
        .unwrap();

    //make decision on the basis of required_intent;
    match request.intent {
        //if the user want to check balance
        s if s == "amount".to_string() => {
            //return the amount the user have
            UserInfoResponse::NUmber(user_result.amount.unwrap() as i32)
        }

        //for getting recipeient
        s if s == "recipient".to_string() => {
            //check for this recipeient by making query to the recipient table
            //bring the recipient into scope
            use crate::schema::recipient::dsl::*;
            let recipient_name = request.recipient_name.unwrap();
            let recpient_result = recipient
                .filter(userid.eq(&request.user_id))
                .filter(name.eq(&recipient_name))
                .get_result::<Dbrecipient>(connection);

            match recpient_result {
                Ok(value) => {
                    //send the response
                    UserInfoResponse::Recipient(value)
                }
                Err(error) => {
                    //send the error response
                    UserInfoResponse::Error(error.to_string())
                }
            }
        }

        //for unique ids
        s if s == "unique_id".to_string() => UserInfoResponse::UniqueId(user_result.unique_id),

        //get the full user
        s if s == "full_user".to_string() => {
            let full_user = user
                .filter(id.eq(request.user_id))
                .get_result::<DbUser>(connection);

            match full_user {
                Ok(value) => {
                    //figure the issues
                    UserInfoResponse::FullInfo(value)
                }
                Err(_) => {
                    //error the issues
                    UserInfoResponse::Error("error finding db user".to_string())
                }
            }
        }

        //error query request
        _ => {
            println!("error query request");

            //return the error message
            UserInfoResponse::Error("invalid query request".to_string())
        }
    }
}
//create the user out of the system

// Create a user via contact number flow (full data upfront)
pub fn create_user(
    conn: &mut PgConnection,
    name: String,
    user_pin: String,
    unique_id: String,
    method_type: String,
    email: Option<String>,
    user_usdc_ata: String,
) -> DBResponse {
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

    let response = diesel::insert_into(user::table)
        .values(&new_user)
        .get_result(conn)
        .expect("Error saving the user");

    DBResponse {
        success: true,
        data: response,
    }
}

// ── Wallet Login Flow DB Functions ──────────────────────────────────────

/// Find an existing user by their wallet address.
/// Returns None if no user exists with this wallet address.
pub fn find_user_by_wallet(conn: &mut PgConnection, addr: &str) -> Option<DbUser> {
    use crate::schema::user::dsl::*;

    user.filter(wallet_address.eq(addr))
        .first::<DbUser>(conn)
        .optional()
        .expect("Error querying user by wallet address")
}

/// Auto-register a new wallet user with just the wallet address.
/// Used in the login flow when the address doesn't exist yet.
pub fn create_wallet_user(conn: &mut PgConnection, addr: &str) -> DbUser {
    let new_wallet_user = NewWalletUser {
        wallet_address: Some(addr.to_string()),
        unique_id: addr.to_string(), // Use wallet address as unique_id
        method_type: "wallet".to_string(),
        user_pin: String::new(), // Empty until user sets it via profile update
    };

    diesel::insert_into(user::table)
        .values(&new_wallet_user)
        .get_result(conn)
        .expect("Error creating wallet user")
}

/// Update profile for a wallet user (set username and pin).
/// Called after the user completes the "Welcome" screen.
pub fn update_wallet_user_profile(
    conn: &mut PgConnection,
    user_id: i32,
    new_name: String,
    hashed_pin: String,
) -> DbUser {
    use crate::schema::user::dsl::*;

    let changeset = UpdateWalletProfile {
        name: Some(new_name),
        user_pin: hashed_pin,
    };

    diesel::update(user.filter(id.eq(user_id)))
        .set(&changeset)
        .get_result(conn)
        .expect("Error updating wallet user profile")
}

// Record a ledger entry (kept for backward compat — prefer
// `ledger_model_function::record_transfer_and_update_amounts` for the full flow)
pub fn add_user_ledger(request: UpdateUserLedgerRequest) -> LedgerResponse {
    use crate::schema::ledger::dsl::*;

    let connection = &mut establish_connection();

    let changeset = NewLedger {
        sender_id: request.sender_id,
        receiver_id: request.receiver_id, // ← FIX: was incorrectly using sender_id
        amount: request.amount,
        currency: request.currency,
        tx_signature: request.tx_signature,
        status: request.status,
    };

    let db_response = diesel::insert_into(ledger)
        .values(&changeset)
        .get_result::<DbLedger>(connection);

    match db_response {
        Ok(_value) => LedgerResponse { success: true },
        Err(_err) => LedgerResponse { success: false },
    }
}

/// Recalculate and persist user.amount from their ledger history.
/// Delegates to `ledger_model_function::update_user_amount_from_ledger`.
pub fn update_user_amount(user_id: i32) {
    use super::ledger_model_function::update_user_amount_from_ledger;

    let connection = &mut establish_connection();

    match update_user_amount_from_ledger(connection, user_id) {
        Ok(new_balance) => {
            println!(
                "[update_user_amount] user {} new balance = {}",
                user_id, new_balance
            );
        }
        Err(error) => {
            println!("[update_user_amount] error for user {}: {}", user_id, error);
        }
    }
}

pub fn get_transaction_history(
    user_id: i32,
    limit: i32,
) -> Result<DbLedger, diesel::result::Error> {
    use crate::schema::ledger::dsl::*;

    let connection = &mut establish_connection();
    let ledger_result = ledger
        .filter(id.eq(&user_id))
        .limit(limit as i64)
        .get_result::<DbLedger>(connection);

    match ledger_result {
        Ok(new_balance) => Ok(new_balance),
        Err(error) => {
            println!("[update_user_amount] error for user {}: {}", user_id, error);
            Err(error)
        }
    }
}

pub fn match_user_pin(user_id: i32, user_pin: String) -> Result<DbLedger, diesel::result::Error> {
    use crate::schema::user::dsl::*;

    let connection = &mut establish_connection();
    let user_result = user
        .filter(id.eq(&user_id))
        .get_result::<DbUser>(connection)
        .unwrap();

    let is_same_pin = bcrypt::verify(user_pin, &user_result.user_pin).unwrap();

    match is_same_pin {
        Ok(new_balance) => Ok(new_balance),
        Err(error) => {
            println!("[update_user_amount] error for user {}: {}", user_id, error);
            Err(error)
        }
    }
}
