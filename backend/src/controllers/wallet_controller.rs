use crate::database::establish_connection;
use crate::database::model_functions::{
    create_wallet_user, find_user_by_wallet, get_user_info, update_wallet_user_profile,
};
use crate::database::model_functions::user_model_function::{
    UserInfoRequest, UserInfoResponse, is_amount_valid,
};
use crate::errors::{AppError, AuthError, DbError, SolanaError, ValidationError,};
use actix_web::cookie::{Cookie, SameSite};
use actix_web::{HttpRequest, HttpResponse, Responder, get, post, web};
use actix_web::ResponseError;
use bcrypt::{DEFAULT_COST, hash};
use chrono::Utc;
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use jsonwebtoken::{DecodingKey, EncodingKey, Header, Validation, decode, encode};
use rand::Rng;
use serde::{Deserialize, Serialize};
use std::env;

// ─── Request / Response Types ───────────────────────────────────────────────

/// Response from GET /wallet/nonce
#[derive(Serialize)]
pub struct NonceResponse {
    pub nonce: String,
    pub message: String,
}

/// Body of POST /wallet/login
#[derive(Deserialize, Debug)]
pub struct WalletLoginPayload {
    pub address: String,
    pub signature: String,
    pub nonce: String,
}

/// Response from POST /wallet/login
#[derive(Serialize)]
pub struct WalletLoginResponse {
    pub status: String,
    pub is_new_user: bool,
    pub user: UserPublicInfo,
}

/// Safe subset of user info returned to the frontend
#[derive(Serialize)]
pub struct UserPublicInfo {
    pub id: i32,
    pub name: Option<String>,
    pub wallet_address: Option<String>,
    pub method_type: String,
    pub has_pin: bool,
}

/// Body of POST /wallet/update-profile
#[derive(Deserialize, Debug)]
pub struct UpdateProfilePayload {
    pub username: String,
    pub pin: String,
}

/// Response from POST /wallet/update-profile
#[derive(Serialize)]
pub struct UpdateProfileResponse {
    pub status: String,
    pub message: String,
    pub user: UserPublicInfo,
}

// ─── JWT Claims ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub wallet: String,
    pub exp: usize,
    pub iat: usize,
}

// ─── Helper Functions ───────────────────────────────────────────────────────

/// Get the JWT secret from environment variables
fn get_jwt_secret() -> Result<String, AppError> {
    env::var("JWT_SECRET").map_err(|_| {
        AppError::Internal {
            code: 5300,
            reason: "JWT_SECRET env var not set".to_string(),
        }
    })
}

/// Create a JWT session token for a given user
fn create_session_token(user_id: i32, wallet_address: &str) -> Result<String, AppError> {
    let now = Utc::now().timestamp() as usize;
    let expiry = now + (24 * 60 * 60); // 24 hours

    let claims = Claims {
        sub: user_id.to_string(),
        wallet: wallet_address.to_string(),
        exp: expiry,
        iat: now,
    };

    let secret = get_jwt_secret()?;
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| AppError::Internal {
        code: 5301,
        reason: format!("JWT encode failed: {}", e),
    })
}

/// Decode and validate a JWT session token. Returns the Claims if valid.
pub fn validate_session_token(token: &str) -> Result<Claims, AppError> {
    let secret = get_jwt_secret()?;
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|e| AppError::Auth(AuthError::InvalidToken {
        reason: e.to_string(),
    }))?;

    Ok(token_data.claims)
}

/// Verify an Ed25519 signature from a Solana wallet.
fn verify_solana_signature(address: &str, signature_b58: &str, nonce: &str) -> bool {
    let message = format!("Sign in to Remitly: {}", nonce);
    let message_bytes = message.as_bytes();

    let pubkey_bytes = match bs58::decode(address).into_vec() {
        Ok(bytes) if bytes.len() == 32 => bytes,
        _ => return false,
    };

    let verifying_key =
        match VerifyingKey::from_bytes(pubkey_bytes.as_slice().try_into().unwrap_or(&[0u8; 32])) {
            Ok(key) => key,
            Err(_) => return false,
        };

    let sig_bytes = match bs58::decode(signature_b58).into_vec() {
        Ok(bytes) if bytes.len() == 64 => bytes,
        _ => return false,
    };

    let signature =
        match Signature::from_bytes(sig_bytes.as_slice().try_into().unwrap_or(&[0u8; 64])) {
            sig => sig,
        };

    verifying_key.verify(message_bytes, &signature).is_ok()
}

// ─── Route Handlers ─────────────────────────────────────────────────────────

/// `GET /wallet/nonce`
#[get("/wallet/nonce")]
pub async fn get_nonce() -> actix_web::Result<impl Responder> {
    let mut rng = rand::thread_rng();
    let random_bytes: [u8; 16] = rng.r#gen();
    let nonce = hex::encode(random_bytes);

    let message = format!("Sign in to Remitly: {}", nonce);

    Ok(HttpResponse::Ok().json(NonceResponse { nonce, message }))
}

/// `POST /wallet/login`
#[post("/wallet/login")]
pub async fn wallet_login(
    data: web::Json<WalletLoginPayload>,
) -> actix_web::Result<impl Responder> {
    let payload = data.into_inner();

    // Step 1: Verify the signature
    if !verify_solana_signature(&payload.address, &payload.signature, &payload.nonce) {
        return Err(AppError::Auth(AuthError::InvalidSignature).into());
    }

    // Step 2 & 3: Check DB
    let address_clone = payload.address.clone();
    let db_result = web::block(move || {
        let conn = &mut establish_connection()?;
        let existing_user = find_user_by_wallet(conn, &address_clone)?;

        match existing_user {
            Some(user) => Ok((user, false)),
            None => {
                let new_user = create_wallet_user(conn, &address_clone)?;
                Ok((new_user, true))
            }
        }
    })
    .await
    .map_err(|e| AppError::Internal {
        code: 5010,
        reason: format!("blocking task failed: {}", e),
    })?
    .map_err(|e: DbError| -> AppError { e.into() })?;

    let (user, is_new_user) = db_result;

    // Step 4: Create JWT session token
    let session_token = create_session_token(
        user.id,
        user.wallet_address.as_deref().unwrap_or(&payload.address),
    )?;

    // Step 5: Build HttpOnly cookie
    let cookie = Cookie::build("session_token", session_token)
        .http_only(true)
        .secure(false)
        .same_site(SameSite::Lax)
        .path("/")
        .max_age(actix_web::cookie::time::Duration::hours(24))
        .finish();

    let user_info = UserPublicInfo {
        id: user.id,
        name: user.name.clone(),
        wallet_address: user.wallet_address.clone(),
        method_type: user.method_type.clone(),
        has_pin: !user.user_pin.is_empty(),
    };

    Ok(HttpResponse::Ok().cookie(cookie).json(WalletLoginResponse {
        status: "success".to_string(),
        is_new_user,
        user: user_info,
    }))
}

/// `POST /wallet/update-profile`
#[post("/wallet/update-profile")]
pub async fn update_profile(
    req: HttpRequest,
    data: web::Json<UpdateProfilePayload>,
) -> actix_web::Result<impl Responder> {
    // Step 1: Extract session token
    let token = req
        .cookie("session_token")
        .ok_or(AppError::Auth(AuthError::MissingSessionCookie))?
        .value()
        .to_string();

    let claims = validate_session_token(&token)?;

    let user_id: i32 = claims.sub.parse().map_err(|_| {
        AppError::Auth(AuthError::InvalidUserId {
            raw: claims.sub.clone(),
        })
    })?;

    let payload = data.into_inner();

    // Step 2: Hash the PIN
    let hashed_pin = hash(&payload.pin, DEFAULT_COST).map_err(|e| AppError::Internal {
        code: 5302,
        reason: format!("bcrypt hash failed: {}", e),
    })?;

    // Step 3: Update the user profile
    let updated_user = web::block(move || {
        let conn = &mut establish_connection()?;
        update_wallet_user_profile(conn, user_id, payload.username, hashed_pin)
    })
    .await
    .map_err(|e| AppError::Internal {
        code: 5010,
        reason: format!("blocking task failed: {}", e),
    })?
    .map_err(|e: DbError| -> AppError { e.into() })?;

    let user_info = UserPublicInfo {
        id: updated_user.id,
        name: updated_user.name.clone(),
        wallet_address: updated_user.wallet_address.clone(),
        method_type: updated_user.method_type.clone(),
        has_pin: !updated_user.user_pin.is_empty(),
    };

    Ok(HttpResponse::Ok().json(UpdateProfileResponse {
        status: "success".to_string(),
        message: "Profile updated successfully".to_string(),
        user: user_info,
    }))
}

// ─── Claim Amount ───────────────────────────────────────────────────────────

/// Body of POST /claimamount
#[derive(Debug, Deserialize, Serialize)]
pub struct ClaimAmountRequest {
    pub amount: u64,
    pub method: String,
    pub recipient_pubkey: Option<String>,
    pub recipient_id: i32,
}

/// Response from POST /claimamount
#[derive(Debug, Serialize)]
pub struct ClaimAmountResponse {
    pub status: String,
    pub error_code: Option<u32>,
    pub message: String,
    pub claimed_amount: Option<i64>,
    pub new_balance: Option<i64>,
    pub tx_signature: Option<String>,
}

/// Sentinel user ID representing the vault/system in ledger entries.
const VAULT_USER_ID: i32 = 0;

/// `POST /claimamount`
#[post("/claimamount")]
pub async fn claim_amount(data: web::Json<ClaimAmountRequest>) -> impl Responder {
    use crate::database::model_functions::ledger_model_function::{
        get_claimable_amount, record_claim,
    };
    use crate::utility::solana_utilities;

    let payload = data.into_inner();

    // ── 1. Validate amount ──────────────────────────────────────────────
    if payload.amount == 0 {
        let err = AppError::Validation(ValidationError::InvalidAmount);
        eprintln!("{}", err.log_message());
        return HttpResponse::BadRequest().json(ClaimAmountResponse {
            status: "error".to_string(),
            error_code: Some(err.error_code()),
            message: err.client_message(),
            claimed_amount: None,
            new_balance: None,
            tx_signature: None,
        });
    }

    // ── 2. Validate method ──────────────────────────────────────────────
    if payload.method != "Auto-Claim" && payload.method != "Manual-Claim" {
        let err = AppError::Validation(ValidationError::InvalidClaimMethod {
            method: payload.method.clone(),
        });
        eprintln!("{}", err.log_message());
        return HttpResponse::BadRequest().json(ClaimAmountResponse {
            status: "error".to_string(),
            error_code: Some(err.error_code()),
            message: err.client_message(),
            claimed_amount: None,
            new_balance: None,
            tx_signature: None,
        });
    }

    // ── 3. Manual-Claim needs recipient_pubkey ──────────────────────────
    if payload.method == "Manual-Claim" && payload.recipient_pubkey.is_none() {
        let err = AppError::Validation(ValidationError::MissingRecipientPubkey);
        eprintln!("{}", err.log_message());
        return HttpResponse::BadRequest().json(ClaimAmountResponse {
            status: "error".to_string(),
            error_code: Some(err.error_code()),
            message: err.client_message(),
            claimed_amount: None,
            new_balance: None,
            tx_signature: None,
        });
    }

    let recipient_id = payload.recipient_id;
    let claim_amount_val = payload.amount as i64;

    // ── 4. Validate balance ─────────────────────────────────────────────
    let amount_check = web::block(move || {
        let conn = &mut establish_connection()?;
        is_amount_valid(claim_amount_val, recipient_id, conn)
    })
    .await;

    match amount_check {
        Ok(Ok(_)) => { /* balance valid, proceed */ }
        Ok(Err(e)) => {
            eprintln!("{}", e.log_message());
            return HttpResponse::build(e.status_code()).json(ClaimAmountResponse {
                status: "error".to_string(),
                error_code: Some(e.error_code()),
                message: e.client_message(),
                claimed_amount: None,
                new_balance: None,
                tx_signature: None,
            });
        }
        Err(e) => {
            let err = AppError::Internal {
                code: 5010,
                reason: format!("blocking task failed: {}", e),
            };
            eprintln!("{}", err.log_message());
            return HttpResponse::InternalServerError().json(ClaimAmountResponse {
                status: "error".to_string(),
                error_code: Some(err.error_code()),
                message: err.client_message(),
                claimed_amount: None,
                new_balance: None,
                tx_signature: None,
            });
        }
    };

    // ── 5. Check claimable amount from ledger ───────────────────────────
    let rid = recipient_id;
    let claimable_check = web::block(move || {
        let conn = &mut establish_connection()?;
        get_claimable_amount(conn, rid).map_err(AppError::from)
    })
    .await;

    let claimable = match claimable_check {
        Ok(Ok(val)) => val,
        Ok(Err(err)) => {
            eprintln!("{}", err.log_message());
            return HttpResponse::InternalServerError().json(ClaimAmountResponse {
                status: "error".to_string(),
                error_code: Some(err.error_code()),
                message: err.client_message(),
                claimed_amount: None,
                new_balance: None,
                tx_signature: None,
            });
        }
        Err(e) => {
            let err = AppError::Internal {
                code: 5010,
                reason: format!("blocking task failed: {}", e),
            };
            eprintln!("{}", err.log_message());
            return HttpResponse::InternalServerError().json(ClaimAmountResponse {
                status: "error".to_string(),
                error_code: Some(err.error_code()),
                message: err.client_message(),
                claimed_amount: None,
                new_balance: None,
                tx_signature: None,
            });
        }
    };

    if claim_amount_val > claimable {
        let err = AppError::Validation(ValidationError::InsufficientClaimableBalance {
            requested: claim_amount_val,
            claimable,
        });
        eprintln!("{}", err.log_message());
        return HttpResponse::BadRequest().json(ClaimAmountResponse {
            status: "error".to_string(),
            error_code: Some(err.error_code()),
            message: err.client_message(),
            claimed_amount: None,
            new_balance: None,
            tx_signature: None,
        });
    }

    // ── 6. Get recipient unique_id ──────────────────────────────────────
    let rid2 = recipient_id;
    let user_info_result = web::block(move || {
        get_user_info(UserInfoRequest {
            intent: "unique_id".to_string(),
            user_id: rid2,
            recipient_name: None,
        })
    })
    .await;

    let unique_id = match user_info_result {
        Ok(Ok(UserInfoResponse::UniqueId(uid))) => uid,
        Ok(Ok(_)) => {
            let err: AppError = DbError::UnexpectedResult {
                context: "get_user_info returned non-UniqueId variant".to_string(),
            }
            .into();
            eprintln!("{}", err.log_message());
            return HttpResponse::InternalServerError().json(ClaimAmountResponse {
                status: "error".to_string(),
                error_code: Some(err.error_code()),
                message: err.client_message(),
                claimed_amount: None,
                new_balance: None,
                tx_signature: None,
            });
        }
        Ok(Err(err)) => {
            eprintln!("{}", err.log_message());
            return HttpResponse::build(err.status_code()).json(ClaimAmountResponse {
                status: "error".to_string(),
                error_code: Some(err.error_code()),
                message: err.client_message(),
                claimed_amount: None,
                new_balance: None,
                tx_signature: None,
            });
        }
        Err(e) => {
            let err = AppError::Internal {
                code: 5010,
                reason: format!("blocking task failed: {}", e),
            };
            eprintln!("{}", err.log_message());
            return HttpResponse::InternalServerError().json(ClaimAmountResponse {
                status: "error".to_string(),
                error_code: Some(err.error_code()),
                message: err.client_message(),
                claimed_amount: None,
                new_balance: None,
                tx_signature: None,
            });
        }
    };

    // ── 7. Call Solana claim_amount on-chain ─────────────────────────────
    let solana_amount = payload.amount;
    let uid_clone = unique_id.clone();

    let solana_result = web::block(move || solana_utilities::claim_amount(uid_clone, solana_amount))
        .await;

    match solana_result {
        Ok(Ok(rpc_response)) => {
            if !rpc_response.success {
                let err: AppError = SolanaError::ClaimFailed {
                    unique_id: unique_id.clone(),
                    amount: solana_amount,
                    reason: "on-chain claim returned success=false".to_string(),
                }
                .into();
                eprintln!("{}", err.log_message());
                return HttpResponse::InternalServerError().json(ClaimAmountResponse {
                    status: "error".to_string(),
                    error_code: Some(err.error_code()),
                    message: err.client_message(),
                    claimed_amount: None,
                    new_balance: None,
                    tx_signature: None,
                });
            }

            // ── 8. Record the claim in the ledger ───────────────────────
            let rid = recipient_id;
            let cav = claim_amount_val;

            let ledger_result = web::block(move || {
                let conn = &mut establish_connection()?;
                record_claim(
                    conn,
                    rid,
                    cav,
                    "USDC".to_string(),
                    Some(rpc_response.value.to_string()),
                    VAULT_USER_ID,
                )
                .map_err(AppError::from)
            })
            .await;

            match ledger_result {
                Ok(Ok(claim_result)) => HttpResponse::Ok().json(ClaimAmountResponse {
                    status: "success".to_string(),
                    error_code: None,
                    message: claim_result.message,
                    claimed_amount: Some(claim_result.claimed_amount),
                    new_balance: Some(claim_result.new_balance),
                    tx_signature: None,
                }),
                Ok(Err(err)) => {
                    // CRITICAL: on-chain succeeded but DB failed
                    let critical_err = AppError::OnChainSuccessDbFailed {
                        user_id: recipient_id,
                        amount: claim_amount_val,
                        reason: err.to_string(),
                    };
                    eprintln!("{}", critical_err.log_message());
                    HttpResponse::InternalServerError().json(ClaimAmountResponse {
                        status: "error".to_string(),
                        error_code: Some(critical_err.error_code()),
                        message: critical_err.client_message(),
                        claimed_amount: Some(claim_amount_val),
                        new_balance: None,
                        tx_signature: None,
                    })
                }
                Err(e) => {
                    let critical_err = AppError::OnChainSuccessDbFailed {
                        user_id: recipient_id,
                        amount: claim_amount_val,
                        reason: format!("blocking task failed: {}", e),
                    };
                    eprintln!("{}", critical_err.log_message());
                    HttpResponse::InternalServerError().json(ClaimAmountResponse {
                        status: "error".to_string(),
                        error_code: Some(critical_err.error_code()),
                        message: critical_err.client_message(),
                        claimed_amount: Some(claim_amount_val),
                        new_balance: None,
                        tx_signature: None,
                    })
                }
            }
        }
        Ok(Err(solana_err)) => {
            let err: AppError = solana_err.into();
            eprintln!("{}", err.log_message());
            HttpResponse::InternalServerError().json(ClaimAmountResponse {
                status: "error".to_string(),
                error_code: Some(err.error_code()),
                message: err.client_message(),
                claimed_amount: None,
                new_balance: None,
                tx_signature: None,
            })
        }
        Err(e) => {
            let err = AppError::Internal {
                code: 5010,
                reason: format!("blocking task failed: {}", e),
            };
            eprintln!("{}", err.log_message());
            HttpResponse::InternalServerError().json(ClaimAmountResponse {
                status: "error".to_string(),
                error_code: Some(err.error_code()),
                message: err.client_message(),
                claimed_amount: None,
                new_balance: None,
                tx_signature: None,
            })
        }
    }
}

// ─── Get Wallet Address ─────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct GetWalletAddressRequest {
    pub user_id: Option<i32>,
}

#[post("/wallet/address")]
pub async fn get_wallet_address(
    req: HttpRequest,
    _data: web::Json<GetWalletAddressRequest>,
) -> actix_web::Result<impl Responder> {
    let token = req
        .cookie("session_token")
        .ok_or(AppError::Auth(AuthError::MissingSessionCookie))?
        .value()
        .to_string();

    let claims = validate_session_token(&token)?;

    let user_id: i32 = claims.sub.parse().map_err(|_| {
        AppError::Auth(AuthError::InvalidUserId {
            raw: claims.sub.clone(),
        })
    })?;

    let wallet_address = get_user_info(UserInfoRequest {
        intent: "wallet_address".to_string(),
        user_id,
        recipient_name: None,
    })
    .map_err(|e| -> AppError { e })?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "success",
        "data": match wallet_address {
            UserInfoResponse::Text(addr) => addr,
            _ => "".to_string(),
        }
    })))
}

//--- Add Recipient ---

#[derive(Debug, Deserialize)]
pub struct AddRecipientRequest {
    pub recipient_alias: String,
}

#[post("/wallet/add-recipient")]
pub async fn add_recipient(
    req: HttpRequest,
    data: web::Json<AddRecipientRequest>,
) -> actix_web::Result<impl Responder> {
    let token = req
        .cookie("session_token")
        .ok_or(AppError::Auth(AuthError::MissingSessionCookie))?
        .value()
        .to_string();

    let claims = validate_session_token(&token)?;

    let user_id: i32 = claims.sub.parse().map_err(|_| {
        AppError::Auth(AuthError::InvalidUserId {
            raw: claims.sub.clone(),
        })
    })?;

    let alias_str = data.into_inner().recipient_alias;

    let result = web::block(move || {
        let conn = &mut establish_connection()?;
        crate::database::model_functions::add_recipient_by_alias(conn, user_id, &alias_str)
    })
    .await
    .map_err(|e| AppError::Internal {
        code: 5010,
        reason: format!("blocking task failed: {}", e),
    })?
    .map_err(|e: AppError| -> AppError { e })?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "success",
        "recipient_id": result.id,
        "recipient_user_id": result.recipient_user_id,
        "alias_used": result.alias_used
    })))
}
