use crate::schema::user;
use diesel::prelude::*;
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
pub struct NewUser<'a> {
    pub name: &'a str,
    pub password: &'a str,
}

//fix for the password like need to encrypt this before sending to database
