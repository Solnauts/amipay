use crate::schema::user;
use diesel::prelude::*;
use serde::Serialize;

#[derive(Queryable)]
#[diesel(table_name = crate::schema::user)]
#[diesel(check_for_backend(diesel::pg::Pg))]
#[derive(Serialize)]
pub struct DbUser {
    pub id: i32,
    pub name: String,
    pub password: String,
    pub amount: Option<i64>,
    pub unique_id: String,
    pub method_type: String,
    pub email: Option<String>,
    pub user_usdc_ata: String,
}

#[derive(Queryable, Selectable)]
#[diesel(table_name = crate::schema::recipient)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Dbrecipient {
    pub name: String,
    pub id: i32,
    pub userid: i32,
}

// Insertable struct matching the new user table columns (id is auto-generated)
#[derive(Insertable)]
#[diesel(table_name = user)]
pub struct NewUser {
    pub name: String,
    pub password: String,
    pub amount: Option<i64>,
    pub unique_id: String,
    pub method_type: String,
    pub email: Option<String>,
    pub user_usdc_ata: String,
}

#[derive(Queryable)]
#[diesel(table_name = crate::schema::swap_transactions)]
#[diesel(check_for_backend(diesel::pg::Pg))]
#[derive(Serialize)]
pub struct DbSwapTransaction {
    pub id: i32,
    pub user_id: i32,
    pub usdc_amount: i64,
    pub sol_amount: i64,
    pub fee_amount: i64,
    pub status: String,
    pub user_sender_ata: String,
    pub user_receiver_pubkey: String,
    pub tx_hash: Option<String>,
    pub created_at: chrono::NaiveDateTime,
    pub updated_at: chrono::NaiveDateTime,
}

#[derive(Insertable)]
#[diesel(table_name = crate::schema::swap_transactions)]
pub struct NewSwapTransaction {
    pub user_id: i32,
    pub usdc_amount: i64,
    pub sol_amount: i64,
    pub fee_amount: i64,
    pub status: String,
    pub user_sender_ata: String,
    pub user_receiver_pubkey: String,
}

#[derive(Queryable)]
#[diesel(table_name = crate::schema::vault_balances)]
#[diesel(check_for_backend(diesel::pg::Pg))]
#[derive(Serialize)]
pub struct DbVaultBalance {
    pub id: i32,
    pub sol_reserve: i64,
    pub usdc_fees: i64,
    pub last_airdrop_amount: Option<i64>,
    pub last_airdrop_timestamp: Option<chrono::NaiveDateTime>,
    pub airdrop_count: i32,
    pub created_at: chrono::NaiveDateTime,
    pub updated_at: chrono::NaiveDateTime,
}

#[derive(Insertable)]
#[diesel(table_name = crate::schema::vault_balances)]
pub struct NewVaultBalance {
    pub sol_reserve: i64,
    pub usdc_fees: i64,
}

#[derive(AsChangeset)]
#[diesel(table_name = crate::schema::vault_balances)]
pub struct UpdateVaultBalance {
    pub sol_reserve: Option<i64>,
    pub usdc_fees: Option<i64>,
    pub last_airdrop_amount: Option<i64>,
    pub last_airdrop_timestamp: Option<chrono::NaiveDateTime>,
    pub airdrop_count: Option<i32>,
}
