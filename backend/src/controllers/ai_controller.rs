use actix_web::{App, HttpResponse, HttpServer, Responder, get, post, web};
use reqwest;
use serde::{Deserialize, Serialize};
use serde_json::json;
//the ai calling controller
//will use reqwest

//the value struct
#[derive(Deserialize, Debug)]
pub struct RequestBody {
    value: String,
}

#[post("/query")]
async fn getResponse(data: web::Json<RequestBody>) -> impl Responder {
    //call the ollama instance
    let url = "http:://localhost:11434/api/generate";

    let client = reqwest::Client::new();

    let message_val = data.value;

    //create the json payload
    let payload = json!({
        "model" : "qwen 3",
        "message" : message_val,
        "stream": false,
        "format":"json"
    });

    HttpResponse::new(200).body();
}
