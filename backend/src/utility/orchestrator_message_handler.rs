use crate::controllers::ai_controller::{RequestBody, get_ai_response};
use crate::database::establish_connection;
use crate::database::model::{DbUser, PendingActionPayload};
use crate::database::model_functions::get_pending_action_by_id;
use crate::database::model_functions::{
    get_user_info,
    ledger_model_function::record_transfer_and_update_amounts,
    pending_action_model_function::{
        build_pin_verify_payload, create_pending_action, update_pending_action_status,
    },
    user_model_function::{
        UserInfoRequest, UserInfoResponse, get_transaction_history, match_user_pin,
    },
};
use crate::errors::{AppError, AuthError, DbError, ValidationError};
use crate::utility::{
    ActionResponsePayload, AssistantMessagePayload, ErrorPayload, ServerMessage,
    get_user_ata_balance, transfer_to_vault,
};
use actix_ws::{CloseCode, CloseReason, Session};

/// USDC uses 6 decimal places: 1 USDC = 1_000_000 micro-USDC.
const USDC_DECIMALS: u64 = 1_000_000;

// ── WebSocket helpers ────────────────────────────────────────────────────

async fn send_app_error(
    session: &Session,
    err: AppError,
    conversation_id: i32,
    pending_action_id: Option<i32>,
) {
    eprintln!("{}", err.log_message());
    let payload = ServerMessage::Error(ErrorPayload::from_app_error(
        &err,
        conversation_id,
        pending_action_id,
    ));
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
        conversation_id,
        pending_action_id,
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

// ══════════════════════════════════════════════════════════════════════════
//  handle_user_message  —  process a free-text user message
// ══════════════════════════════════════════════════════════════════════════

pub async fn handle_user_message(
    user_message: String,
    user_id: i32,
    stream: &Session,
    conversation_id: i32,
) {
    let mut db_connection = match establish_connection() {
        Ok(conn) => conn,
        Err(e) => {
            send_app_error(stream, e.into(), conversation_id, None).await;
            return;
        }
    };

    // 1. Deserialize the incoming WS message
    let serialized_message = match serde_json::from_str::<RequestBody>(&user_message) {
        Ok(msg) => msg,
        Err(e) => {
            send_app_error(
                stream,
                ValidationError::MalformedMessage {
                    reason: e.to_string(),
                }
                .into(),
                conversation_id,
                None,
            )
            .await;
            return;
        }
    };

    // 2. Load user profile from DB
    let request_payload = UserInfoRequest {
        intent: "user_info".to_string(),
        user_id,
        recipient_name: None,
    };

    let user_info = match get_user_info(request_payload) {
        Ok(UserInfoResponse::FullInfo(info)) => info,
        Ok(_) => {
            send_app_error(
                stream,
                DbError::UnexpectedResult {
                    context: "get_user_info returned non-FullInfo variant".to_string(),
                }
                .into(),
                conversation_id,
                None,
            )
            .await;
            return;
        }
        Err(e) => {
            send_app_error(stream, e, conversation_id, None).await;
            return;
        }
    };

    // 3. Call AI to parse intent (transfer, check_balance, etc.)
    let intent_response = match get_ai_response(serialized_message).await {
        Ok(resp) => {
            println!("AI response: {:?}", resp);
            resp
        }

        Err(e) => {
            send_app_error(stream, e.into(), conversation_id, None).await;
            return;
        }
    };

    // NOTE: Box::leak creates a 'static reference — matches existing codebase pattern.
    let intent_result = Box::leak(Box::new(intent_response));
    let user_info_ref: &'static DbUser = Box::leak(Box::new(user_info));

    // 4. Route by intent
    match intent_result {
        // ── Transfer ─────────────────────────────────────────────────
        response if response.intent == "transfer" => {
            // 4a. Extract amount — AI returns human-readable dollars,
            //     convert to micro-USDC (6 decimals) for on-chain + ledger.
            let human_amount = match response.amount {
                Some(amt) => amt,
                None => {
                    send_app_error(
                        stream,
                        ValidationError::MissingField {
                            field: "amount".to_string(),
                        }
                        .into(),
                        conversation_id,
                        None,
                    )
                    .await;
                    return;
                }
            };
            let amount = human_amount * USDC_DECIMALS;

            // 4b. Look up recipient (cheap DB call before hitting Solana RPC)
            let request_payload = UserInfoRequest {
                intent: "recipient".to_string(),
                user_id,
                recipient_name: response.recipient.clone(),
            };

            let recipient = match get_user_info(request_payload) {
                Ok(UserInfoResponse::Recipient(r)) => r,
                Ok(_) => {
                    send_app_error(
                        stream,
                        DbError::UnexpectedResult {
                            context: "get_user_info returned non-Recipient variant".to_string(),
                        }
                        .into(),
                        conversation_id,
                        None,
                    )
                    .await;
                    return;
                }
                Err(e) => {
                    send_app_error(stream, e, conversation_id, None).await;
                    return;
                }
            };

            // 4c. Verify on-chain balance via spawn_blocking (Solana RPC is blocking I/O)
            // Use the stored ATA pubkey directly from the user table instead of
            // re-deriving from unique_id. get_user_ata_balance now calls
            // get_token_account_balance (real USDC amount), not get_balance (SOL lamports).
            let user_ata_pubkey = match user_info_ref.user_usdc_ata.clone() {
                Some(ata) => ata,
                None => {
                    send_app_error(
                        stream,
                        AppError::Internal {
                            code: 5030,
                            reason: format!(
                                "user_usdc_ata not set for user_id={}; ATA may not have been initialized yet",
                                user_info_ref.id
                            ),
                        },
                        conversation_id,
                        None,
                    )
                    .await;
                    return;
                }
            };
            let balance_result =
                tokio::task::spawn_blocking(move || get_user_ata_balance(user_ata_pubkey, amount))
                    .await;

            match balance_result {
                Ok(Ok(balance_response)) => {
                    if !balance_response.success {
                        send_app_error(
                            stream,
                            ValidationError::InsufficientBalance {
                                requested: amount as i64,
                                available: balance_response.amount as i64,
                            }
                            .into(),
                            conversation_id,
                            None,
                        )
                        .await;
                        return;
                    }
                }
                Ok(Err(e)) => {
                    send_app_error(stream, e.into(), conversation_id, None).await;
                    return;
                }
                Err(join_err) => {
                    send_app_error(
                        stream,
                        AppError::Internal {
                            code: 5020,
                            reason: format!("balance check task failed: {}", join_err),
                        },
                        conversation_id,
                        None,
                    )
                    .await;
                    return;
                }
            }

            // 4d. Create pending_action for PIN verification
            let currency = response.currency.clone().unwrap_or("USDC".to_string());

            let payload = build_pin_verify_payload(
                amount as f64,
                &currency,
                recipient.recipient_user_id,
                &recipient.alias_used,
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
                    send_message(
                        stream,
                        "Please enter your PIN to confirm",
                        conversation_id,
                        Some(pending_action.id),
                    )
                    .await;
                    println!(
                        "[transfer] pending_action id={} created for user={}",
                        pending_action.id, user_info_ref.id
                    );
                }
                Err(e) => {
                    send_app_error(stream, e.into(), conversation_id, None).await;
                }
            }
        }

        // ── Check Balance ────────────────────────────────────────────
        s if s.intent == "check_balance" => {
            let request_payload = UserInfoRequest {
                intent: "amount".to_string(),
                user_id,
                recipient_name: None,
            };

            match get_user_info(request_payload) {
                Ok(UserInfoResponse::NUmber(amount)) => {
                    let msg = format!("Your current balance is: {}", amount);
                    send_message(stream, &msg, conversation_id, None).await;
                }
                Ok(_) => {
                    send_app_error(
                        stream,
                        DbError::UnexpectedResult {
                            context: "get_user_info returned non-Number variant for balance"
                                .to_string(),
                        }
                        .into(),
                        conversation_id,
                        None,
                    )
                    .await;
                }
                Err(e) => {
                    send_app_error(stream, e, conversation_id, None).await;
                }
            }
        }

        // ── Transaction History ──────────────────────────────────────
        s if s.intent == "transaction_history" => {
            let limit = 10;

            match get_transaction_history(user_id, limit) {
                Ok(value) => match serde_json::to_string(&value) {
                    Ok(json) => {
                        send_message(stream, &json, conversation_id, None).await;
                    }
                    Err(e) => {
                        send_app_error(
                            stream,
                            AppError::Internal {
                                code: 5500,
                                reason: format!("serialization failed: {}", e),
                            },
                            conversation_id,
                            None,
                        )
                        .await;
                    }
                },
                Err(e) => {
                    send_app_error(stream, e, conversation_id, None).await;
                }
            }
        }

        // ── Unknown intent ───────────────────────────────────────────
        _ => {
            send_app_error(
                stream,
                ValidationError::InvalidIntent {
                    intent: "unknown".to_string(),
                }
                .into(),
                conversation_id,
                None,
            )
            .await;
            close_with_reason(stream, CloseCode::Policy, "invalid request detected").await;
        }
    }
}

// ══════════════════════════════════════════════════════════════════════════
//  handle_action_response  —  process a user's action (e.g. PIN entry)
// ══════════════════════════════════════════════════════════════════════════

pub async fn handle_action_response(action_response: ActionResponsePayload, stream: Session) {
    let ActionResponsePayload {
        conversation_id,
        pending_action_id,
        response,
    } = action_response;

    let mut db_connection = match establish_connection() {
        Ok(conn) => conn,
        Err(e) => {
            send_app_error(&stream, e.into(), conversation_id, Some(pending_action_id)).await;
            return;
        }
    };

    let main_result = match get_pending_action_by_id(&mut db_connection, pending_action_id) {
        Ok(Some(result)) => result,
        Ok(None) => {
            send_app_error(
                &stream,
                DbError::PendingActionNotFound {
                    action_id: pending_action_id,
                }
                .into(),
                conversation_id,
                Some(pending_action_id),
            )
            .await;
            return;
        }
        Err(e) => {
            send_app_error(&stream, e.into(), conversation_id, Some(pending_action_id)).await;
            return;
        }
    };

    let task = main_result.action_type;

    match task.as_str() {
        "pin_verify" => {
            // Verify the user's PIN
            let pin_valid = match match_user_pin(main_result.user_id, response) {
                Ok(is_valid) => is_valid,
                Err(e) => {
                    send_app_error(&stream, e, conversation_id, Some(pending_action_id)).await;
                    return;
                }
            };

            if !pin_valid {
                send_app_error(
                    &stream,
                    AuthError::InvalidPin.into(),
                    conversation_id,
                    Some(pending_action_id),
                )
                .await;
                return;
            }

            // Fetch the sender's unique_id for the on-chain transfer
            let request_payload = UserInfoRequest {
                user_id: main_result.user_id,
                intent: "unique_id".to_string(),
                recipient_name: None,
            };

            let unique_id = match get_user_info(request_payload) {
                Ok(UserInfoResponse::UniqueId(info)) => info,
                Ok(_) => {
                    send_app_error(
                        &stream,
                        DbError::UnexpectedResult {
                            context: "get_user_info returned non-UniqueId variant".to_string(),
                        }
                        .into(),
                        conversation_id,
                        Some(pending_action_id),
                    )
                    .await;
                    return;
                }
                Err(e) => {
                    send_app_error(&stream, e, conversation_id, Some(pending_action_id)).await;
                    return;
                }
            };

            // Deserialize the pending action payload
            let parsed_payload: PendingActionPayload =
                match serde_json::from_value(main_result.payload) {
                    Ok(p) => p,
                    Err(e) => {
                        send_app_error(
                            &stream,
                            DbError::UnexpectedResult {
                                context: format!("payload deserialization failed: {}", e),
                            }
                            .into(),
                            conversation_id,
                            Some(pending_action_id),
                        )
                        .await;
                        return;
                    }
                };

            match parsed_payload {
                PendingActionPayload::PinVerify {
                    amount,
                    currency,
                    recipient_id,
                    recipient_name,
                    sender_unique_id: _,
                } => {
                    // Look up the recipient's unique_id from the user table
                    let recipient_info_request = UserInfoRequest {
                        user_id: recipient_id,
                        intent: "unique_id".to_string(),
                        recipient_name: None,
                    };

                    let receiver_unique_id = match get_user_info(recipient_info_request) {
                        Ok(UserInfoResponse::UniqueId(rid)) => rid,
                        Ok(_) => {
                            send_app_error(
                                &stream,
                                DbError::UnexpectedResult {
                                    context:
                                        "get_user_info returned non-UniqueId variant for recipient"
                                            .to_string(),
                                }
                                .into(),
                                conversation_id,
                                Some(pending_action_id),
                            )
                            .await;
                            return;
                        }
                        Err(e) => {
                            send_app_error(&stream, e, conversation_id, Some(pending_action_id))
                                .await;
                            return;
                        }
                    };

                    // Execute on-chain transfer via spawn_blocking
                    // (transfer_to_vault uses #[tokio::main] internally)
                    let transfer_result = tokio::task::spawn_blocking(move || {
                        transfer_to_vault(unique_id, receiver_unique_id, amount as u64)
                    })
                    .await;

                    match transfer_result {
                        Ok(Ok(value)) => {
                            if value.success {
                                // Record in ledger + recalculate balances
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
                                        let _ = update_pending_action_status(
                                            &mut db_connection,
                                            pending_action_id,
                                            "confirmed",
                                        );

                                        // Convert micro-USDC → human-readable for display
                                        let display_amount = amount / USDC_DECIMALS as f64;
                                        let display_balance = transfer_record.sender_new_balance
                                            as f64
                                            / USDC_DECIMALS as f64;
                                        let msg = format!(
                                            "✅ Transfer of {} {} to {} successful! Your new balance: {}",
                                            display_amount,
                                            currency,
                                            recipient_name,
                                            display_balance
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
                                        // CRITICAL: on-chain succeeded but DB failed
                                        let err = AppError::OnChainSuccessDbFailed {
                                            user_id: main_result.user_id,
                                            amount: amount as i64,
                                            reason: db_err.to_string(),
                                        };
                                        send_app_error(
                                            &stream,
                                            err,
                                            conversation_id,
                                            Some(pending_action_id),
                                        )
                                        .await;
                                    }
                                }
                            } else {
                                send_app_error(
                                    &stream,
                                    AppError::Internal {
                                        code: 5103,
                                        reason: "on-chain transfer returned success=false"
                                            .to_string(),
                                    },
                                    conversation_id,
                                    Some(pending_action_id),
                                )
                                .await;
                            }
                        }
                        Ok(Err(solana_err)) => {
                            send_app_error(
                                &stream,
                                solana_err.into(),
                                conversation_id,
                                Some(pending_action_id),
                            )
                            .await;
                        }
                        Err(join_err) => {
                            send_app_error(
                                &stream,
                                AppError::Internal {
                                    code: 5021,
                                    reason: format!("transfer task failed: {}", join_err),
                                },
                                conversation_id,
                                Some(pending_action_id),
                            )
                            .await;
                        }
                    }
                }
                _ => {
                    send_app_error(
                        &stream,
                        DbError::UnexpectedResult {
                            context: "expected PinVerify payload variant".to_string(),
                        }
                        .into(),
                        conversation_id,
                        Some(pending_action_id),
                    )
                    .await;
                }
            }
        }

        _ => {
            send_app_error(
                &stream,
                DbError::UnexpectedResult {
                    context: format!("unknown action_type: {}", task),
                }
                .into(),
                conversation_id,
                Some(pending_action_id),
            )
            .await;
        }
    }
}
