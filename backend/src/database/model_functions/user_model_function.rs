use crate::{
    database::{
        establish_connection,
        model::{DbUser, NewUser, NewWalletUser, UpdateWalletProfile},
    },
    schema::user,
};
use diesel::PgConnection;
use diesel::prelude::*;

pub struct DBResponse {
    pub success: bool,
    pub data: DbUser,
}

enum UserInfoResponse {
    Text(String),
    NUmber(i32),
    Error(String),
}

//has to change the return type
pub fn get_user_info(required_intent: String, payload: i32) -> UserInfoResponse {
    //check if the user has enough
    use crate::schema::user::dsl::*;

    let connection = &mut establish_connection();
    let result = user
        .filter(id.eq(&payload))
        .get_result::<DbUser>(connection)
        .unwrap();

    //make decision on the basis of required_intent;
    match required_intent {
        //if the user want to check balance
        s if s == "amount".to_string() => {
            //return the amount the user have
            UserInfoResponse::NUmber(result.amount.unwrap() as i32)
        }
        s if s == "recipient".to_string() => {
            //check the recipient that particular recipient exist in the user place
            //check for this recipeient by making query to the database
            UserInfoResponse::NUmber(result.amount.unwrap() as i32)
        }
        _ => {
            println!("error query request");

            //return the error message
            UserInfoResponse::Error("invalid query request".to_string())
        }
    }
}

// Create a user via contact number flow (full data upfront)
pub fn create_user(
    conn: &mut PgConnection,
    name: String,
    password: String,
    unique_id: String,
    method_type: String,
    email: Option<String>,
    user_usdc_ata: String,
) -> DBResponse {
    let new_user = NewUser {
        name: Some(name),
        password: Some(password),
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
        password: Some(hashed_pin),
    };

    diesel::update(user.filter(id.eq(user_id)))
        .set(&changeset)
        .get_result(conn)
        .expect("Error updating wallet user profile")
}
