use crate::database::establish_connection;
use crate::database::model_functions::create_user;
use crate::utility::create_user_ata;
use actix_web::{HttpResponse, Responder, post, web};
use bcrypt::{DEFAULT_COST, hash};
use serde::Deserialize;

#[derive(Deserialize, Debug)]
pub struct ContactPayload {
    pub username: Option<String>,
    pub contact_number: Option<i32>,
    pub userpin: i32,
    pub email: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct WalletPayload {
    pub pubkey: String,
    pub username: String,
    pub user_pin: i32,
    pub pin: String,
}

#[derive(Deserialize, Debug)]
#[serde(tag = "signup_method", content = "payload")]
#[serde(rename_all = "snake_case")]
pub enum CreateUserRequest {
    //the signup method can be one from these two values of means enum
    ContactNumber(ContactPayload),
    WalletAddress(WalletPayload), //if user choose the phone number method
}

#[derive(Debug)] // Derive Clone/Serialize if needed
pub struct NormalizedUser {
    pub username: String,
    pub unique_id: String,
    pub user_pin: String,    // Holds either Phone Number or Pubkey
    pub method_type: String, // "phone" or "wallet"
    pub email: Option<String>,
}

pub struct AccountBalanceInfo {
    pub user_id: String,
}

pub struct RecipientInfo {
    pub userid: String,
    pub recipientid: String,
}

pub struct TransactionHistoryInfo {
    pub userid: String,
}

pub enum UserAccountInfo {
    RecipientInfo(RecipientInfo),
    AccountBalanceInfo(AccountBalanceInfo),
    TransactionHistoryInfo(TransactionHistoryInfo),
}

pub struct NormalizedUserInfo {
    pub method: String,
    pub user_id: String,
    pub recipient_id: Option<String>,
}

impl UserAccountInfo {
    // This is the magic function that unifies the data
    pub fn normalize(self) -> NormalizedUserInfo {
        match self {
            UserAccountInfo::AccountBalanceInfo(data) => {
                NormalizedUserInfo {
                    // Handle Option<String> with a default or unwrap
                    method: "account_info".to_string(),
                    user_id: data.user_id,
                    recipient_id: None,
                }
            }
            UserAccountInfo::RecipientInfo(data) => NormalizedUserInfo {
                method: "recipient_info".to_string(),
                user_id: data.userid,
                recipient_id: Some(data.recipientid),
            },

            UserAccountInfo::TransactionHistoryInfo(data) => NormalizedUserInfo {
                method: "transaction_history".to_string(),
                user_id: data.userid,
                recipient_id: None,
            },
        }
    }
}

impl CreateUserRequest {
    // This is the magic function that unifies the data
    pub fn normalize(self) -> NormalizedUser {
        match self {
            CreateUserRequest::ContactNumber(data) => {
                let user_pin = hash(data.userpin.to_string(), DEFAULT_COST).unwrap();

                let user_contact =
                    hash(data.contact_number.unwrap().to_string(), DEFAULT_COST).unwrap();

                NormalizedUser {
                    // Handle Option<String> with a default or unwrap
                    username: data.username.unwrap_or_else(|| "Guest".to_string()),
                    unique_id: user_contact,
                    method_type: "phone".to_string(),
                    user_pin,
                    email: data.email,
                }
            }
            CreateUserRequest::WalletAddress(data) => {
                let user_pin = hash(data.user_pin.to_string(), DEFAULT_COST).unwrap();
                NormalizedUser {
                    username: data.username,
                    unique_id: data.pubkey, // Pubkey maps to unique_id
                    user_pin,
                    method_type: "wallet".to_string(),
                    email: None, // Wallet has no email, so set to None
                }
            }
        }
    }
}

#[post("/createaccount")]
async fn create_user_handler(
    data: web::Json<CreateUserRequest>,
) -> actix_web::Result<impl Responder> {
    //call the solana rpc with particular changes in the payload
    let user = data.into_inner().normalize();
    let user_ata = create_user_ata(user.unique_id.clone())?;

    // Get the USDC ATA address as a string to store in the database
    let user_usdc_ata = user_ata.value.to_string();

    // Insert the new user into the database with all NormalizedUser fields
    let db_result = web::block(move || {
        let conn = &mut establish_connection();
        create_user(
            conn,
            user.username,
            user.user_pin,
            user.unique_id,
            user.method_type,
            user.email,
            user_usdc_ata,
        )
    })
    .await?;

    //Send HTTP Response
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "success",
        "message": "User account created successfully"
    })))
}

//function to get user account info
//a multipurpose function for all the thing like what to use

fn get_user_info(data: UserAccountInfo) {
    //match the user acount info
    let request = data.normalize();

    //database request on the choosen method
    if request.method == "account_info".to_string() {
    } else if request.method == "recipient_info" {
    } else {
    }
}
