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
    pub conversation_id: String,
    pub pending_action_id: String,
}

#[derive(Deserialize, Serialize)]
pub enum ServerMessage {
    AssistantMessage(AssistantMessagePayload),
    TxStatus(TransactionPayload),
    Error(ErrorPayload),
}

#[derive(Deserialize, Serialize)]
pub struct AssistantMessagePayload {
    pub reply_text: String,
    pub action_buttons: Option<String>,
}

#[derive(Deserialize, Serialize)]
pub struct TransactionPayload {
    pub transaction_result: bool,
    pub signature: Signature,
}

#[derive(Deserialize, Serialize)]
pub struct ErrorPayload {
    pub error_message: String,
}
