use crate::schema::{user, ledger};
use chrono::{DateTime, Utc};
use diesel::prelude::*;
use serde::Serialize;

#[derive(Queryable)]
#[diesel(table_name = crate::schema::user)]
#[diesel(check_for_backend(diesel::pg::Pg))]
#[derive(Serialize, Clone)]
pub struct DbUser {
    pub id: i32,
    pub name: Option<String>,
    pub password: Option<String>,
    pub amount: Option<i64>,
    pub unique_id: String,
    pub method_type: String,
    pub email: Option<String>,
    pub user_usdc_ata: Option<String>,
    pub wallet_address: Option<String>,
}

#[derive(Queryable, Selectable)]
#[diesel(table_name = crate::schema::recipient)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Dbrecipient {
    pub name: String,
    pub userid: i32,
    pub id: i32,
}

// Insertable struct for creating a user via contact number (full data upfront)
#[derive(Insertable)]
#[diesel(table_name = user)]
pub struct NewUser {
    pub name: Option<String>,
    pub password: Option<String>,
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
}

// Changeset struct for updating a wallet user's profile (username + pin)
#[derive(AsChangeset)]
#[diesel(table_name = user)]
pub struct UpdateWalletProfile {
    pub name: Option<String>,
    pub password: Option<String>,
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
