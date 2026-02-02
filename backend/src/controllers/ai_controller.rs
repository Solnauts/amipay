use actix_web::{HttpResponse, Responder, post, web};
use reqwest::{self, Client};
use serde::{Deserialize, Serialize};
use serde_json::json;

use tokio;
//the ai calling controller
//will use reqwest

//the value struct
#[derive(Debug, Serialize, Deserialize)]
pub struct RequestBody {
    value: String,
}

#[post("/query")]
async fn get_response(data: web::Json<RequestBody>) -> impl Responder {
    //call the ollama instance
    let url = "http://localhost:11434/api/generate";

    let client = reqwest::Client::new();

    let message_val = &data.value;

    //create the json payload
    let payload = json!({
        "model" : "qwen3:4b",
        "prompt" : message_val,
        "stream": false,
        "format":"json"
    });

    let response = ai_api_call(payload.to_string(), client, url.to_string()).unwrap();
    HttpResponse::Ok().body(response)
}

#[tokio::main]
async fn ai_api_call(
    payload: String,
    client: Client,
    url: String,
) -> Result<String, reqwest::Error> {
    let res = client.post(url).body(payload).send().await?.text().await?;
    Ok(res)
}
