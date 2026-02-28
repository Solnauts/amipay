use actix_web::HttpResponse;
use std::fmt;

// ═══════════════════════════════════════════════════════════════════════════
//  AUTH ERRORS (1xxx) — safe to expose to frontend
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Debug)]
pub enum AuthError {
    /// 1001 — No session_token cookie present
    MissingSessionCookie,
    /// 1002 — JWT decode / validation failed
    InvalidToken { reason: String },
    /// 1003 — JWT expired
    ExpiredToken,
    /// 1004 — Ed25519 wallet signature verification failed
    InvalidSignature,
    /// 1005 — PIN does not match stored hash
    InvalidPin,
    /// 1006 — user ID in JWT is not a valid integer
    InvalidUserId { raw: String },
}

impl AuthError {
    pub fn error_code(&self) -> u32 {
        match self {
            AuthError::MissingSessionCookie => 1001,
            AuthError::InvalidToken { .. } => 1002,
            AuthError::ExpiredToken => 1003,
            AuthError::InvalidSignature => 1004,
            AuthError::InvalidPin => 1005,
            AuthError::InvalidUserId { .. } => 1006,
        }
    }

    /// Human-readable message that IS safe to send to clients.
    pub fn client_message(&self) -> &str {
        match self {
            AuthError::MissingSessionCookie => "Please log in first.",
            AuthError::InvalidToken { .. } => "Session expired. Please log in again.",
            AuthError::ExpiredToken => "Session expired. Please log in again.",
            AuthError::InvalidSignature => "Wallet verification failed.",
            AuthError::InvalidPin => "Incorrect PIN.",
            AuthError::InvalidUserId { .. } => "Invalid session. Please log in again.",
        }
    }
}

impl fmt::Display for AuthError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AuthError::MissingSessionCookie => write!(f, "Missing session cookie"),
            AuthError::InvalidToken { reason } => write!(f, "Invalid token: {}", reason),
            AuthError::ExpiredToken => write!(f, "Expired token"),
            AuthError::InvalidSignature => write!(f, "Invalid Ed25519 signature"),
            AuthError::InvalidPin => write!(f, "Invalid PIN"),
            AuthError::InvalidUserId { raw } => write!(f, "Invalid user ID in token: {}", raw),
        }
    }
}

impl std::error::Error for AuthError {}

// ═══════════════════════════════════════════════════════════════════════════
//  VALIDATION ERRORS (2xxx) — safe to expose to frontend
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Debug)]
pub enum ValidationError {
    /// 2001 — Claim/transfer amount is zero or negative
    InvalidAmount,
    /// 2002 — Unknown claim method (not Auto-Claim / Manual-Claim)
    InvalidClaimMethod { method: String },
    /// 2003 — Manual-Claim requires a recipient pubkey
    MissingRecipientPubkey,
    /// 2004 — User balance too low for this operation
    InsufficientBalance { requested: i64, available: i64 },
    /// 2005 — Named recipient not found for this user
    RecipientNotFound { name: String },
    /// 2006 — conversation_id couldn't be parsed
    InvalidConversationId { raw: String },
    /// 2007 — AI response missing required field (e.g. amount)
    MissingField { field: String },
    /// 2008 — Claimable balance < requested claim
    InsufficientClaimableBalance { requested: i64, claimable: i64 },
    /// 2009 — Unrecognized AI intent
    InvalidIntent { intent: String },
    /// 2010 — Malformed WebSocket message
    MalformedMessage { reason: String },
    /// 2011 — user not found (by wallet, by id, etc.)
    UserNotFound { identifier: String },
    /// 2012 — alias not found
    AliasNotFound { alias: String },
    /// 2013 — alias already taken by another user
    AliasTaken { alias: String },
}

impl ValidationError {
    pub fn error_code(&self) -> u32 {
        match self {
            ValidationError::InvalidAmount => 2001,
            ValidationError::InvalidClaimMethod { .. } => 2002,
            ValidationError::MissingRecipientPubkey => 2003,
            ValidationError::InsufficientBalance { .. } => 2004,
            ValidationError::RecipientNotFound { .. } => 2005,
            ValidationError::InvalidConversationId { .. } => 2006,
            ValidationError::MissingField { .. } => 2007,
            ValidationError::InsufficientClaimableBalance { .. } => 2008,
            ValidationError::InvalidIntent { .. } => 2009,
            ValidationError::MalformedMessage { .. } => 2010,
            ValidationError::UserNotFound { .. } => 2011,
            ValidationError::AliasNotFound { .. } => 2012,
            ValidationError::AliasTaken { .. } => 2013,
        }
    }

    /// Human-readable message that IS safe to send to clients.
    pub fn client_message(&self) -> String {
        match self {
            ValidationError::InvalidAmount => "Amount must be greater than zero.".to_string(),
            ValidationError::InvalidClaimMethod { method } => {
                format!(
                    "Invalid claim method '{}'. Must be 'Auto-Claim' or 'Manual-Claim'.",
                    method
                )
            }
            ValidationError::MissingRecipientPubkey => {
                "Recipient public key is required for Manual-Claim.".to_string()
            }
            ValidationError::InsufficientBalance {
                requested,
                available,
            } => {
                format!(
                    "Insufficient balance. Requested: {}, Available: {}.",
                    requested, available
                )
            }
            ValidationError::RecipientNotFound { name } => {
                format!("Recipient '{}' not found.", name)
            }
            ValidationError::InvalidConversationId { .. } => "Invalid conversation.".to_string(),
            ValidationError::MissingField { field } => {
                format!("Missing required field: {}.", field)
            }
            ValidationError::InsufficientClaimableBalance {
                requested,
                claimable,
            } => {
                format!(
                    "Insufficient claimable balance. Requested: {}, Available: {}.",
                    requested, claimable
                )
            }
            ValidationError::InvalidIntent { .. } => "Unrecognized request.".to_string(),
            ValidationError::MalformedMessage { .. } => "Malformed message.".to_string(),
            ValidationError::UserNotFound { .. } => "User not found.".to_string(),
            ValidationError::AliasNotFound { alias } => {
                format!("Alias '{}' not found.", alias)
            }
            ValidationError::AliasTaken { alias } => {
                format!("Alias '{}' is already taken.", alias)
            }
        }
    }
}

impl fmt::Display for ValidationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ValidationError::InvalidAmount => write!(f, "Invalid amount (zero or negative)"),
            ValidationError::InvalidClaimMethod { method } => {
                write!(f, "Invalid claim method: {}", method)
            }
            ValidationError::MissingRecipientPubkey => {
                write!(f, "Missing recipient pubkey for Manual-Claim")
            }
            ValidationError::InsufficientBalance {
                requested,
                available,
            } => write!(
                f,
                "Insufficient balance: requested={}, available={}",
                requested, available
            ),
            ValidationError::RecipientNotFound { name } => {
                write!(f, "Recipient not found: {}", name)
            }
            ValidationError::InvalidConversationId { raw } => {
                write!(f, "Invalid conversation_id: {}", raw)
            }
            ValidationError::MissingField { field } => write!(f, "Missing field: {}", field),
            ValidationError::InsufficientClaimableBalance {
                requested,
                claimable,
            } => write!(
                f,
                "Insufficient claimable: requested={}, claimable={}",
                requested, claimable
            ),
            ValidationError::InvalidIntent { intent } => {
                write!(f, "Invalid intent: {}", intent)
            }
            ValidationError::MalformedMessage { reason } => {
                write!(f, "Malformed message: {}", reason)
            }
            ValidationError::UserNotFound { identifier } => {
                write!(f, "User not found: {}", identifier)
            }
            ValidationError::AliasNotFound { alias } => {
                write!(f, "Alias not found: {}", alias)
            }
            ValidationError::AliasTaken { alias } => {
                write!(f, "Alias already taken: {}", alias)
            }
    }
}

impl std::error::Error for ValidationError {}

// ═══════════════════════════════════════════════════════════════════════════
//  DATABASE ERRORS (internal — never exposed)
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Debug)]
pub enum DbError {
    /// 5001 — Failed to create a new user row
    UserCreationFailed { reason: String },
    /// 5002 — Failed to update user profile
    ProfileUpdateFailed { user_id: i32, reason: String },
    /// 5003 — Failed to insert a ledger row
    LedgerInsertFailed { reason: String },
    /// 5004 — Balance calculation query failed
    BalanceCalcFailed { user_id: i32, reason: String },
    /// 5005 — Claim recording failed
    ClaimRecordFailed { user_id: i32, reason: String },
    /// 5006 — Failed to create a pending action
    PendingActionCreateFailed { reason: String },
    /// 5007 — Failed to update pending action status
    PendingActionUpdateFailed { action_id: i32, reason: String },
    /// 5008 — Failed to create a conversation
    ConversationCreateFailed { reason: String },
    /// 5009 — Could not establish connection to database
    ConnectionFailed { reason: String },
    /// 5010 — Generic Diesel error (catch-all)
    QueryFailed { context: String, reason: String },
    /// 5011 — User query returned no rows (internal lookup, not user-facing "not found")
    UserLookupFailed { user_id: i32, reason: String },
    /// 5012 — Pending action not found in DB
    PendingActionNotFound { action_id: i32 },
    /// 5013 — Wallet user query failed
    WalletLookupFailed { address: String, reason: String },
    /// 5014 — Unexpected response shape from a DB query
    UnexpectedResult { context: String },
    /// 5015 — Failed to create an alias
    AliasCreationFailed { reason: String },
    /// 5016 — Alias lookup query failed
    AliasLookupFailed { alias: String, reason: String },
    /// 5017 — Failed to delete an alias
    AliasDeleteFailed { alias_id: i32, reason: String },
}

impl DbError {
    pub fn error_code(&self) -> u32 {
        match self {
            DbError::UserCreationFailed { .. } => 5001,
            DbError::ProfileUpdateFailed { .. } => 5002,
            DbError::LedgerInsertFailed { .. } => 5003,
            DbError::BalanceCalcFailed { .. } => 5004,
            DbError::ClaimRecordFailed { .. } => 5005,
            DbError::PendingActionCreateFailed { .. } => 5006,
            DbError::PendingActionUpdateFailed { .. } => 5007,
            DbError::ConversationCreateFailed { .. } => 5008,
            DbError::ConnectionFailed { .. } => 5009,
            DbError::QueryFailed { .. } => 5010,
            DbError::UserLookupFailed { .. } => 5011,
            DbError::PendingActionNotFound { .. } => 5012,
            DbError::WalletLookupFailed { .. } => 5013,
            DbError::UnexpectedResult { .. } => 5014,
            DbError::AliasCreationFailed { .. } => 5015,
            DbError::AliasLookupFailed { .. } => 5016,
            DbError::AliasDeleteFailed { .. } => 5017,
        }
    }
}

impl fmt::Display for DbError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            DbError::UserCreationFailed { reason } => {
                write!(f, "User creation failed: {}", reason)
            }
            DbError::ProfileUpdateFailed { user_id, reason } => {
                write!(f, "Profile update failed for user {}: {}", user_id, reason)
            }
            DbError::LedgerInsertFailed { reason } => {
                write!(f, "Ledger insert failed: {}", reason)
            }
            DbError::BalanceCalcFailed { user_id, reason } => {
                write!(
                    f,
                    "Balance calculation failed for user {}: {}",
                    user_id, reason
                )
            }
            DbError::ClaimRecordFailed { user_id, reason } => {
                write!(f, "Claim record failed for user {}: {}", user_id, reason)
            }
            DbError::PendingActionCreateFailed { reason } => {
                write!(f, "Pending action creation failed: {}", reason)
            }
            DbError::PendingActionUpdateFailed { action_id, reason } => {
                write!(
                    f,
                    "Pending action update failed for action {}: {}",
                    action_id, reason
                )
            }
            DbError::ConversationCreateFailed { reason } => {
                write!(f, "Conversation creation failed: {}", reason)
            }
            DbError::ConnectionFailed { reason } => {
                write!(f, "DB connection failed: {}", reason)
            }
            DbError::QueryFailed { context, reason } => {
                write!(f, "DB query failed [{}]: {}", context, reason)
            }
            DbError::UserLookupFailed { user_id, reason } => {
                write!(f, "User lookup failed for id {}: {}", user_id, reason)
            }
            DbError::PendingActionNotFound { action_id } => {
                write!(f, "Pending action {} not found", action_id)
            }
            DbError::WalletLookupFailed { address, reason } => {
                write!(f, "Wallet lookup failed for {}: {}", address, reason)
            }
            DbError::UnexpectedResult { context } => {
                write!(f, "Unexpected DB result: {}", context)
            }
            DbError::AliasCreationFailed { reason } => {
                write!(f, "Alias creation failed: {}", reason)
            }
            DbError::AliasLookupFailed { alias, reason } => {
                write!(f, "Alias lookup failed for '{}': {}", alias, reason)
            }
            DbError::AliasDeleteFailed { alias_id, reason } => {
                write!(f, "Alias delete failed for id {}: {}", alias_id, reason)
            }
    }
}

impl std::error::Error for DbError {}

impl From<diesel::result::Error> for DbError {
    fn from(e: diesel::result::Error) -> Self {
        DbError::QueryFailed {
            context: "diesel".to_string(),
            reason: e.to_string(),
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  SOLANA ERRORS (internal — never exposed)
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Debug)]
pub enum SolanaError {
    /// 5101 — Keypair file could not be loaded
    KeypairLoadFailed { path: String, reason: String },
    /// 5102 — ATA creation transaction failed
    AtaCreationFailed { unique_id: String, reason: String },
    /// 5103 — Transfer-to-vault transaction failed
    TransferToVaultFailed {
        unique_id: String,
        amount: u64,
        reason: String,
    },
    /// 5104 — Claim (vault → user) transaction failed
    ClaimFailed {
        unique_id: String,
        amount: u64,
        reason: String,
    },
    /// 5105 — Balance check RPC call failed
    BalanceCheckFailed { unique_id: String, reason: String },
    /// 5106 — Generic RPC / network error
    RpcError { reason: String },
    /// 5107 — Required env var for Solana config is missing
    MissingEnvVar { var_name: String },
    /// 5108 — Pubkey parsing / derivation failed
    InvalidPubkey { input: String, reason: String },
    /// 5109 — Account not found on-chain
    AccountNotFound { pubkey: String },
    /// 5110 — Program client creation failed
    ProgramClientFailed { reason: String },
}

impl SolanaError {
    pub fn error_code(&self) -> u32 {
        match self {
            SolanaError::KeypairLoadFailed { .. } => 5101,
            SolanaError::AtaCreationFailed { .. } => 5102,
            SolanaError::TransferToVaultFailed { .. } => 5103,
            SolanaError::ClaimFailed { .. } => 5104,
            SolanaError::BalanceCheckFailed { .. } => 5105,
            SolanaError::RpcError { .. } => 5106,
            SolanaError::MissingEnvVar { .. } => 5107,
            SolanaError::InvalidPubkey { .. } => 5108,
            SolanaError::AccountNotFound { .. } => 5109,
            SolanaError::ProgramClientFailed { .. } => 5110,
        }
    }
}

impl fmt::Display for SolanaError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            SolanaError::KeypairLoadFailed { path, reason } => {
                write!(f, "Keypair load failed [{}]: {}", path, reason)
            }
            SolanaError::AtaCreationFailed { unique_id, reason } => {
                write!(f, "ATA creation failed for {}: {}", unique_id, reason)
            }
            SolanaError::TransferToVaultFailed {
                unique_id,
                amount,
                reason,
            } => {
                write!(
                    f,
                    "Transfer to vault failed for {} (amount={}): {}",
                    unique_id, amount, reason
                )
            }
            SolanaError::ClaimFailed {
                unique_id,
                amount,
                reason,
            } => {
                write!(
                    f,
                    "Claim failed for {} (amount={}): {}",
                    unique_id, amount, reason
                )
            }
            SolanaError::BalanceCheckFailed { unique_id, reason } => {
                write!(f, "Balance check failed for {}: {}", unique_id, reason)
            }
            SolanaError::RpcError { reason } => write!(f, "Solana RPC error: {}", reason),
            SolanaError::MissingEnvVar { var_name } => {
                write!(f, "Missing env var: {}", var_name)
            }
            SolanaError::InvalidPubkey { input, reason } => {
                write!(f, "Invalid pubkey '{}': {}", input, reason)
            }
            SolanaError::AccountNotFound { pubkey } => {
                write!(f, "Account not found: {}", pubkey)
            }
            SolanaError::ProgramClientFailed { reason } => {
                write!(f, "Program client failed: {}", reason)
            }
        }
    }
}

impl std::error::Error for SolanaError {}

// ═══════════════════════════════════════════════════════════════════════════
//  AI ERRORS (internal — never exposed)
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Debug)]
pub enum AiError {
    /// 5201 — HTTP client could not be built
    ClientBuildFailed { reason: String },
    /// 5202 — Request to Ollama failed
    RequestFailed { reason: String },
    /// 5203 — Raw response could not be deserialized
    ResponseParseFailed { reason: String },
    /// 5204 — Inner intent JSON could not be parsed
    IntentParseFailed {
        raw_response: String,
        reason: String,
    },
}

impl AiError {
    pub fn error_code(&self) -> u32 {
        match self {
            AiError::ClientBuildFailed { .. } => 5201,
            AiError::RequestFailed { .. } => 5202,
            AiError::ResponseParseFailed { .. } => 5203,
            AiError::IntentParseFailed { .. } => 5204,
        }
    }
}

impl fmt::Display for AiError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AiError::ClientBuildFailed { reason } => {
                write!(f, "AI client build failed: {}", reason)
            }
            AiError::RequestFailed { reason } => write!(f, "AI request failed: {}", reason),
            AiError::ResponseParseFailed { reason } => {
                write!(f, "AI response parse failed: {}", reason)
            }
            AiError::IntentParseFailed {
                raw_response,
                reason,
            } => write!(
                f,
                "AI intent parse failed: {} (raw: {})",
                reason, raw_response
            ),
        }
    }
}

impl std::error::Error for AiError {}

// ═══════════════════════════════════════════════════════════════════════════
//  TOP-LEVEL APP ERROR — unifies all layers
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Debug)]
pub enum AppError {
    /// Auth failures — client gets a real message (401)
    Auth(AuthError),
    /// Validation failures — client gets a real message (400)
    Validation(ValidationError),
    /// Database failures — client gets "Server Error [5xxx]" (500)
    Database(DbError),
    /// Solana/on-chain failures — client gets "Server Error [5xxx]" (500)
    Solana(SolanaError),
    /// AI/LLM failures — client gets "Server Error [5xxx]" (500)
    Ai(AiError),
    /// CRITICAL: on-chain tx succeeded but DB write failed (500)
    OnChainSuccessDbFailed {
        user_id: i32,
        amount: i64,
        reason: String,
    },
    /// Unexpected / unclassified internal error (500)
    Internal { code: u32, reason: String },
}

impl AppError {
    /// Numeric error code for the frontend.
    pub fn error_code(&self) -> u32 {
        match self {
            AppError::Auth(e) => e.error_code(),
            AppError::Validation(e) => e.error_code(),
            AppError::Database(e) => e.error_code(),
            AppError::Solana(e) => e.error_code(),
            AppError::Ai(e) => e.error_code(),
            AppError::OnChainSuccessDbFailed { .. } => 5901,
            AppError::Internal { code, .. } => *code,
        }
    }

    /// Message that the frontend WILL see.
    ///
    /// - Auth + Validation → real, helpful message.
    /// - Everything else   → "Server Error [code]" (no internals leaked).
    pub fn client_message(&self) -> String {
        match self {
            AppError::Auth(e) => e.client_message().to_string(),
            AppError::Validation(e) => e.client_message(),
            AppError::OnChainSuccessDbFailed { .. } => {
                "Server Error [5901]. Please contact support.".to_string()
            }
            other => format!("Server Error [{}]", other.error_code()),
        }
    }

    /// Full internal message for logging — NEVER sent to client.
    pub fn log_message(&self) -> String {
        format!("[ERR-{}] {}", self.error_code(), self)
    }

    /// Log this error to stderr and return self (for chaining).
    pub fn log(self) -> Self {
        eprintln!("{}", self.log_message());
        self
    }
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::Auth(e) => write!(f, "Auth: {}", e),
            AppError::Validation(e) => write!(f, "Validation: {}", e),
            AppError::Database(e) => write!(f, "Database: {}", e),
            AppError::Solana(e) => write!(f, "Solana: {}", e),
            AppError::Ai(e) => write!(f, "AI: {}", e),
            AppError::OnChainSuccessDbFailed {
                user_id,
                amount,
                reason,
            } => write!(
                f,
                "CRITICAL: on-chain success but DB failed for user {} (amount={}): {}",
                user_id, amount, reason
            ),
            AppError::Internal { code, reason } => {
                write!(f, "Internal [{}]: {}", code, reason)
            }
        }
    }
}

impl std::error::Error for AppError {}

// ── From impls: ? operator "just works" ─────────────────────────────────

impl From<AuthError> for AppError {
    fn from(e: AuthError) -> Self {
        AppError::Auth(e)
    }
}

impl From<ValidationError> for AppError {
    fn from(e: ValidationError) -> Self {
        AppError::Validation(e)
    }
}

impl From<DbError> for AppError {
    fn from(e: DbError) -> Self {
        AppError::Database(e)
    }
}

impl From<SolanaError> for AppError {
    fn from(e: SolanaError) -> Self {
        AppError::Solana(e)
    }
}

impl From<AiError> for AppError {
    fn from(e: AiError) -> Self {
        AppError::Ai(e)
    }
}



// ── actix_web::ResponseError — maps AppError to HTTP responses ──────────
impl actix_web::ResponseError for AppError {
    fn status_code(&self) -> actix_web::http::StatusCode {
        use actix_web::http::StatusCode;
        match self {
            AppError::Auth(_) => StatusCode::UNAUTHORIZED,
            AppError::Validation(_) => StatusCode::BAD_REQUEST,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn error_response(&self) -> HttpResponse {
        // Always log internal detail before responding
        eprintln!("{}", self.log_message());

        HttpResponse::build(self.status_code()).json(serde_json::json!({
            "status": "error",
            "error_code": self.error_code(),
            "message": self.client_message(),
        }))
    }
}
