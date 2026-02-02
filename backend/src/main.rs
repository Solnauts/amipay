use actix_web::{App, HttpServer, get, web};
use std::io::Result;

mod controllers;

//web server
#[actix_web::main]
async fn main() -> Result<()> {
    HttpServer::new(|| App::new())
        .bind(("127.0.0.1", 4000))?
        .run()
        .await
}
