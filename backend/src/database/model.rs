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
    pub pubkey: Vec<u8>,
}

#[derive(Queryable, Selectable)]
#[diesel(table_name = crate::schema::recipient)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Dbrecipient {
    pub name: String,
    pub id: i32,
    pub userid: i32,
}

//using the recipient
#[derive(Insertable)]
#[diesel(table_name = user)]
pub struct NewUser {
    pub name: String,
    pub password: String,
    pub amount: i64,
    pub pubkey: [u8; 32],
}

//fix for the password like need to encrypt this before sending to database
