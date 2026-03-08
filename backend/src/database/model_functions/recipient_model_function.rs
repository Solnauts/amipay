use crate::database::model::{DbAlias, DbUser, Dbrecipient, NewRecipient};
use crate::errors::{AppError, DbError, ValidationError};
use diesel::PgConnection;
use diesel::prelude::*;

/// Add a new recipient to the user's contact list by resolving an Amipay alias.
///
/// Steps:
///   1. Resolve `alias_str` → target user via the `alias` table
///   2. Reject self-add and duplicates
///   3. Insert a new `recipient` row with the display name and alias
pub fn add_recipient_by_alias(
    conn: &mut PgConnection,
    owner_user_id: i32,
    alias_str: &str,
    recipient_name: &str,
) -> Result<Dbrecipient, AppError> {
    use crate::schema::alias::dsl::{alias, alias_name};
    use crate::schema::recipient::dsl::{recipient, recipient_user_id, userid};

    let alias_row = alias
        .filter(alias_name.eq(alias_str))
        .first::<DbAlias>(conn)
        .optional()
        .map_err(|e: diesel::result::Error| DbError::AliasLookupFailed {
            alias: alias_str.to_string(),
            reason: e.to_string(),
        })?
        .ok_or_else(|| ValidationError::AliasNotFound {
            alias: alias_str.to_string(),
        })?;

    if alias_row.user_id == owner_user_id {
        return Err(ValidationError::MalformedMessage {
            reason: "Cannot add yourself as a recipient".to_string(),
        }
        .into());
    }

    let existing = recipient
        .filter(userid.eq(owner_user_id))
        .filter(recipient_user_id.eq(alias_row.user_id))
        .first::<Dbrecipient>(conn)
        .optional()
        .map_err(|e: diesel::result::Error| DbError::QueryFailed {
            context: "duplicate recipient check".to_string(),
            reason: e.to_string(),
        })?;

    if existing.is_some() {
        return Err(ValidationError::AliasTaken {
            alias: "Recipient already in your list".to_string(),
        }
        .into());
    }

    let new = NewRecipient {
        userid: owner_user_id,
        recipient_user_id: alias_row.user_id,
        alias_used: alias_str.to_string(),
        recipient_name: recipient_name.to_string(),
    };

    diesel::insert_into(recipient)
        .values(&new)
        .get_result(conn)
        .map_err(|e| {
            DbError::QueryFailed {
                context: "insert recipient".to_string(),
                reason: e.to_string(),
            }
            .into()
        })
}

/// Fetch all recipients for a user, joined with the `user` table to get
/// the recipient's full profile.
pub fn get_recipients_for_user(
    conn: &mut PgConnection,
    owner_user_id: i32,
) -> Result<Vec< Dbrecipient>, DbError> {
    use crate::schema::recipient::dsl::*;
        //load all the recipients for a particular user 
        recipient.filter(userid.eq(owner_user_id)).load::<Dbrecipient>(conn).map_err(|e| DbError::QueryFailed {
            context: format!("get recipients for user {}", owner_user_id),
            reason: e.to_string(),
        })
}

/// Remove a recipient from the user's contact list.
pub fn remove_recipient(
    conn: &mut PgConnection,
    owner_user_id: i32,
    target_recipient_user_id: i32,
) -> Result<usize, AppError> {
    use crate::schema::recipient::dsl::*;

    let deleted = diesel::delete(
        recipient
            .filter(userid.eq(owner_user_id))
            .filter(recipient_user_id.eq(target_recipient_user_id)),
    )
    .execute(conn)
    .map_err(|e| DbError::QueryFailed {
        context: "delete recipient".to_string(),
        reason: e.to_string(),
    })?;

    if deleted == 0 {
        return Err(ValidationError::RecipientNotFound {
            name: format!("recipient_user_id={}", target_recipient_user_id),
        }
        .into());
    }

    Ok(deleted)
}
