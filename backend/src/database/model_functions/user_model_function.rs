use crate::{
    database::{establish_connection, model::User},
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





