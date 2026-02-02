use actix_web::{HttpResponse, Responder, post, web};
use reqwest::{self, Client};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::{thread, time::Duration};

use tokio;
//the ai calling controller
//will use reqwest

//the value struct
#[derive(Debug, Serialize, Deserialize)]
pub struct RequestBody {
    value: String,
}

#[derive(Deserialize, Debug)]
pub struct AiResponse {
    model: String,
    created_at: String,
    response: String,
    //critical this must bea string
    thinking: String,
    done: bool,
    context: Vec<u64>,
    total_duration: u64,
}

#[derive(Deserialize, Debug)]
struct InnerThinking {
    input: String,
    task: String,
    output: InnerOutput,
}

#[derive(Deserialize, Debug)]
struct InnerOutput {
    title: String,
    content: String,
}

#[post("/query")]
async fn get_response(data: web::Json<RequestBody>) -> impl Responder {
    println!("the response is received");

    //call the ollama instance
    let url = "http://localhost:11434/api/generate";

    let client = reqwest::Client::builder()
        .timeout(Duration::from_mins(1))
        .build()
        .unwrap();

    let message_val = &data.value;

    //create the json payload
    let payload = json!({
        "model" : "qwen3:4b",
        "prompt" : message_val,
        "stream": false,
        "format":"json"
    });

    let response = client
        .post(url)
        .body(payload.to_string())
        .send()
        .await
        .unwrap()
        .text()
        .await
        .unwrap();

    println!("the response is : {}", response.to_string());
    HttpResponse::Ok().body("response received")
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
