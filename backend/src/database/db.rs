use crate::errors::DbError;
use diesel::prelude::*;
use dotenv::dotenv;
use std::env;

pub fn establish_connection() -> Result<PgConnection, DbError> {
    dotenv().ok();

    let database_url = env::var("DATABASE_URL").map_err(|_| DbError::ConnectionFailed {
        reason: "DATABASE_URL env var not set".to_string(),
    })?;

    PgConnection::establish(&database_url).map_err(|e| DbError::ConnectionFailed {
        reason: e.to_string(),
    })
}
