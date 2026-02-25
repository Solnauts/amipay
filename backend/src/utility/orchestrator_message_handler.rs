use crate::controllers::ai_controller::{RequestBody, get_ai_response};
use crate::database::establish_connection;
use crate::database::model::{DbUser, PendingActionPayload};
use crate::database::model_functions::get_pending_action_by_id;
use crate::database::model_functions::{
    get_user_info,
    ledger_model_function::record_transfer_and_update_amounts,
    pending_action_model_function::{
        build_pin_verify_payload, build_transfer_confirm_payload, create_pending_action,
        update_pending_action_status,
    },
    user_model_function::{
        UserInfoRequest, UserInfoResponse, get_transaction_history, match_user_pin,
    },
};
use crate::utility::{
    ActionResponsePayload, AssistantMessagePayload, ErrorPayload, ServerMessage,
    get_user_ata_balance, transfer_to_vault,
};
use actix_ws::{CloseCode, CloseReason, Session};
use diesel::PgConnection;
// ── Helper: send a JSON text frame to client ────────────────────────────
async fn send_error(
    session: &Session,
    message: &str,
    conversation_id: i32,
    pending_action_id: Option<i32>,
) {
    let payload = ServerMessage::Error(ErrorPayload {
        conversation_id: conversation_id,
        pending_action_id: Some(pending_action_id.unwrap()),
        error_message: message.to_string(),
    });
    if let Ok(json) = serde_json::to_string(&payload) {
        let _ = session.clone().text(json).await;
    }
}

async fn send_message(
    session: &Session,
    text: &str,
    conversation_id: i32,
    pending_action_id: Option<i32>,
) {
    let payload = ServerMessage::AssistanceMessage(AssistantMessagePayload {
        conversation_id: conversation_id,
        pending_action_id: Some(pending_action_id.unwrap()),
        task: text.to_string(),
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
            send_error(
                stream,
                &format!("failed to receive instruction {}", e),
                conversation_id,
                None,
            )
            .await;
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

    //userinfo
    let user_info = match user_info {
        UserInfoResponse::FullInfo(info) => info,
        UserInfoResponse::Error(err) => {
            send_error(
                stream,
                &format!("Failed to load user info: {}", err),
                conversation_id,
                None,
            )
            .await;
            return;
        }
        _ => {
            send_error(
                stream,
                "Unexpected response while loading user",
                conversation_id,
                None,
            )
            .await;
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
                    send_error(stream, "Invalid amount instruction", conversation_id, None).await;
                    return;
                }
            };

            match get_user_ata_balance(user_info_ref.unique_id.to_string(), amount).await {
                Ok(balance_response) => {
                    if !balance_response.success {
                        let issue = balance_response
                            .issue
                            .unwrap_or("Insufficient balance".to_string());
                        send_error(stream, &issue, conversation_id, None).await;
                        return;
                    }
                }
                Err(e) => {
                    send_error(
                        stream,
                        &format!("Failed to check your balance: {}", e),
                        conversation_id,
                        None,
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
                        conversation_id,
                        None,
                    )
                    .await;
                    return;
                }
                _ => {
                    send_error(
                        stream,
                        "Unexpected response while looking up recipient",
                        conversation_id,
                        None,
                    )
                    .await;
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
                    let msg = "Please enter your PIN to confirm";

                    send_message(stream, &msg, conversation_id, Some(pending_action.id)).await;
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
                    send_error(stream, "Server Error", conversation_id, None).await;
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
                    send_message(stream, &msg, conversation_id, None).await;
                }
                UserInfoResponse::Error(err) => {
                    send_error(
                        stream,
                        &format!("Could not fetch balance: {}", err),
                        conversation_id,
                        None,
                    )
                    .await;
                }
                _ => {
                    send_error(
                        stream,
                        "Unexpected response while checking balance",
                        conversation_id,
                        None,
                    )
                    .await;
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
                            send_message(stream, &json, conversation_id, None).await;
                        }
                        Err(e) => {
                            send_error(
                                stream,
                                &format!("Failed to serialize transaction history: {}", e),
                                conversation_id,
                                None,
                            )
                            .await;
                        }
                    }
                }
                Err(error) => {
                    send_error(
                        stream,
                        &format!("Failed to fetch transaction history: {}", error),
                        conversation_id,
                        None,
                    )
                    .await;
                }
            }
        }

        // ── Unknown intent → close the stream ───────────────────────
        _ => {
            println!("invalid request");
            send_error(
                stream,
                "Unrecognized intent — closing connection",
                conversation_id,
                None,
            )
            .await;
            close_with_reason(stream, CloseCode::Policy, "invalid request detected").await;
        }
    }
}

//handle user action response function
pub async fn handle_action_response(action_response: ActionResponsePayload, stream: Session) {
    //handle the things on the basis of the message we got
    let ActionResponsePayload {
        conversation_id,
        pending_action_id,
        response,
    } = action_response;

    //create the db conection
    let mut db_connection = PgConnection::from(establish_connection());

    //get the current pending action on the basis of pending action id
    let pending_action_db_result = get_pending_action_by_id(&mut db_connection, pending_action_id);

    match pending_action_db_result {
        Ok(result) => {
            let main_result = result.unwrap();

            //read the task and take steps on the basis of that
            let task = main_result.action_type;

            match task {
                task if task == "pin_verify" => {
                    //take the response from the user
                    let userpin_check_result = match_user_pin(main_result.user_id, response);

                    if userpin_check_result.success == true {
                        //call the user pin
                        let request_payload = UserInfoRequest {
                            user_id: main_result.user_id,
                            intent: "unique_id".to_string(),
                            recipient_name: None,
                        };
                        let user_info = get_user_info(request_payload);
                        let unique_id = match user_info {
                            UserInfoResponse::UniqueId(info) => info,
                            UserInfoResponse::Error(err) => {
                                send_error(
                                    &stream,
                                    &format!("Failed to load user info: {}", err),
                                    conversation_id,
                                    None,
                                )
                                .await;
                                return;
                            }
                            _ => {
                                send_error(
                                    &stream,
                                    "Unexpected response while loading user",
                                    conversation_id,
                                    None,
                                )
                                .await;
                                return;
                            }
                        };

                        //how to exract the amount and other data from the payload
                        //already made the db and get main result
                        let parsed_payload: PendingActionPayload =
                            serde_json::from_value(main_result.payload).unwrap();
                        match parsed_payload {
                            PendingActionPayload::PinVerify {
                                amount,
                                currency,
                                recipient_id,
                                recipient_name,
                                sender_unique_id,
                            } => {
                                let transfer_result = transfer_to_vault(unique_id, amount as u64);

                                match transfer_result {
                                    Ok(value) => {
                                        if value.success {
                                            // 1. Record in ledger + update balances
                                            let ledger_result = record_transfer_and_update_amounts(
                                                &mut db_connection,
                                                main_result.user_id,
                                                recipient_id,
                                                amount as i64,
                                                currency.clone(),
                                                None,
                                            );

                                            match ledger_result {
                                                Ok(transfer_record) => {
                                                    // 2. Mark pending_action as confirmed
                                                    let _ = update_pending_action_status(
                                                        &mut db_connection,
                                                        pending_action_id,
                                                        "confirmed",
                                                    );

                                                    // 3. Send success message AFTER everything is done
                                                    let msg = format!(
                                                        "✅ Transfer of {} {} to {} successful! Your new balance: {}",
                                                        amount,
                                                        currency,
                                                        recipient_name,
                                                        transfer_record.sender_new_balance
                                                    );
                                                    send_message(
                                                        &stream,
                                                        &msg,
                                                        conversation_id,
                                                        Some(pending_action_id),
                                                    )
                                                    .await;
                                                }
                                                Err(db_err) => {
                                                    println!("[transfer] DB error: {}", db_err);
                                                    send_error(
                                                        &stream,
                                                        "Transfer sent on-chain but failed to record in database",
                                                        conversation_id,
                                                        Some(pending_action_id),
                                                    )
                                                    .await;
                                                }
                                            }
                                        } else {
                                            send_error(
                                                &stream,
                                                "On-chain transfer did not succeed",
                                                conversation_id,
                                                Some(pending_action_id),
                                            )
                                            .await;
                                        }
                                    }
                                    Err(err) => {
                                        println!("[transfer] on-chain error: {}", err);
                                        send_error(
                                            &stream,
                                            "Transaction failed on-chain",
                                            conversation_id,
                                            Some(pending_action_id),
                                        )
                                        .await;
                                    }
                                }
                            }
                            _ => {
                                //send the server error
                                send_error(
                                    &stream,
                                    "not getting the value",
                                    conversation_id,
                                    Some(pending_action_id),
                                )
                                .await;
                            }
                        }
                    } else {
                        //send the error
                        send_error(
                            &stream,
                            "invalid user_pin",
                            conversation_id,
                            Some(pending_action_id),
                        )
                        .await;
                    }
                }

                _ => {
                    send_error(
                        &stream,
                        "Server Error",
                        conversation_id,
                        Some(pending_action_id),
                    )
                    .await;
                }
            }
        }

        Err(error) => {
            send_error(
                &stream,
                "pending action id is incorrect",
                conversation_id,
                Some(pending_action_id),
            )
            .await;
        }
    }
}
