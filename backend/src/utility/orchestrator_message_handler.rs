use crate::controllers::ai_controller::{RequestBody, get_ai_response};
use crate::database::establish_connection;
use crate::database::model::DbUser;
use crate::database::model_functions::{
    get_user_info,
    ledger_model_function::record_transfer_and_update_amounts,
    user_model_function::{
        UpdateUserLedgerRequest, UserInfoRequest, UserInfoResponse, get_transaction_history,
    },
};
use crate::utility::{
    ServerMessage, AssistantMessagePayload, ErrorPayload,
    get_user_ata_balance, transfer_to_vault,
};
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
pub async fn handle_user_message(user_message: String, user_id: i32, stream: &Session) {
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

    // NOTE: Box::leak creates a 'static reference – this leaks memory per request.
    // Consider refactoring later to use owned values or Arc, but keeping it for now
    // to match the existing pattern in the codebase.
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
                    send_error(
                        stream,
                        &format!("Failed to check your balance: {}", e),
                    )
                    .await;
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
                    send_error(
                        stream,
                        &format!("Recipient not found: {}", err),
                    )
                    .await;
                    return;
                }
                _ => {
                    send_error(stream, "Unexpected response while looking up recipient").await;
                    return;
                }
            };

            // 4c. Execute on-chain transfer
            let transfer_response = transfer_to_vault(
                user_info_ref.unique_id.to_string(),
                amount,
            );

            match transfer_response {
                Ok(transfer_response) => {
                    if transfer_response.success {
                        // 4d. Record in DB atomically
                        let conn = &mut establish_connection();
                        let result = record_transfer_and_update_amounts(
                            conn,
                            user_info_ref.id,
                            recipient.userid,
                            amount as i64,
                            response.currency.clone().unwrap_or("USDC".to_string()),
                            None, // tx_signature — add on-chain sig here when available
                        );

                        match result {
                            Ok(transfer_result) => {
                                let msg = format!(
                                    "Transfer successful! Sent {} {} — your new balance is {}",
                                    amount,
                                    response.currency.clone().unwrap_or("USDC".to_string()),
                                    transfer_result.sender_new_balance
                                );
                                send_message(stream, &msg).await;
                            }
                            Err(db_err) => {
                                println!("[transfer] DB error: {}", db_err);
                                send_error(
                                    stream,
                                    &format!(
                                        "Transfer was sent on-chain but failed to record in database: {}",
                                        db_err
                                    ),
                                )
                                .await;
                            }
                        }
                    } else {
                        send_error(stream, "On-chain transfer did not succeed").await;
                    }
                }
                Err(err) => {
                    println!("error sending transaction: {}", err);
                    send_error(
                        stream,
                        &format!("Transaction failed: {}", err),
                    )
                    .await;
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

//handle user message function
pub fn handle_action_response() {}
