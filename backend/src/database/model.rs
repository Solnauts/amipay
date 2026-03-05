use crate::schema::{alias, conversation, ledger, pending_action, user};
use chrono::{DateTime, Utc};
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Queryable)]
#[diesel(table_name = crate::schema::user)]
#[diesel(check_for_backend(diesel::pg::Pg))]
#[derive(Serialize, Clone)]
pub struct DbUser {
    pub id: i32,
    pub name: Option<String>,
    pub user_pin: String,
    pub amount: Option<i64>,
    pub unique_id: String,
    pub method_type: String,
    pub email: Option<String>,
    pub user_usdc_ata: Option<String>,
    pub wallet_address: Option<String>,
}

#[derive(Queryable, Selectable, Serialize, Clone, Debug)]
#[diesel(table_name = crate::schema::recipient)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Dbrecipient {
    pub userid: i32,
    pub id: i32,
    pub recipient_user_id: i32,
    pub alias_used: String,
}

#[derive(Insertable)]
#[diesel(table_name = crate::schema::recipient)]
pub struct NewRecipient {
    pub userid: i32,
    pub recipient_user_id: i32,
    pub alias_used: String,
}

// Insertable struct for creating a user via contact number (full data upfront)
#[derive(Insertable)]
#[diesel(table_name = user)]
pub struct NewUser {
    pub name: Option<String>,
    pub user_pin: String,
    pub amount: Option<i64>,
    pub unique_id: String,
    pub method_type: String,
    pub email: Option<String>,
    pub user_usdc_ata: Option<String>,
    pub wallet_address: Option<String>,
}

// Insertable struct for creating a wallet-only user (minimal data)
#[derive(Insertable)]
#[diesel(table_name = user)]
pub struct NewWalletUser {
    pub wallet_address: Option<String>,
    pub unique_id: String,
    pub method_type: String,
    pub user_pin: String,
}

// Changeset struct for updating a wallet user's profile (username + pin)
#[derive(AsChangeset)]
#[diesel(table_name = user)]
pub struct UpdateWalletProfile {
    pub name: Option<String>,
    pub user_pin: String,
}

// ── Ledger Models ───────────────────────────────────────────────────────────

// Queryable struct — field order must match schema.rs column order
#[derive(Queryable, Selectable, Serialize, Clone, Debug)]
#[diesel(table_name = crate::schema::ledger)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct DbLedger {
    pub id: i32,
    #[diesel(column_name = senderId)]
    pub sender_id: i32,
    #[diesel(column_name = receiverId)]
    pub receiver_id: i32,
    pub amount: i64,
    pub currency: String,
    pub tx_signature: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub confirmed_at: Option<DateTime<Utc>>,
}

// Insertable struct for recording a new transaction
#[derive(Insertable)]
#[diesel(table_name = ledger)]
pub struct NewLedger {
    #[diesel(column_name = senderId)]
    pub sender_id: i32,
    #[diesel(column_name = receiverId)]
    pub receiver_id: i32,
    pub amount: i64,
    pub currency: String,
    pub tx_signature: Option<String>,
    pub status: String,
}

#[derive(Queryable, Selectable, Serialize, Clone, Debug)]
#[diesel(table_name = crate::schema::conversation)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct DbConversation {
    pub id: i32,
    pub user_id: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Insertable)]
#[diesel(table_name = conversation)]
pub struct NewConversation {
    pub user_id: i32,
}

// ── Pending Action Models ───────────────────────────────────────────────────

/// Queryable struct — field order must match schema.rs column order
#[derive(Queryable, Selectable, Serialize, Clone, Debug)]
#[diesel(table_name = crate::schema::pending_action)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct DbPendingAction {
    pub id: i32,
    pub user_id: i32,
    pub conversation_id: i32,
    pub action_type: String,
    pub payload: serde_json::Value,
    pub status: String,
    pub expires_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

/// Insertable struct for creating a new pending action
#[derive(Insertable)]
#[diesel(table_name = pending_action)]
pub struct NewPendingAction {
    pub user_id: i32,
    pub conversation_id: i32,
    pub action_type: String,
    pub payload: serde_json::Value,
    pub status: String,
    pub expires_at: DateTime<Utc>,
}

/// Changeset struct for updating a pending action's status
#[derive(AsChangeset)]
#[diesel(table_name = pending_action)]
pub struct UpdatePendingActionStatus {
    pub status: String,
}

// ── Pending Action Payload Types ────────────────────────────────────────────
// These are the typed payloads that get serialized into the JSONB `payload`
// column. Using serde's tagged enum ("type" field) so each variant is self-
// describing when read back from the database.

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type")]
pub enum PendingActionPayload {
    /// User confirmed a specific recipient, now awaiting final confirm + pin
    TransferConfirm {
        amount: f64,
        currency: String,
        recipient_id: i32,
        recipient_name: String,
        sender_unique_id: String,
    },

    /// Multiple recipients matched — user needs to pick one
    RecipientSelect {
        amount: f64,
        currency: String,
        candidates: Vec<RecipientCandidate>,
        sender_unique_id: String,
    },

    /// User needs to provide their PIN to authorize the transfer
    PinVerify {
        amount: f64,
        currency: String,
        recipient_id: i32,
        recipient_name: String,
        sender_unique_id: String,
    },
}

/// A single recipient candidate shown in the selection prompt
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct RecipientCandidate {
    pub id: i32,
    pub name: String,
}

// ── Alias Models (UPI-style handles) ────────────────────────────────────────
#[derive(Queryable, Selectable, Serialize, Clone, Debug)]
#[diesel(table_name = crate::schema::alias)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct DbAlias {
    pub id: i32,
    pub user_id: i32,
    pub alias_name: String,
    pub is_primary: bool,
    pub created_at: DateTime<Utc>,
    pub half_alias: String,
}

#[derive(Insertable)]
#[diesel(table_name = alias)]
pub struct NewAlias {
    pub user_id: i32,
    pub alias_name: String,
    pub is_primary: bool,
    pub half_alias: String,
}

//struct for useralias of all the users
#[derive(Queryable, Selectable)]
#[diesel(table_name = crate::schema::alias)]
pub struct DbAliasName {
    pub alias_name: String,
}
