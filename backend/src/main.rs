use actix_web::{App, HttpServer};
use std::io::Result;

use crate::controllers::get_response;
use crate::database::establish_connection;
mod controllers;
mod database;
mod schema;
mod utilities;
//web server

//calling the db connection function

//have to find the way to club multiple conttroller at one one for clean code
#[actix_web::main]
async fn main() -> Result<()> {
    //call the databse connection first
    establish_connection();

    //create the server instance
    HttpServer::new(|| App::new().service(get_response))
        .bind(("127.0.0.1", 4000))?
        .run()
        .await
}
