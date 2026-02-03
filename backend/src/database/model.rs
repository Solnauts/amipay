use diesel::prelude::*;

#[derive(Queryable, Selectable)]
#[diesel(table_name = crate::schema::user)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct User {
    pub name: i32,
    pub id: String,
    pub password: String,
    pub recipients: Vec<String>,
}

