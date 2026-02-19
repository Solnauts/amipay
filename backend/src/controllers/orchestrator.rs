use actix_web::web::post;
use actix_web::{App, HttpRequest, HttpServer, Responder, middleware::Logger, web};
use actix_ws::Message;
use futures_util::StreamExt as _;
use std::io;

use crate::utility::ClientMessage;

//web socket function
pub async fn main_caller(
    req: HttpRequest,
    body: web::Payload,
) -> actix_web::Result<impl Responder> {
    let (response, mut session, mut msg_stream) = actix_ws::handle(&req, body)?;

    //creating namespaces

    //room creation

    //can reuse the chat room or have to make new chat room at every take

    //how to verify the jwt token in this web socket thing

    // how to secure the chats.

    actix_web::rt::spawn(async move {
        while let Some(Ok(msg)) = msg_stream.next().await {
            let client_message = serde_json::from_str::<ClientMessage>(&msg);

            match client_message {
                ClientMessage::UserMessage() => {
                    println!("this the best course of action");
                }
                ClientMessage::ActionResponse() => {
                    println!("this is the action response");
                }

                _ => {
                    println!("error while getting message")
                }
            }
        }

        let _ = session.close(None).await;
    });

    Ok(response)
}
