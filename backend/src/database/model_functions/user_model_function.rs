use crate::{
    database::{
        establish_connection,
        model::{NewUser, User},
    },
    schema::user,
};
use diesel::prelude::*;

pub fn get_user() -> Vec<User> {
    use crate::schema::user::dsl::*;
    let connection = &mut establish_connection();
    let results = user
        .limit(5)
        .select(User::as_select())
        .load(connection)
        .expect("error loading posts");
    results
}

pub fn create_user(conn: &mut PgConnection, name: String, password: String) -> User {
    let new_user = NewUser {
        name: name,
        password: password,
    };
    diesel::insert_into(user::table)
        .values(&new_user)
        .returning(User::as_returning())
        .get_result(conn)
        .expect("Error saving the user")
}
