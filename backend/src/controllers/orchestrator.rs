use crate::controllers::wallet_controller::validate_session_token;
use crate::database::model_functions::conversation_model_function::create_conversation;
use crate::schema::conversation;
use crate::utility::orchestrator_message_handler::handle_user_message;
use crate::utility::{ClientMessage, ErrorPayload, ServerMessage, handle_action_response};
use actix_web::{HttpRequest, Responder, web};
use actix_ws::Message;
use futures_util::StreamExt as _;

//web socket function
pub async fn main_caller(
    req: HttpRequest,
    body: web::Payload,
) -> actix_web::Result<impl Responder> {
    // Check the user is logged in or not FIRST, before handling WebSocket upgrade.
    let token = match req.cookie("session_token") {
        Some(cookie) => cookie.value().to_string(),
        None => {
            return Err(actix_web::error::ErrorUnauthorized(
                "Missing session cookie. Please log in first.",
            ));
        }
    };

    let claims = match validate_session_token(&token) {
        Ok(token_claims) => token_claims,
        Err(e) => return Err(actix_web::error::ErrorUnauthorized(e)),
    };

    // Getting user id
    let user_id = match claims.sub.parse::<i32>() {
        Ok(id) => id,
        Err(_) => {
            return Err(actix_web::error::ErrorInternalServerError(
                "Invalid user ID in token",
            ));
        }
    };

    // Now that auth is verified, upgrade to WebSocket connection
    let (response, session, mut msg_stream) = actix_ws::handle(&req, body)?;

    // Spawn async task for websocket communication
    actix_web::rt::spawn(async move {
        while let Some(Ok(msg)) = msg_stream.next().await {
            match msg {
                Message::Text(text) => {
                    let main_msg_text = text.to_string();

                    // Safely deserialize — send error frame instead of panicking
                    let client_message = match serde_json::from_str::<ClientMessage>(&main_msg_text)
                    {
                        Ok(parsed) => parsed,
                        Err(e) => {
                            let err_payload = ServerMessage::Error(ErrorPayload {
                                conversation_id: 0,
                                pending_action_id: None,
                                error_message: format!("Malformed message: {}", e),
                            });
                            if let Ok(json) = serde_json::to_string(&err_payload) {
                                let _ = session.clone().text(json).await;
                            }
                            continue; // keep listening for the next message
                        }
                    };

                    match client_message {
                        ClientMessage::UserMessage(value) => {
                            // conversation_id is Option<String> — handle None gracefully
                            let conversation_id_str =
                                value.conversation_id.clone().unwrap_or_default();

                            let conversation_id: i32 = if conversation_id_str.is_empty() {
                                // Create a new conversation and use its ID
                                let new_conv = create_conversation(user_id);
                                new_conv.id
                            } else {
                                // Parse the existing conversation ID
                                match conversation_id_str.parse::<i32>() {
                                    Ok(id) => id,
                                    Err(_) => {
                                        let err_payload = ServerMessage::Error(ErrorPayload {
                                            conversation_id: 0,
                                            pending_action_id: None,
                                            error_message: "Invalid conversation_id".to_string(),
                                        });
                                        if let Ok(json) = serde_json::to_string(&err_payload) {
                                            let _ = session.clone().text(json).await;
                                        }
                                        continue;
                                    }
                                }
                            };

                            // Delegate to the handler (all errors sent over stream inside)
                            handle_user_message(value.content, user_id, &session, conversation_id)
                                .await;
                        }
                        ClientMessage::ActionResponse(value) => {
                            println!("action response received: {}", value.pending_action_id);
                            // TODO: handle action response
                            handle_action_response(value, session.clone()).await;
                        }
                    }
                }

                Message::Binary(_) => {
                    // Binary frames not supported — notify client
                    let err_payload = ServerMessage::Error(ErrorPayload {
                        conversation_id: 0,
                        pending_action_id: None,
                        error_message: "Binary messages are not supported".to_string(),
                    });
                    if let Ok(json) = serde_json::to_string(&err_payload) {
                        let _ = session.clone().text(json).await;
                    }
                }

                Message::Close(reason) => {
                    println!("Client sent close frame: {:?}", reason);
                    break;
                    // exit the loop and close below
                }

                // Ping/Pong/Continuation — actix-ws handles pings automatically
                _ => {
                    //failed to load the server to make thing
                    let err_payload = ServerMessage::Error(ErrorPayload {
                        conversation_id: 0,
                        pending_action_id: None,
                        error_message: "Binary messages are not supported".to_string(),
                    });
                    if let Ok(json) = serde_json::to_string(&err_payload) {
                        let _ = session.clone().text(json).await;
                    }
                }
            }
        }

        // Gracefully close the session
        let _ = session.close(None).await;
    });

    Ok(response)
}
