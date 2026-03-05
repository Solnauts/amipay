use crate::database::model::{DbAlias, DbAliasName, NewAlias};
use crate::errors::{AppError, DbError, ValidationError};
use diesel::PgConnection;
use diesel::prelude::*;

pub fn create_alias(
    conn: &mut PgConnection,
    target_user_id: i32,
    alias_str: &str,
    primary: bool,
    half_alias_str: &str,
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
        half_alias: half_alias_str.to_string(),
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

//create the is alias exist function
pub fn is_alias_exists(conn: &mut PgConnection, alias_vec: Vec<String>) -> Vec<String> {
    //get the dsl from the alias table
    use crate::schema::alias::dsl::*;

    //iterate through the alias_str and check if any of them exists
    let db_result = alias
        .filter(alias_name.eq_any(&alias_vec))
        .load::<DbAlias>(conn);

    //create the return vector
    let mut new_alias_vec = Vec::new();

    match db_result {
        Ok(db_alias_vec) => {
            //get the alias from the db_alias_vec and pop those from the aliasa_vec and return the new alias vec
            for alias_val in db_alias_vec {
                //directly check the value from the db_alias_vec and pop those from the aliasa_vec and return the new alias vec
                if alias_vec.contains(&alias_val.alias_name) {
                    new_alias_vec.push(alias_val.alias_name);
                };
            }
            //return the new alias vec
            return new_alias_vec;
        }
        Err(_) => {
            //there might be no alias in the db so return the alias vec itself
            return alias_vec;
        }
    }
}

pub struct AliasNameResponse {
    pub name: String,
    pub full_alias: String,
}

//get all the alias present in the database
pub fn get_all_alias(conn: &mut PgConnection) -> Result<Vec<DbAliasName>, DbError> {
    use crate::schema::alias::dsl::*;

    //query function to get all the alias from the database
    let alias_result = alias
        .select(DbAliasName::as_select())
        .load::<DbAliasName>(conn);

    match alias_result {
        Ok(result) => Ok(result),
        Err(error) => Err(DbError::AliasLookupFailed {
            alias: "all".to_string(),
            reason: error.to_string(),
        }),
    }
}
