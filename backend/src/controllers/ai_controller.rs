use actix_web::{HttpResponse, Responder, post, web};
use reqwest::{self, Client};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::time::Duration;

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
    done_reason: String,
    context: Vec<u64>,
    total_duration: u64,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct MainResponse {
    intent: String,
    amount: Option<u64>,
    currency: Option<String>,
    recipient: Option<String>,
    history_limit: Option<u64>,
}

#[post("/query")]
async fn get_response(data: web::Json<RequestBody>) -> impl Responder {
    println!("the response is received");

    //call the ollama instance
    let url = "http://localhost:11434/api/generate";

    let client = reqwest::Client::builder()
        .timeout(Duration::from_mins(2))
        .build()
        .unwrap();

    let message_val = &data.value;

    //create the json payload
    let payload = json!({
        "model" : "bank_agent",
        "prompt" : message_val,
        "stream": false,
    });

    let response = client
        .post(url)
        .header("Content_Type", "application/json")
        .body(payload.to_string())
        .send()
        .await
        .unwrap()
        .text()
        .await
        .unwrap();

    println!("the response is : {}", response);

    if response.contains("transaction_history") {}
    let outer_response: AiResponse = serde_json::from_str(&response).unwrap();
    let main_response: MainResponse = serde_json::from_str(&outer_response.response).unwrap();

    println!("the response is : {:?}", main_response);
    HttpResponse::Ok().json(main_response)
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
