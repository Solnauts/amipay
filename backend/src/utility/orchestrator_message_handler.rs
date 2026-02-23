use crate::controllers::ai_controller::{RequestBody, get_ai_response};
use crate::database::establish_connection;
use crate::database::model::DbUser;
use crate::database::model_functions::{
    get_user_info,
    pending_action_model_function::{
        build_pin_verify_payload, build_transfer_confirm_payload, create_pending_action,
    },
    user_model_function::{UserInfoRequest, UserInfoResponse, get_transaction_history},
};
use crate::utility::{AssistantMessagePayload, ErrorPayload, ServerMessage, get_user_ata_balance};
use actix_ws::{CloseCode, CloseReason, Session};

// ── Helper: send a JSON text frame to client ────────────────────────────
async fn send_error(session: &Session, message: &str) {
    let payload = ServerMessage::Error(ErrorPayload {
        error_message: message.to_string(),
    });
    if let Ok(json) = serde_json::to_string(&payload) {
        let _ = session.clone().text(json).await;
    }
}

async fn send_message(session: &Session, text: &str) {
    let payload = ServerMessage::AssistantMessage(AssistantMessagePayload {
        reply_text: text.to_string(),
        action_buttons: None,
    });
    if let Ok(json) = serde_json::to_string(&payload) {
        let _ = session.clone().text(json).await;
    }
}

async fn close_with_reason(session: &Session, code: CloseCode, description: &str) {
    let reason = CloseReason {
        code,
        description: Some(description.to_string()),
    };
    let _ = session.clone().close(Some(reason)).await;
}

// ──────────────────────────────────────────────────────────────────────────
// Main handler – every error branch sends a message over the stream
// instead of silently returning or panicking.
// ──────────────────────────────────────────────────────────────────────────
pub async fn handle_user_message(
    user_message: String,
    user_id: i32,
    stream: &Session,
    conversation_id: i32,
) {
    // Open a mutable DB connection for this request
    let mut db_connection = establish_connection();

    // 1. Deserialize incoming message — tell the client if it's bad JSON
    let serialized_message = match serde_json::from_str::<RequestBody>(&user_message) {
        Ok(msg) => msg,
        Err(e) => {
            send_error(stream, &format!("Invalid message format: {}", e)).await;
            return;
        }
    };

    // 2. Fetch user info from DB
    let request_payload = UserInfoRequest {
        intent: "user_info".to_string(),
        user_id,
        recipient_name: None,
    };

    let user_info = get_user_info(request_payload);

    let user_info = match user_info {
        UserInfoResponse::FullInfo(info) => info,
        UserInfoResponse::Error(err) => {
            send_error(stream, &format!("Failed to load user info: {}", err)).await;
            return;
        }
        _ => {
            send_error(stream, "Unexpected response while loading user info").await;
            return;
        }
    };

    // 3. Get AI intent
    let intent_response = get_ai_response(serialized_message).await;

    // NOTE: Box::leak creates a 'static reference – this leaks memory per request. to match the existing pattern in the codebase.
    let intent_result = Box::leak(Box::new(intent_response));
    let user_info_ref: &'static DbUser = Box::leak(Box::new(user_info));
    // 4. Route by intent
    match intent_result {
        // ── Transfer ─────────────────────────────────────────────────
        response if response.intent == "transfer" => {
            println!("user wants to send money");

            // 4a. Check balance
            let amount = match response.amount {
                Some(amt) => amt,
                None => {
                    send_error(stream, "Transfer amount is missing from AI response").await;
                    return;
                }
            };

            match get_user_ata_balance(user_info_ref.unique_id.to_string(), amount).await {
                Ok(balance_response) => {
                    if !balance_response.success {
                        let issue = balance_response
                            .issue
                            .unwrap_or("Insufficient balance".to_string());
                        send_error(stream, &issue).await;
                        return;
                    }
                }
                Err(e) => {
                    send_error(stream, &format!("Failed to check your balance: {}", e)).await;
                    return;
                }
            }

            // 4b. Look up recipient
            let request_payload = UserInfoRequest {
                intent: "recipient".to_string(),
                user_id,
                recipient_name: response.recipient.clone(),
            };

            let recipient_info = get_user_info(request_payload);

            let recipient = match recipient_info {
                UserInfoResponse::Recipient(r) => r,
                UserInfoResponse::Error(err) => {
                    send_error(stream, &format!("Recipient not found: {}", err)).await;
                    return;
                }
                _ => {
                    send_error(stream, "Unexpected response while looking up recipient").await;
                    return;
                }
            };

            // 4c. Build payload and create pending_action — then STOP.
            //     The actual transfer happens in handle_action_response
            //     after the user confirms + provides PIN.
            let currency = response.currency.clone().unwrap_or("USDC".to_string());

            let payload = build_pin_verify_payload(
                amount as f64,
                &currency,
                recipient.id,
                &recipient.name,
                &user_info_ref.unique_id,
            );

            match create_pending_action(
                &mut db_connection,
                user_info_ref.id,
                conversation_id,
                "pin_verify",
                payload,
            ) {
                Ok(pending_action) => {
                    let msg = format!(
                        "Send {} {} to {}? Please enter your PIN to confirm.",
                        amount, currency, recipient.name
                    );
                    send_message(stream, &msg).await;
                    println!(
                        "[transfer] pending_action created: id={} for user={}",
                        pending_action.id, user_info_ref.id
                    );
                    // ── STOP HERE ──
                    // The flow continues in handle_action_response
                    // when the client sends ActionResponse with this pending_action.id
                    return;
                }
                Err(e) => {
                    send_error(stream, &format!("Failed to create confirmation: {}", e)).await;
                    return;
                }
            }
        }

        // ── Check Balance ────────────────────────────────────────────
        s if s.intent == "check_balance" => {
            println!("user wants to check the balance");

            let request_payload = UserInfoRequest {
                intent: "amount".to_string(),
                user_id,
                recipient_name: None,
            };
            let balance_info = get_user_info(request_payload);

            match balance_info {
                UserInfoResponse::NUmber(amount) => {
                    let msg = format!("Your current balance is: {}", amount);
                    send_message(stream, &msg).await;
                }
                UserInfoResponse::Error(err) => {
                    send_error(stream, &format!("Could not fetch balance: {}", err)).await;
                }
                _ => {
                    send_error(stream, "Unexpected response while checking balance").await;
                }
            }
        }

        // ── Transaction History ──────────────────────────────────────
        s if s.intent == "transaction_history" => {
            println!("user wants to see the transaction history");

            let number_of_transaction_limit = 10;

            let transaction_history_result =
                get_transaction_history(user_id, number_of_transaction_limit);

            match transaction_history_result {
                Ok(value) => {
                    // Serialize the ledger entry and send it to the client
                    match serde_json::to_string(&value) {
                        Ok(json) => {
                            send_message(stream, &json).await;
                        }
                        Err(e) => {
                            send_error(
                                stream,
                                &format!("Failed to serialize transaction history: {}", e),
                            )
                            .await;
                        }
                    }
                }
                Err(error) => {
                    send_error(
                        stream,
                        &format!("Failed to fetch transaction history: {}", error),
                    )
                    .await;
                }
            }
        }

        // ── Unknown intent → close the stream ───────────────────────
        _ => {
            println!("invalid request");
            send_error(stream, "Unrecognized intent — closing connection").await;
            close_with_reason(stream, CloseCode::Policy, "invalid request detected").await;
        }
    }
}

//handle user action response function
pub fn handle_action_response(conversation_id: i32, stream: Session) {
    //handle the things on the basis of the message we got
}
