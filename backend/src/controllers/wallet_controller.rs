use crate::database::establish_connection;
use crate::database::model_functions::{
    create_wallet_user, find_user_by_wallet, get_user_info, update_wallet_user_profile,
};
use crate::database::model_functions::user_model_function::{
    UserInfoRequest, UserInfoResponse, is_amount_valid,
};
use actix_web::cookie::{Cookie, SameSite};
use actix_web::{HttpRequest, HttpResponse, Responder, get, post, web};
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
    pub message: String, // The full message the frontend should ask the wallet to sign
}

/// Body of POST /wallet/login
#[derive(Deserialize, Debug)]
pub struct WalletLoginPayload {
    pub address: String,   // Base58 Solana public key
    pub signature: String, // Base58-encoded signature
    pub nonce: String,     // The nonce that was signed
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
    pub sub: String,    // User ID as string
    pub wallet: String, // Wallet address
    pub exp: usize,     // Expiry timestamp (UNIX epoch)
    pub iat: usize,     // Issued at timestamp
}

// ─── Helper Functions ───────────────────────────────────────────────────────

/// Get the JWT secret from environment variables
fn get_jwt_secret() -> String {
    env::var("JWT_SECRET").expect("JWT_SECRET must be set in .env")
}

/// Create a JWT session token for a given user
fn create_session_token(user_id: i32, wallet_address: &str) -> String {
    let now = Utc::now().timestamp() as usize;
    let expiry = now + (24 * 60 * 60); // 24 hours from now

    let claims = Claims {
        sub: user_id.to_string(),
        wallet: wallet_address.to_string(),
        exp: expiry,
        iat: now,
    };

    let secret = get_jwt_secret();
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .expect("Failed to create JWT token")
}

/// Decode and validate a JWT session token. Returns the Claims if valid.
pub fn validate_session_token(token: &str) -> Result<Claims, String> {
    let secret = get_jwt_secret();
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|e| format!("Invalid or expired session token: {}", e))?;

    Ok(token_data.claims)
}

/// Verify an Ed25519 signature from a Solana wallet.
///
/// Solana wallets sign arbitrary messages with their Ed25519 keypair.
/// The frontend typically does:
///   const message = new TextEncoder().encode("Sign in to Remitly: <nonce>");
///   const signature = await wallet.signMessage(message);
///
/// We reconstruct the same message bytes, decode the base58 pubkey
/// into a VerifyingKey, decode the base58 signature, and verify.
fn verify_solana_signature(address: &str, signature_b58: &str, nonce: &str) -> bool {
    // 1. Reconstruct the exact message bytes the wallet signed
    let message = format!("Sign in to Remitly: {}", nonce);
    let message_bytes = message.as_bytes();

    // 2. Decode the base58 public key into 32 bytes
    let pubkey_bytes = match bs58::decode(address).into_vec() {
        Ok(bytes) if bytes.len() == 32 => bytes,
        _ => return false,
    };

    // 3. Build the ed25519 VerifyingKey
    let verifying_key =
        match VerifyingKey::from_bytes(pubkey_bytes.as_slice().try_into().unwrap_or(&[0u8; 32])) {
            Ok(key) => key,
            Err(_) => return false,
        };

    // 4. Decode the base58 signature into 64 bytes
    let sig_bytes = match bs58::decode(signature_b58).into_vec() {
        Ok(bytes) if bytes.len() == 64 => bytes,
        _ => return false,
    };

    let signature =
        match Signature::from_bytes(sig_bytes.as_slice().try_into().unwrap_or(&[0u8; 64])) {
            sig => sig,
        };

    // 5. Verify
    verifying_key.verify(message_bytes, &signature).is_ok()
}

// ─── Route Handlers ─────────────────────────────────────────────────────────

/// **Call 1: The Handshake**
///
/// `GET /wallet/nonce`
///
/// Generates a cryptographically random nonce and returns it along with
/// the full message string the frontend should present to the wallet for signing.
///
/// Flow:
///   1. User clicks "Connect Wallet"
///   2. Frontend calls GET /wallet/nonce
///   3. Server returns { nonce, message }
///   4. Frontend asks the wallet to sign `message`
#[get("/wallet/nonce")]
pub async fn get_nonce() -> actix_web::Result<impl Responder> {
    // Generate a cryptographically secure random nonce (32 hex chars)
    let mut rng = rand::thread_rng();
    let random_bytes: [u8; 16] = rng.r#gen();
    let nonce = hex::encode(random_bytes);

    // Build the exact message the wallet will sign
    let message = format!("Sign in to Remitly: {}", nonce);

    Ok(HttpResponse::Ok().json(NonceResponse { nonce, message }))
}

/// **Call 2: The Login & Auto-Register**
///
/// `POST /wallet/login`
///
/// Receives `{ address, signature, nonce }` from the frontend, verifies the
/// Ed25519 signature, then either finds the existing user or auto-creates one.
/// The JWT session token is set as an HttpOnly cookie — the frontend never
/// touches it directly. The browser sends it automatically on every request.
///
/// Flow:
///   1. Verify signature against the nonce message
///   2. Look up user by wallet address in DB
///   3. If found → set session cookie + return user profile
///   4. If not found → create a new user row with just wallet_address,
///      set session cookie + return `is_new_user: true`
#[post("/wallet/login")]
pub async fn wallet_login(
    data: web::Json<WalletLoginPayload>,
) -> actix_web::Result<impl Responder> {
    let payload = data.into_inner();

    // Step 1: Verify the signature
    if !verify_solana_signature(&payload.address, &payload.signature, &payload.nonce) {
        return Ok(HttpResponse::Unauthorized().json(serde_json::json!({
            "status": "error",
            "message": "Invalid signature. Wallet verification failed."
        })));
    }

    // Step 2 & 3: Check DB — does this wallet address exist?
    let address_clone = payload.address.clone();
    let db_result = web::block(move || {
        let conn = &mut establish_connection();
        let existing_user = find_user_by_wallet(conn, &address_clone);

        match existing_user {
            Some(user) => {
                // User exists — return them (not new)
                (user, false)
            }
            None => {
                // User doesn't exist — auto-register with just the wallet address
                let new_user = create_wallet_user(conn, &address_clone);
                (new_user, true)
            }
        }
    })
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Database error: {}", e)))?;

    let (user, is_new_user) = db_result;

    // Step 4: Create JWT session token
    let session_token = create_session_token(
        user.id,
        user.wallet_address.as_deref().unwrap_or(&payload.address),
    );

    // Step 5: Build an HttpOnly cookie with the JWT
    //   - http_only(true)  → JavaScript cannot access it (prevents XSS token theft)
    //   - same_site(Lax)   → cookie sent on same-site requests + top-level navigations
    //   - secure(false)    → allow over HTTP in dev; set to true in production (HTTPS)
    //   - path("/")        → sent on every route, including the WebSocket upgrade
    //   - max_age(24h)     → matches the JWT expiry
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

/// **Call 3: The Profile Update**
///
/// `POST /wallet/update-profile`
///
/// Receives `{ username, pin }` in the body. The session token is read from
/// the `session_token` HttpOnly cookie (set during login). The frontend does
/// NOT need to manually attach any auth headers — the browser sends the
/// cookie automatically.
///
/// Flow:
///   1. Frontend sees `is_new_user: true` from login response
///   2. Shows a "Welcome! Choose a Username and set a PIN" modal
///   3. User fills in and hits "Save"
///   4. Frontend sends POST /wallet/update-profile (cookie sent automatically)
///   5. Server reads cookie, validates JWT, hashes pin, updates user row
#[post("/wallet/update-profile")]
pub async fn update_profile(
    req: HttpRequest,
    data: web::Json<UpdateProfilePayload>,
) -> actix_web::Result<impl Responder> {
    // Step 1: Extract the session token from the HttpOnly cookie
    let token = req
        .cookie("session_token")
        .ok_or_else(|| {
            actix_web::error::ErrorUnauthorized("Missing session cookie. Please log in first.")
        })?
        .value()
        .to_string();

    let claims =
        validate_session_token(&token).map_err(|e| actix_web::error::ErrorUnauthorized(e))?;

    let user_id: i32 = claims
        .sub
        .parse()
        .map_err(|_| actix_web::error::ErrorInternalServerError("Invalid user ID in token"))?;

    let payload = data.into_inner();

    // Step 2: Hash the PIN
    let hashed_pin = hash(&payload.pin, DEFAULT_COST).map_err(|e| {
        actix_web::error::ErrorInternalServerError(format!("Failed to hash pin: {}", e))
    })?;

    // Step 3: Update the user profile in the database
    let updated_user = web::block(move || {
        let conn = &mut establish_connection();
        update_wallet_user_profile(conn, user_id, payload.username, hashed_pin)
    })
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(format!("Database error: {}", e)))?;

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

/// Body of POST /claimamount
#[derive(Debug, Deserialize, Serialize)]
pub struct ClaimAmountRequest {
    pub amount: u64,
    pub method: String,             // "Auto-Claim" or "Manual-Claim"
    pub recipient_pubkey: Option<String>, // required for Manual-Claim
    pub recipient_id: i32,
}

/// Response from POST /claimamount
#[derive(Debug, Serialize)]
pub struct ClaimAmountResponse {
    pub status: String,
    pub message: String,
    pub claimed_amount: Option<i64>,
    pub new_balance: Option<i64>,
    pub tx_signature: Option<String>,
}

/// Sentinel user ID representing the vault/system in ledger entries.
/// This should match the ID used across the system for vault operations.
const VAULT_USER_ID: i32 = 0;

/// **Claim Amount Controller**
///
/// `POST /claimamount`
///
/// Allows a recipient to claim (withdraw) funds from the vault to their
/// on-chain USDC ATA.
///
/// Flow:
///   1. Validate the request payload (amount > 0, valid method)
///   2. Look up the recipient user in DB to get their `unique_id`
///   3. Verify claimable balance from the ledger (in − out)
///   4. For Manual-Claim: ensure `recipient_pubkey` is provided
///   5. Call the Solana `claim_amount` on-chain instruction
///   6. Record the claim in the ledger and update cached balances
///   7. Return success with new balance
#[post("/claimamount")]
pub async fn claim_amount(data: web::Json<ClaimAmountRequest>) -> impl Responder {
    use crate::database::model_functions::ledger_model_function::{
        get_claimable_amount, record_claim,
    };
    use crate::utility::solana_utilities;

    let payload = data.into_inner();

    // ── 1. Validate amount ──────────────────────────────────────────────
    if payload.amount == 0 {
        return HttpResponse::BadRequest().json(ClaimAmountResponse {
            status: "error".to_string(),
            message: "Claim amount must be greater than zero.".to_string(),
            claimed_amount: None,
            new_balance: None,
            tx_signature: None,
        });
    }

    // ── 2. Validate method ──────────────────────────────────────────────
    if payload.method != "Auto-Claim" && payload.method != "Manual-Claim" {
        return HttpResponse::BadRequest().json(ClaimAmountResponse {
            status: "error".to_string(),
            message: format!(
                "Invalid claim method '{}'. Must be 'Auto-Claim' or 'Manual-Claim'.",
                payload.method
            ),
            claimed_amount: None,
            new_balance: None,
            tx_signature: None,
        });
    }

    // ── 3. For Manual-Claim, recipient_pubkey is required ───────────────
    if payload.method == "Manual-Claim" && payload.recipient_pubkey.is_none() {
        return HttpResponse::BadRequest().json(ClaimAmountResponse {
            status: "error".to_string(),
            message: "recipient_pubkey is required for Manual-Claim.".to_string(),
            claimed_amount: None,
            new_balance: None,
            tx_signature: None,
        });
    }

    let recipient_id = payload.recipient_id;
    let claim_amount_val = payload.amount as i64;

    // ── 4. Validate balance using existing is_amount_valid ──────────────
    let amount_check = web::block(move || {
        let conn = &mut establish_connection();
        is_amount_valid(claim_amount_val, recipient_id, conn)
    })
    .await;

    let balance_response = match amount_check {
        Ok(response) => response,
        Err(e) => {
            return HttpResponse::InternalServerError().json(ClaimAmountResponse {
                status: "error".to_string(),
                message: format!("Database error: {}", e),
                claimed_amount: None,
                new_balance: None,
                tx_signature: None,
            });
        }
    };

    if !balance_response.success {
        return HttpResponse::BadRequest().json(ClaimAmountResponse {
            status: "error".to_string(),
            message: balance_response
                .error_reason
                .unwrap_or_else(|| "Insufficient balance.".to_string()),
            claimed_amount: None,
            new_balance: None,
            tx_signature: None,
        });
    }

    // ── 5. Check claimable amount from ledger ───────────────────────────
    let rid = recipient_id;
    let claimable_check = web::block(move || {
        let conn = &mut establish_connection();
        get_claimable_amount(conn, rid)
            .map_err(|e| format!("Failed to calculate claimable amount: {}", e))
    })
    .await;

    let claimable = match claimable_check {
        Ok(Ok(val)) => val,
        Ok(Err(err_msg)) => {
            return HttpResponse::InternalServerError().json(ClaimAmountResponse {
                status: "error".to_string(),
                message: err_msg,
                claimed_amount: None,
                new_balance: None,
                tx_signature: None,
            });
        }
        Err(e) => {
            return HttpResponse::InternalServerError().json(ClaimAmountResponse {
                status: "error".to_string(),
                message: format!("Database error: {}", e),
                claimed_amount: None,
                new_balance: None,
                tx_signature: None,
            });
        }
    };

    if claim_amount_val > claimable {
        return HttpResponse::BadRequest().json(ClaimAmountResponse {
            status: "error".to_string(),
            message: format!(
                "Insufficient claimable balance. Requested: {}, Available: {}",
                claim_amount_val, claimable
            ),
            claimed_amount: None,
            new_balance: None,
            tx_signature: None,
        });
    }

    // ── 6. Get recipient's unique_id using existing get_user_info ────────
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
        Ok(UserInfoResponse::UniqueId(uid)) => uid,
        Ok(UserInfoResponse::Error(e)) => {
            return HttpResponse::BadRequest().json(ClaimAmountResponse {
                status: "error".to_string(),
                message: format!("Recipient user not found: {}", e),
                claimed_amount: None,
                new_balance: None,
                tx_signature: None,
            });
        }
        Ok(_) => {
            return HttpResponse::InternalServerError().json(ClaimAmountResponse {
                status: "error".to_string(),
                message: "Unexpected response while fetching user info.".to_string(),
                claimed_amount: None,
                new_balance: None,
                tx_signature: None,
            });
        }
        Err(e) => {
            return HttpResponse::InternalServerError().json(ClaimAmountResponse {
                status: "error".to_string(),
                message: format!("Database error: {}", e),
                claimed_amount: None,
                new_balance: None,
                tx_signature: None,
            });
        }
    };

    // ── 7. Call the Solana claim_amount on-chain ─────────────────────────
    let solana_amount = payload.amount;
    let uid_clone = unique_id.clone();

    let solana_result = web::block(move || {
        solana_utilities::claim_amount(uid_clone, solana_amount)
            .map_err(|e| e.to_string())
    })
    .await;

    match solana_result {
        Ok(Ok(rpc_response)) => {
            if !rpc_response.success {
                return HttpResponse::InternalServerError().json(ClaimAmountResponse {
                    status: "error".to_string(),
                    message: "On-chain claim transaction failed.".to_string(),
                    claimed_amount: None,
                    new_balance: None,
                    tx_signature: None,
                });
            }

            // ── 8. Record the claim in the ledger & update balances ─────
            let rid = recipient_id;
            let cav = claim_amount_val;

            let ledger_result = web::block(move || {
                let conn = &mut establish_connection();
                record_claim(
                    conn,
                    rid,
                    cav,
                    "USDC".to_string(),
                    Some(rpc_response.value.to_string()),
                    VAULT_USER_ID,
                )
            })
            .await;

            match ledger_result {
                Ok(Ok(claim_result)) => {
                    HttpResponse::Ok().json(ClaimAmountResponse {
                        status: "success".to_string(),
                        message: claim_result.message,
                        claimed_amount: Some(claim_result.claimed_amount),
                        new_balance: Some(claim_result.new_balance),
                        tx_signature: None,
                    })
                }
                Ok(Err(diesel_err)) => {
                    eprintln!(
                        "[CRITICAL] On-chain claim succeeded for user {} but ledger update failed: {}",
                        recipient_id, diesel_err
                    );
                    HttpResponse::InternalServerError().json(ClaimAmountResponse {
                        status: "error".to_string(),
                        message: "Claim was processed on-chain but balance update failed. Please contact support.".to_string(),
                        claimed_amount: Some(claim_amount_val),
                        new_balance: None,
                        tx_signature: None,
                    })
                }
                Err(e) => {
                    eprintln!(
                        "[CRITICAL] On-chain claim succeeded for user {} but ledger blocking error: {}",
                        recipient_id, e
                    );
                    HttpResponse::InternalServerError().json(ClaimAmountResponse {
                        status: "error".to_string(),
                        message: "Claim was processed on-chain but balance update failed. Please contact support.".to_string(),
                        claimed_amount: Some(claim_amount_val),
                        new_balance: None,
                        tx_signature: None,
                    })
                }
            }
        }
        Ok(Err(solana_err)) => {
            HttpResponse::InternalServerError().json(ClaimAmountResponse {
                status: "error".to_string(),
                message: format!("Solana claim transaction failed: {}", solana_err),
                claimed_amount: None,
                new_balance: None,
                tx_signature: None,
            })
        }
        Err(e) => {
            HttpResponse::InternalServerError().json(ClaimAmountResponse {
                status: "error".to_string(),
                message: format!("Failed to execute claim transaction: {}", e),
                claimed_amount: None,
                new_balance: None,
                tx_signature: None,
            })
        }
    }
}
