use actix_web::{App, HttpServer};
use std::io::Result;

use crate::controllers::get_response;
use crate::database::establish_connection;
mod controllers;
mod database;
mod schema;

//web server

//calling the db connection function

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
