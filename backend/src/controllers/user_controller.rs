use actix_web::{HttpResponse, Responder, get, post, web};
use serde::{Deserialize, Serialize};

#[derive(Deserialize, Debug, Serialize)]
pub struct NewUser {
    name: String,
    password: String,
}

#[post("/create_user")]
async fn create_user(data: web::Json<NewUser>) -> impl Responder {
    //extract the data from the data
    let web::Json(NewUser { name, password }) = data;

    //call the create_user database function

    HttpResponse::Ok().body("user successfully created")
}

async fn create_wallet(data: web::Json<NewUser>) -> impl Responder {
    //extract the data from the data
    let web::Json(NewUser { name, password }) = data;

    //call the create_user database function

    HttpResponse::Ok().body("user successfully created")
}
