use crate::{
    database::{
        establish_connection,
        model::{DbUser, NewUser},
    },
    schema::User,
};
use diesel::prelude::*;

pub fn get_user() -> Vec<DbUser> {
    use crate::schema::User::dsl::*;
    let connection = &mut establish_connection();
    let results = User
        .limit(5)
        .load(connection)
        .expect("error loading userdata");

    let result2 = User
        .load::<(i32, String, String, Option<i64>)>(connection)
        .unwrap();

    results
}

pub fn create_user(conn: &mut PgConnection, name: String, password: String) -> DbUser {
    let new_user = NewUser {
        name: name,
        password: password,
    };
    diesel::insert_into(User::table)
        .values(&new_user)
        .get_result(conn)
        .expect("Error saving the user")
}
