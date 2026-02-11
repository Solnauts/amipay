use crate::schema::Recipient;
use crate::schema::User;
use diesel::prelude::*;
use serde::Serialize;
use solana_sdk::pubkey::Pubkey;
#[derive(Queryable, Selectable)]
#[diesel(table_name = crate::schema::User)]
#[diesel(check_for_backend(diesel::pg::Pg))]
#[derive(Serialize)]
pub struct DbUser {
    pub id: i32,
    pub name: String,
    pub password: String,
    pub amount: Option<i64>,
}

#[derive(Queryable, Selectable)]
#[diesel(table_name = crate::schema::Recipient)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct DbRecipient {
    pub name: String,
    pub id: i32,
    pub userid: i32,
}
//using the recipient

#[derive(Insertable)]
#[diesel(table_name = User)]
pub struct NewUser {
    pub name: String,
    pub password: String,
    pub amount: i64,
    pub pubkey: Pubkey,
}

//fix for the password like need to encrypt this before sending to database
