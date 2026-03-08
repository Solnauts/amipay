use crate::database::establish_connection;
use crate::database::model_functions::create_user;
use crate::errors::AppError;
use crate::utility::create_user_ata;
use actix_web::{HttpResponse, Responder, post, web};
use bcrypt::{DEFAULT_COST, hash};
use serde::Deserialize;

// ─── Contact Number Login Types ─────────────────────────────────────────────

#[derive(Deserialize, Debug)]
pub struct ContactPayload {
    pub username: Option<String>,
    pub contact_number: Option<i32>,
    pub userpin: i32,
    pub email: Option<String>,
}

#[derive(Debug)]
pub struct NormalizedUser {
    pub username: String,
    pub unique_id: String,
    pub user_pin: String,
    pub method_type: String,
    pub email: Option<String>,
}

impl ContactPayload {
    /// Normalize the contact number payload into a NormalizedUser.
    pub fn normalize(self) -> Result<NormalizedUser, AppError> {
        let user_pin = hash(self.userpin.to_string(), DEFAULT_COST).map_err(|e| {
            AppError::Internal {
                code: 5302,
                reason: format!("bcrypt hash failed for pin: {}", e),
            }
        })?;

        let contact = self.contact_number.ok_or(AppError::Validation(
            crate::errors::ValidationError::MissingField {
                field: "contact_number".to_string(),
            },
        ))?;

        let user_contact = hash(contact.to_string(), DEFAULT_COST).map_err(|e| {
            AppError::Internal {
                code: 5302,
                reason: format!("bcrypt hash failed for contact: {}", e),
            }
        })?;

        Ok(NormalizedUser {
            username: self.username.unwrap_or_else(|| "Guest".to_string()),
            unique_id: user_contact,
            method_type: "phone".to_string(),
            user_pin,
            email: self.email,
        })
    }
}

// ─── Account Info Types ─────────────────────────────────────────────────────

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
    pub fn normalize(self) -> NormalizedUserInfo {
        match self {
            UserAccountInfo::AccountBalanceInfo(data) => NormalizedUserInfo {
                method: "account_info".to_string(),
                user_id: data.user_id,
                recipient_id: None,
            },
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

// ─── Route Handler: Contact Number Create Account ───────────────────────────

#[post("/createaccount")]
async fn create_user_handler(data: web::Json<ContactPayload>) -> actix_web::Result<impl Responder> {
    // Normalize and hash the contact payload
    let user = data.into_inner().normalize()?;

    // Create the Solana USDC ATA for this user
    let user_ata = create_user_ata(user.unique_id.clone()).map_err(|e| -> AppError { e.into() })?;
    let user_usdc_ata = user_ata.value.to_string();

    // Insert the new user into the database
    let _db_result = web::block(move || {
        let conn = &mut establish_connection()?;
        create_user(
            conn,
            user.username,
            user.user_pin,
            user.unique_id,
            user.method_type,
            user.email,
            user_usdc_ata,
        )
        .map_err(AppError::from)
    })
    .await
    .map_err(|e| AppError::Internal {
        code: 5010,
        reason: format!("blocking task failed: {}", e),
    })?
    .map_err(|e: AppError| e)?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "success",
        "message": "User account created successfully"
    })))
}
