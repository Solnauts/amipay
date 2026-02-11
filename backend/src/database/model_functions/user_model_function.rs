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

    let result2 = user
        .load::<(i32, String, String, Option<i64>, Vec<u8>)>(connection)
        .unwrap();

    results
}

pub fn create_user(
    conn: &mut PgConnection,
    name: String,
    password: String,
    amount: i64,
    pubkey: [u8; 32],
) -> DBResponse {
    let new_user = NewUser {
        name: name,
        password: password,
        amount,
        pubkey,
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
