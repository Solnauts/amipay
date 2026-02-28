use crate::database::model::{DbAlias, NewAlias};
use crate::errors::{AppError, DbError, ValidationError};
use diesel::prelude::*;
use diesel::PgConnection;

pub fn create_alias(
    conn: &mut PgConnection,
    target_user_id: i32,
    alias_str: &str,
    primary: bool,
) -> Result<DbAlias, AppError> {
    use crate::schema::alias::dsl::*;

    let existing = alias
        .filter(alias_name.eq(alias_str))
        .first::<DbAlias>(conn)
        .optional()
        .map_err(|e: diesel::result::Error| DbError::AliasLookupFailed {
            alias: alias_str.to_string(),
            reason: e.to_string(),
        })?;

    if existing.is_some() {
        return Err(ValidationError::AliasTaken {
            alias: alias_str.to_string(),
        }
        .into());
    }

    let new = NewAlias {
        user_id: target_user_id,
        alias_name: alias_str.to_string(),
        is_primary: primary,
    };

    diesel::insert_into(alias)
        .values(&new)
        .get_result(conn)
        .map_err(|e| {
            DbError::AliasCreationFailed {
                reason: e.to_string(),
            }
            .into()
        })
}

pub fn find_user_by_alias(conn: &mut PgConnection, alias_str: &str) -> Result<DbAlias, AppError> {
    use crate::schema::alias::dsl::*;

    alias
        .filter(alias_name.eq(alias_str))
        .first::<DbAlias>(conn)
        .optional()
        .map_err(|e: diesel::result::Error| DbError::AliasLookupFailed {
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

pub fn delete_alias(
    conn: &mut PgConnection,
    alias_id_val: i32,
    owner_user_id: i32,
) -> Result<usize, AppError> {
    use crate::schema::alias::dsl::*;

    let deleted = diesel::delete(
        alias
            .filter(id.eq(alias_id_val))
            .filter(user_id.eq(owner_user_id)),
    )
    .execute(conn)
    .map_err(|e| DbError::AliasDeleteFailed {
        alias_id: alias_id_val,
        reason: e.to_string(),
    })?;

    if deleted == 0 {
        return Err(ValidationError::AliasNotFound {
            alias: format!("id={}", alias_id_val),
        }
        .into());
    }

    Ok(deleted)
}
