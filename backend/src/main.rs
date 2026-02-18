use actix_web::{App, HttpServer, middleware::Logger, web};
use std::io::Result;

use crate::controllers::{create_user_handler, get_response, main_caller};
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
            .route("/main_caller", web::get().to(main_caller))
            .wrap(Logger::default())
            .service(get_response)
            .service(create_user_handler)
    })
    .bind(("127.0.0.1", 4000))?
    .run()
    .await
}
