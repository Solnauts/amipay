use reqwest::{self};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::time::Duration;

//the request struct
#[derive(Debug, Serialize, Deserialize)]
pub struct RequestBody {
    pub value: String,
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
    pub intent: String,
    pub amount: Option<u64>,
    pub currency: Option<String>,
    pub recipient: Option<String>,
    pub history_limit: Option<u64>,
}

//change to this function that handle the Deserialized logic
//if remove the web::json then use one shoud serealize the response into the main RequestBody first
//then use it into the ai message
pub async fn get_ai_response(data: RequestBody) -> MainResponse {
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

    let outer_response: AiResponse = serde_json::from_str(&response).unwrap();
    let main_response: MainResponse = serde_json::from_str(&outer_response.response).unwrap();

    //return the main response
    main_response
}
