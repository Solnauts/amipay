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
