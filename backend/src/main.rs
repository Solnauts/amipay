use actix_web::{App, HttpServer};
use std::io::Result;

use crate::controllers::{get_response, create_user_handler, swap_handler, get_vault_status, trigger_airdrop_handler};
use crate::database::establish_connection;
mod controllers;
mod database;
mod schema;
mod utility;

//web server

//calling the db connection function

//have to find the way to club multiple conttroller at one one for clean code
#[actix_web::main]
async fn main() -> Result<()> {
    //call the databse connection first
    establish_connection();

    //create the server instance
    HttpServer::new(|| {
        App::new()
            .service(get_response)
            .service(create_user_handler)
            .service(swap_handler)
            .service(get_vault_status)
            .service(trigger_airdrop_handler)
    })
    .bind(("127.0.0.1", 4000))?
    .run()
    .await
}
