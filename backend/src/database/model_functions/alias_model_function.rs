use crate::database::model::{DbAlias, NewAlias};
use crate::errors::{AppError, DbError, ValidationError};
use diesel::prelude::*;
use diesel::PgConnection;

/// Create a new alias for a user.
/// Returns `ValidationError::AliasTaken` if the alias string is already used.
pub fn create_alias(
    conn: &mut PgConnection,
    target_user_id: i32,
    alias_str: &str,
    primary: bool,
) -> Result<DbAlias, AppError> {
    use crate::schema::alias::dsl::*;

    // Check if the alias is already taken
    let existing = alias
        .filter(alias.eq(alias_str))
        .first::<DbAlias>(conn)
        .optional()
        .map_err(|e| DbError::AliasLookupFailed {
            alias: alias_str.to_string(),
            reason: e.to_string(),
        })?;

    if existing.is_some() {
        return Err(ValidationError::AliasTaken {
            alias: alias_str.to_string(),
        }
        .into());
    }

    let new_alias = NewAlias {
        user_id: target_user_id,
        alias: alias_str.to_string(),
        is_primary: primary,
    };

    diesel::insert_into(alias)
        .values(&new_alias)
        .get_result(conn)
        .map_err(|e| {
            DbError::AliasCreationFailed {
                reason: e.to_string(),
            }
            .into()
        })
}

/// Look up a user by their alias string.
/// Returns `ValidationError::AliasNotFound` if no alias matches.
pub fn find_user_by_alias(conn: &mut PgConnection, alias_str: &str) -> Result<DbAlias, AppError> {
    use crate::schema::alias::dsl::*;

    alias
        .filter(alias.eq(alias_str))
        .first::<DbAlias>(conn)
        .optional()
        .map_err(|e| DbError::AliasLookupFailed {
            alias: alias_str.to_string(),
            reason: e.to_string(),
        })?
        .ok_or_else(|| {
            ValidationError::AliasNotFound {
                alias: alias_str.to_string(),
            }
            .into()
        })
}

/// Get all aliases belonging to a user.
pub fn get_aliases_for_user(
    conn: &mut PgConnection,
    target_user_id: i32,
) -> Result<Vec<DbAlias>, DbError> {
    use crate::schema::alias::dsl::*;

    alias
        .filter(user_id.eq(target_user_id))
        .order(created_at.asc())
        .load::<DbAlias>(conn)
        .map_err(|e| DbError::AliasLookupFailed {
            alias: format!("all for user_id={}", target_user_id),
            reason: e.to_string(),
        })
}

/// Delete an alias by its ID (only if it belongs to the given user).
pub fn delete_alias(
    conn: &mut PgConnection,
    alias_id: i32,
    owner_user_id: i32,
) -> Result<usize, AppError> {
    use crate::schema::alias::dsl::*;

    let deleted = diesel::delete(
        alias
            .filter(id.eq(alias_id))
            .filter(user_id.eq(owner_user_id)),
    )
    .execute(conn)
    .map_err(|e| DbError::AliasDeleteFailed {
        alias_id,
        reason: e.to_string(),
    })?;

    if deleted == 0 {
        return Err(ValidationError::AliasNotFound {
            alias: format!("id={}", alias_id),
        }
        .into());
    }

    Ok(deleted)
}
