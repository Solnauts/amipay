use actix_web::{App, HttpServer, middleware::Logger, web};
use std::io::Result;

use crate::controllers::{
    add_recipient, claim_amount, create_user_alias, create_user_handler, deposit_usdc, get_nonce,
    get_unique_alias, get_usdc_balance, get_user_alias, get_wallet_address, main_caller,
    update_profile, wallet_login,
};
use crate::database::establish_connection;
mod controllers;
mod database;
pub mod errors;
mod schema;
mod utility;

#[actix_web::main]
async fn main() -> Result<()> {
    // Verify database connection on startup
    establish_connection().expect("Failed to connect to database on startup");

    // Create and run the HTTP server
    HttpServer::new(|| {
        App::new()
            .wrap(Logger::default())
            // WebSocket route
            .route("/main_caller", web::get().to(main_caller))
            // Contact number flow
            .service(create_user_handler) // POST /createaccount
            // Wallet auth flow
            .service(get_nonce) // GET  /wallet/nonce
            .service(wallet_login) // POST /wallet/login
            .service(update_profile) // POST /wallet/update-profile
            // Wallet alias
            .service(get_unique_alias) // GET  /wallet/unique-alias
            .service(create_user_alias) // POST /wallet/create-alias
            .service(get_user_alias) // POST /wallet/get_user_alias
            // Wallet account
            .service(get_wallet_address) // POST /wallet/address
            .service(add_recipient) // POST /wallet/add-recipient
            // Wallet USDC
            .service(deposit_usdc) // POST /wallet/deposit
            .service(get_usdc_balance) // GET  /wallet/getusdcamount
            // Ledger / claiming
            .service(claim_amount) // POST /claimamount
    })
    .bind(("127.0.0.1", 4000))?
    .run()
    .await
}
