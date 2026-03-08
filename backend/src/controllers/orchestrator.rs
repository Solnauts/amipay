use crate::controllers::wallet_controller::{extract_bearer_token, validate_session_token};
use crate::database::model_functions::conversation_model_function::create_conversation;
use crate::errors::{AppError, AuthError, ValidationError};
use crate::utility::orchestrator_message_handler::handle_user_message;
use crate::utility::ws_types::ClientMessage;
use crate::utility::{ErrorPayload, ServerMessage, handle_action_response};
use actix_web::{HttpRequest, Responder, web};
use actix_ws::Message;
use futures_util::StreamExt as _;

// ── Helper: send an AppError as a WS error frame ────────────────────────
async fn send_ws_error(
    session: &actix_ws::Session,
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

//web socket function
pub async fn main_caller(
    req: HttpRequest,
    body: web::Payload,
) -> actix_web::Result<impl Responder> {
    // Check the user is logged in — try Authorization header first, then ?token= query param
    let token = extract_bearer_token(&req).or_else(|_| {
        let query =
            web::Query::<std::collections::HashMap<String, String>>::from_query(req.query_string())
                .map_err(|_| AppError::Auth(AuthError::MissingSessionCookie))?;
        query
            .get("token")
            .cloned()
            .ok_or(AppError::Auth(AuthError::MissingSessionCookie))
    })?;

    let claims = validate_session_token(&token).map_err(|e| {
        AppError::Auth(AuthError::InvalidToken {
            reason: e.to_string(),
        })
    })?;

    let user_id = claims.sub.parse::<i32>().map_err(|_| {
        AppError::Auth(AuthError::InvalidUserId {
            raw: claims.sub.clone(),
        })
    })?;

    // Upgrade to WebSocket connection
    let (response, session, mut msg_stream) = actix_ws::handle(&req, body)?;

    // Spawn async task for websocket communication
    actix_web::rt::spawn(async move {
        while let Some(Ok(msg)) = msg_stream.next().await {
            match msg {
                Message::Text(text) => {
                    let main_msg_text = text.to_string();

                    // Safely deserialize
                    let client_message = match serde_json::from_str::<ClientMessage>(&main_msg_text)
                    {
                        Ok(parsed) => parsed,
                        Err(e) => {
                            send_ws_error(
                                &session,
                                ValidationError::MalformedMessage {
                                    reason: e.to_string(),
                                }
                                .into(),
                                0,
                                None,
                            )
                            .await;
                            continue;
                        }
                    };

                    match client_message {
                        ClientMessage::UserMessage(value) => {
                            let conversation_id_str =
                                value.conversation_id.clone().unwrap_or_default();

                            let conversation_id: i32 = if conversation_id_str.is_empty() {
                                match create_conversation(user_id) {
                                    Ok(new_conv) => new_conv.id,
                                    Err(e) => {
                                        send_ws_error(&session, e.into(), 0, None).await;
                                        continue;
                                    }
                                }
                            } else {
                                match conversation_id_str.parse::<i32>() {
                                    Ok(id) => id,
                                    Err(_) => {
                                        send_ws_error(
                                            &session,
                                            ValidationError::InvalidConversationId {
                                                raw: conversation_id_str,
                                            }
                                            .into(),
                                            0,
                                            None,
                                        )
                                        .await;
                                        continue;
                                    }
                                }
                            };

                            handle_user_message(value.content, user_id, &session, conversation_id)
                                .await;
                        }
                        ClientMessage::ActionResponse(value) => {
                            println!("action response received: {}", value.pending_action_id);
                            handle_action_response(value, session.clone()).await;
                        }
                    }
                }

                Message::Binary(_) => {
                    send_ws_error(
                        &session,
                        ValidationError::MalformedMessage {
                            reason: "binary messages not supported".to_string(),
                        }
                        .into(),
                        0,
                        None,
                    )
                    .await;
                }

                Message::Close(reason) => {
                    println!("Client sent close frame: {:?}", reason);
                    break;
                }

                _ => {
                    send_ws_error(
                        &session,
                        ValidationError::MalformedMessage {
                            reason: "unsupported message type".to_string(),
                        }
                        .into(),
                        0,
                        None,
                    )
                    .await;
                }
            }
        }

        let _ = session.close(None).await;
    });

    Ok(response)
}
