use crate::{
    database::{
        establish_connection,
        model::{DbUser, NewUser},
    },
    schema::user,
};
use diesel::prelude::*;

pub struct DBResponse {
    pub success: bool,
    pub data: DbUser,
}

pub fn get_user() -> Vec<DbUser> {
    use crate::schema::user::dsl::*;
    let connection = &mut establish_connection();
    let results = user
        .limit(5)
        .load(connection)
        .expect("error loading userdata");

    results
}

pub fn create_user(
    conn: &mut PgConnection,
    name: String,
    password: String,
    unique_id: String,
    method_type: String,
    email: Option<String>,
    user_usdc_ata: String,
) -> DBResponse {
    let new_user = NewUser {
        name,
        password,
        amount: None, // New users start with no balance
        unique_id,
        method_type,
        email,
        user_usdc_ata,
    };

    //insert into database
    let response = diesel::insert_into(user::table)
        .values(&new_user)
        .get_result(conn)
        .expect("Error saving the user");

    let dbresponse = DBResponse {
        success: true,
        data: response,
    };
    dbresponse
}
