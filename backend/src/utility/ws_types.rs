//create enums for the orchestrator
use serde::{Deserialize, Serialize};
use solana_sdk::signature::Signature;

#[derive(Deserialize, Serialize)]
pub enum ClientMessage {
    UserMessage(UserMessagePayload),
    ActionResponse(ActionResponsePayload),
}

#[derive(Deserialize, Serialize)]
pub struct UserMessagePayload {
    pub conversation_id: Option<String>,
    pub content: String,
}

#[derive(Deserialize, Serialize)]
pub struct ActionResponsePayload {
    pub conversation_id: i32,
    pub pending_action_id: i32,
    pub response: String,
}

#[derive(Deserialize, Serialize)]
pub enum ServerMessage {
    AssistanceMessage(AssistantMessagePayload),
    Error(ErrorPayload),
}

#[derive(Deserialize, Serialize)]
pub struct AssistantMessagePayload {
    pub conversation_id: i32,
    pub pending_action_id: Option<i32>,
    pub task: String,
    pub action_buttons: Option<String>,
}

#[derive(Deserialize, Serialize)]
pub struct TransactionPayload {
    pub transaction_result: bool,
    pub signature: Signature,
}

#[derive(Deserialize, Serialize)]
pub struct ErrorPayload {
    pub conversation_id: i32,
    pub pending_action_id: Option<i32>,
    pub error_message: String,
}
