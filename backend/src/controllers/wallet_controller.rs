use crate::database::establish_connection;
use crate::database::model_functions::{
    create_wallet_user, find_user_by_wallet, update_wallet_user_profile,
};
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
    pub session_token: String,
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
fn validate_session_token(token: &str) -> Result<Claims, String> {
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
///
/// Flow:
///   1. Verify signature against the nonce message
///   2. Look up user by wallet address in DB
///   3. If found → return session token + user profile
///   4. If not found → create a new user row with just wallet_address,
///      return session token + `is_new_user: true`
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

    // Step 4: Create session token
    let session_token = create_session_token(
        user.id,
        user.wallet_address.as_deref().unwrap_or(&payload.address),
    );

    let user_info = UserPublicInfo {
        id: user.id,
        name: user.name.clone(),
        wallet_address: user.wallet_address.clone(),
        method_type: user.method_type.clone(),
        has_pin: user.password.is_some(),
    };

    Ok(HttpResponse::Ok().json(WalletLoginResponse {
        status: "success".to_string(),
        session_token,
        is_new_user,
        user: user_info,
    }))
}

/// **Call 3: The Profile Update**
///
/// `POST /wallet/update-profile`
///
/// Receives `{ username, pin }` along with the session token (in the
/// Authorization header). Updates the user row that was auto-created during login.
///
/// Flow:
///   1. Frontend sees `is_new_user: true` from login response
///   2. Shows a "Welcome! Choose a Username and set a PIN" modal
///   3. User fills in and hits "Save"
///   4. Frontend sends POST /wallet/update-profile with Bearer token
///   5. Server validates token, hashes pin, updates user row
#[post("/wallet/update-profile")]
pub async fn update_profile(
    req: HttpRequest,
    data: web::Json<UpdateProfilePayload>,
) -> actix_web::Result<impl Responder> {
    // Step 1: Extract and validate the session token from the Authorization header
    let auth_header = req
        .headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Missing Authorization header"))?;

    // Expect "Bearer <token>"
    let token = auth_header.strip_prefix("Bearer ").ok_or_else(|| {
        actix_web::error::ErrorUnauthorized("Invalid Authorization format. Use: Bearer <token>")
    })?;

    let claims =
        validate_session_token(token).map_err(|e| actix_web::error::ErrorUnauthorized(e))?;

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
        has_pin: updated_user.password.is_some(),
    };

    Ok(HttpResponse::Ok().json(UpdateProfileResponse {
        status: "success".to_string(),
        message: "Profile updated successfully".to_string(),
        user: user_info,
    }))
}
