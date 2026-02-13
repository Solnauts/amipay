use crate::database::model_functions::get_user;
use crate::utility::create_user_ata;
use actix_web::{HttpResponse, Responder, error, get, post, web};
use serde::Deserialize;
use bcrypt::{hash , verify, DEFAULT_COST};

#[derive(Deserialize, Debug)]
pub struct ContactPayload {
    pub username: Option<String>,
    pub contact_number: Option<i32>,
    pub userpin:i32, 
    pub email: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct WalletPayload {
    pub pubkey: String,
    pub username: String,
    pub user_pin : i32,
    pub pin: String,
}

// #[derive(Deserialize, Debug)]
// pub enum Means {
//     ContactNumber(String),
//     WalletAddress(String),
// }

// #[derive(Deserialize, Debug)]
// pub struct CreaterUserRequest {
//     //the signup method can be one from these two values of means enum
//     pub signup_method: Means,
//     //if user choose the phone number method
//     pub payload: Option<Result<ContactPayload, WalletPayload>>,
// }

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
    pub user_pin : String, // Holds either Phone Number or Pubkey
    pub method_type: String, // "phone" or "wallet"
    pub email: Option<String>,
}

impl CreateUserRequest {
    // This is the magic function that unifies the data
    pub fn normalize(self) -> NormalizedUser {
        
        match self {
            CreateUserRequest::ContactNumber(data) =>
           { 
            let user_pin = hash( data.userpin.to_string(), DEFAULT_COST).unwrap();

            let user_contact = hash( data.contact_number.unwrap().to_string(), DEFAULT_COST).unwrap();
            
            NormalizedUser {
                // Handle Option<String> with a default or unwrap
                username: data.username.unwrap_or_else(|| "Guest".to_string()),
                // Convert number to String so it fits in 'unique_id'
                unique_id: user_contact,
                method_type: "phone".to_string(),
                    user_pin,
                email: data.email,
            }
            },
            CreateUserRequest::WalletAddress(data) =>{
            let user_pin = hash( data.user_pin.to_string(), DEFAULT_COST).unwrap();
                NormalizedUser {
                username: data.username,
                unique_id: data.pubkey,// Pubkey maps to unique_id
                user_pin,
                method_type: "wallet".to_string(),
                email: None, // Wallet has no email, so set to None
            }
            }
        }
    }
}

#[post("/createaccount")]
async fn create_user(data: web::Json<CreateUserRequest>) -> actix_web::Result<impl Responder> {
    //call the solana rpc with particular changes in the payload
    let user =  

    let db_result = web::block(move || get_user()).await?; // Handle thread pool errors

    //Send HTTP Response
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "success",
        "database_message": db_result
    })))
}
