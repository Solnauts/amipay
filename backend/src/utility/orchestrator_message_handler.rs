//make the handle user message function
use crate::controllers::ai_controller::{RequestBody, get_ai_response};

pub async fn handle_user_message(user_message: String) {
    let serealized_message = serde_json::from_str::<RequestBody>(&user_message).unwrap();

    // call the existing ai controller
    let intent_response = get_ai_response(serealized_message).await;

    //extract the intent from the upper response
    match intent_response {
        s if s.intent == "send".to_string() => {
            println!("user want to send the message");
        }

        _ => {
            println!("invalid request");
        }
    }
}

//handle user message function
pub fn handle_action_response() {}

