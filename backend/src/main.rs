use actix_web::{App, HttpServer, middleware::Logger, web};
use std::io::Result;

use crate::controllers::{
    create_user_handler, get_nonce, main_caller, update_profile, wallet_login,
};
use crate::database::establish_connection;
mod controllers;
mod database;
mod schema;
mod utility;

#[actix_web::main]
async fn main() -> Result<()> {
    // Initialize database connection on startup
    establish_connection();

    // Create and run the HTTP server
    HttpServer::new(|| {
        App::new()
            .wrap(Logger::default())
            // WebSocket route
            .route("/main_caller", web::get().to(main_caller))
            // Contact number flow
            .service(create_user_handler)
            // Wallet auth flow
            .service(get_nonce) // GET  /wallet/nonce
            .service(wallet_login) // POST /wallet/login
            .service(update_profile) // POST /wallet/update-profile
        // AI
    })
    .bind(("127.0.0.1", 4000))?
    .run()
    .await
}
