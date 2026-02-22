use crate::database::db::establish_connection;
use crate::database::model::{DbConversation, NewConversation};
use crate::schema::conversation;
use diesel::PgConnection;
use diesel::prelude::*;
pub fn create_conversation(target_user_id: i32) -> DbConversation {
    let connection = &mut PgConnection::from(establish_connection());
    let new_conv = NewConversation {
        user_id: target_user_id,
    };

    diesel::insert_into(conversation::table)
        .values(&new_conv)
        .get_result(connection)
        .expect("Error creating conversation")
}

pub fn get_latest_conversation(
    conn: &mut PgConnection,
    target_user_id: i32,
) -> Option<DbConversation> {
    use crate::schema::conversation::dsl::*;

    conversation
        .filter(user_id.eq(target_user_id))
        .order(created_at.desc())
        .first::<DbConversation>(conn)
        .optional()
        .expect("Error querying conversation")
}

pub fn get_conversation_by_id(
    conn: &mut PgConnection,
    conv_id: i32,
    target_user_id: i32,
) -> Option<DbConversation> {
    use crate::schema::conversation::dsl::*;

    conversation
        .filter(id.eq(conv_id))
        .filter(user_id.eq(target_user_id))
        .first::<DbConversation>(conn)
        .optional()
        .expect("Error querying conversation by id")
}
