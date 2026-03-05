use crate::database::db::establish_connection;
use crate::database::model::{DbConversation, NewConversation};
use crate::errors::DbError;
use crate::schema::conversation;
use diesel::prelude::*;
use diesel::PgConnection;

pub fn create_conversation(target_user_id: i32) -> Result<DbConversation, DbError> {
    let connection = &mut establish_connection()?;
    let new_conv = NewConversation {
        user_id: target_user_id,
    };

    diesel::insert_into(conversation::table)
        .values(&new_conv)
        .get_result(connection)
        .map_err(|e| DbError::ConversationCreateFailed {
            reason: e.to_string(),
        })
}

pub fn get_latest_conversation(
    conn: &mut PgConnection,
    target_user_id: i32,
) -> Result<Option<DbConversation>, DbError> {
    use crate::schema::conversation::dsl::*;

    conversation
        .filter(user_id.eq(target_user_id))
        .order(created_at.desc())
        .first::<DbConversation>(conn)
        .optional()
        .map_err(|e| DbError::QueryFailed {
            context: format!("latest conversation for user {}", target_user_id),
            reason: e.to_string(),
        })
}

pub fn get_conversation_by_id(
    conn: &mut PgConnection,
    conv_id: i32,
    target_user_id: i32,
) -> Result<Option<DbConversation>, DbError> {
    use crate::schema::conversation::dsl::*;

    conversation
        .filter(id.eq(conv_id))
        .filter(user_id.eq(target_user_id))
        .first::<DbConversation>(conn)
        .optional()
        .map_err(|e| DbError::QueryFailed {
            context: format!("conversation id={} user={}", conv_id, target_user_id),
            reason: e.to_string(),
        })
}
