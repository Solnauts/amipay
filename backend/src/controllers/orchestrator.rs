use crate::database::model_functions::conversation_model_function::create_conversation;
use crate::utility::ClientMessage;
use crate::utility::orchestrator_message_handler::handle_user_message;
use crate::{controllers::wallet_controller::validate_session_token, schema::conversation};
use actix_web::{HttpRequest, HttpResponse, HttpServer, Responder, middleware::Logger, web};
use actix_ws::Message;
use futures_util::StreamExt as _;

//web socket function
pub async fn main_caller(
    req: HttpRequest,
    body: web::Payload,
) -> actix_web::Result<impl Responder> {
    // Check the user is logged in or not FIRST, before handling WebSocket upgrade.
    // If we throw an authorization error *before* the upgrade, it sends the HTTP error instead of attempting the handshake.
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
    let (response, mut session, mut msg_stream) = actix_ws::handle(&req, body)?;

    // Spawn async task for websocket communication
    actix_web::rt::spawn(async move {
        // user_id is available and valid here
        while let Some(Ok(msg)) = msg_stream.next().await {
            let main_msg_text: String;
            match msg {
                //if the message is a text message
                Message::Text(text) => {
                    main_msg_text = text.to_string();
                    let client_message =
                        serde_json::from_str::<ClientMessage>(&main_msg_text).unwrap();

                    match client_message {
                        ClientMessage::UserMessage(value) => {
                            println!("this the best course of action");

                            let conversation_id = value.conversation_id.unwrap();
                            if conversation_id.is_empty() {
                                //call the create create conversation function
                                let conversation_id_creation_result = create_conversation(user_id);

                                //call the functions as it is;
                                handle_user_message(value.content, user_id, &session).await;

                                //client message to
                            } else {
                                //take the conversation_id and call the functions
                                //
                            }
                        }
                        ClientMessage::ActionResponse(value) => {
                            println!("this is the action response");
                        }
                        _ => {
                            println!("error while getting message")
                        }
                    }
                }

                Message::Binary(value) => {}
                _ => {}
            }
        }

        let _ = session.close(None).await;
    });

    Ok(response)
}
