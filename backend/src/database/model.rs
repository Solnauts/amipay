use crate::schema::user;
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
    pub id: i32,
    pub userid: i32,
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
