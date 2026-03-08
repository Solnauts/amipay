use crate::errors::AiError;
use reqwest::{self};
use serde::{Deserialize, Serialize};
use std::time::Duration;

//the request struct
#[derive(Debug, Serialize, Deserialize)]
pub struct RequestBody {
    pub value: String,
}

/// The system prompt that tells the AI model how to behave.
/// This was previously baked into the Ollama Modelfile; now it's
/// sent as the `system` message in every API call.
const SYSTEM_PROMPT: &str = r#"You are a Banking Transaction Parser. You are NOT a chatbot.
You do not answer questions. You do not explain yourself.
Your ONLY job is to extract transaction details and output strictly valid JSON.

You must output a single JSON object containing ALL the following fields. Set fields to null if they do not apply to the specific request.

STRICT JSON SCHEMA:
{
  "intent": "transfer" | "check_balance" | "transaction_history" | "unknown",
  "amount": number or null,
  "currency": string (default "USDC") or null,
  "recipient": string or null,
  "history_limit": number or null (e.g., "last 5 transactions" -> 5),
  "time_period": string or null (e.g., "last week" -> "7d")
}

RULES:
1. For TRANSFER requests: Fill 'amount', 'currency', 'recipient'. Set history fields to null.
2. For HISTORY requests: Fill 'history_limit' or 'time_period'. Set amount/recipient to null.
3. If the user just says "Show history" without a number, default 'history_limit' to 5.
4. Convert slang like "bucks", "quid" to currency codes.
5. Do not output markdown code blocks. Just the raw JSON string.
6. If the user input is too vague, set fields to null.
7. If a name appears to have spaces scattered between individual characters (e.g. "Ma t t", "J o h n", "A l i c e"), collapse them into a single word by removing those extra spaces (e.g. "Matt", "John", "Alice") before setting the 'recipient' field."#;

// ── OpenAI-compatible API types ─────────────────────────────────────────

#[derive(Debug, Serialize)]
struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Debug, Serialize)]
struct ChatCompletionRequest {
    model: String,
    messages: Vec<ChatMessage>,
    temperature: f32,
}

#[derive(Debug, Deserialize)]
struct ChatCompletionResponse {
    choices: Vec<ChatChoice>,
}

#[derive(Debug, Deserialize)]
struct ChatChoice {
    message: ChatResponseMessage,
}

#[derive(Debug, Deserialize)]
struct ChatResponseMessage {
    content: String,
}

// ── Public response type (unchanged — rest of codebase depends on this) ─

#[derive(Debug, Deserialize, Serialize)]
pub struct MainResponse {
    pub intent: String,
    pub amount: Option<u64>,
    pub currency: Option<String>,
    pub recipient: Option<String>,
    pub history_limit: Option<u64>,
}

/// Call the cloud AI API (OpenAI-compatible) and parse the response.
///
/// Reads two env vars:
///   - `AI_API_KEY`      — Bearer token for the API
///   - `AI_BASE_URL`     — (optional) base URL, defaults to OpenAI
///   - `AI_MODEL`        — (optional) model name, defaults to gpt-4o-mini
///
/// Returns a typed `AiError` instead of panicking.
pub async fn get_ai_response(data: RequestBody) -> Result<MainResponse, AiError> {
    // ── Read config from env ────────────────────────────────────────────
    let api_key = std::env::var("AI_API_KEY").map_err(|_| AiError::ClientBuildFailed {
        reason: "AI_API_KEY env var is not set".to_string(),
    })?;

    let base_url =
        std::env::var("AI_BASE_URL").unwrap_or_else(|_| "https://api.deepseek.com".to_string());

    let model = std::env::var("AI_MODEL").unwrap_or_else(|_| "deepseek-chat".to_string());

    let url = format!("{}/chat/completions", base_url);

    // ── Build HTTP client ───────────────────────────────────────────────
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|e| AiError::ClientBuildFailed {
            reason: e.to_string(),
        })?;

    // ── Construct messages (system prompt + user message) ────────────────
    let payload = ChatCompletionRequest {
        model,
        messages: vec![
            ChatMessage {
                role: "system".to_string(),
                content: SYSTEM_PROMPT.to_string(),
            },
            ChatMessage {
                role: "user".to_string(),
                content: data.value,
            },
        ],
        temperature: 0.0,
    };

    // ── Send request ────────────────────────────────────────────────────
    let response_text = client
        .post(&url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&payload)
        .send()
        .await
        .map_err(|e| AiError::RequestFailed {
            reason: e.to_string(),
        })?
        .text()
        .await
        .map_err(|e| AiError::RequestFailed {
            reason: format!("failed to read response body: {}", e),
        })?;

    // ── Parse the chat completion envelope ───────────────────────────────
    let chat_response: ChatCompletionResponse =
        serde_json::from_str(&response_text).map_err(|e| AiError::ResponseParseFailed {
            reason: format!(
                "could not parse chat completion response: {} | body: {}",
                e, response_text
            ),
        })?;

    let ai_content = chat_response
        .choices
        .first()
        .ok_or_else(|| AiError::ResponseParseFailed {
            reason: "API returned zero choices".to_string(),
        })?
        .message
        .content
        .clone();

    // ── Strip markdown code fences if the model wraps its output ────────
    let cleaned = strip_code_fences(&ai_content);

    // ── Parse the inner JSON into our MainResponse ──────────────────────
    let main_response: MainResponse =
        serde_json::from_str(&cleaned).map_err(|e| AiError::IntentParseFailed {
            raw_response: ai_content.clone(),
            reason: e.to_string(),
        })?;

    Ok(main_response)
}

/// Some models wrap their JSON in ```json ... ``` fences despite being
/// told not to.  This helper strips them so serde_json can parse cleanly.
fn strip_code_fences(input: &str) -> String {
    let trimmed = input.trim();
    if trimmed.starts_with("```") {
        // Remove opening fence (```json or ```)
        let after_opening = if let Some(pos) = trimmed.find('\n') {
            &trimmed[pos + 1..]
        } else {
            trimmed
        };
        // Remove closing fence
        let without_closing = after_opening.trim_end().trim_end_matches("```");
        without_closing.trim().to_string()
    } else {
        trimmed.to_string()
    }
}
