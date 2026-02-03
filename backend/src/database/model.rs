use crate::schema::user;
use diesel::prelude::*;
use serde::Deserialize;
#[derive(Queryable, Selectable)]
#[diesel(table_name = crate::schema::user)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct User {
    pub name: String,
    pub id: i32,
    pub password: String,
    pub recipients: Vec<String>,
}

#[derive(Insertable)]
#[diesel(table_name = user)]
pub struct NewUser {
    pub name: String,
    pub password: String,
}

//fix for the password like need to encrypt this before sending to database
