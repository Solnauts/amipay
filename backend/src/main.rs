use actix_web::{App, HttpServer};
use std::io::Result;

use crate::controllers::get_response;

mod controllers;

//web server
#[actix_web::main]
async fn main() -> Result<()> {
    HttpServer::new(|| App::new().service(get_response))
        .bind(("127.0.0.1", 4000))?
        .run()
        .await
}
