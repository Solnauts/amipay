use crate::database::establish_connection;
use crate::database::model_functions::get_user;
use crate::utility::{burn_user_usdc, send_sol_to_user, calculate_swap_amounts, 
    trigger_airdrop, update_vault_sol, update_vault_fees, 
    check_airdrop_threshold, can_airdrop, get_vault, update_swap_status, 
    create_swap_transaction, NETWORK_FEE_LAMPORTS, AIRDROP_THRESHOLD_LAMPORTS};
use actix_web::{HttpResponse, Responder, post, web};
use reqwest::{self, Client};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::time::Duration;

#[derive(Debug, Serialize, Deserialize)]
pub struct RequestBody {
    pub value: String,
    pub user_id: Option<i32>,
    pub user_pubkey: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct AiResponse {
    pub model: String,
    pub created_at: String,
    pub response: String,
    pub thinking: String,
    pub done: bool,
    pub done_reason: String,
    pub context: Vec<u64>,
    pub total_duration: u64,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct MainResponse {
    pub intent: String,
    pub amount: Option<u64>,
    pub currency: Option<String>,
    pub recipient: Option<String>,
    pub history_limit: Option<u64>,
}

#[derive(Debug, Serialize)]
pub struct AiSwapResponse {
    pub status: String,
    pub message: String,
    pub intent: String,
    pub usdc_burned: Option<u64>,
    pub sol_received: Option<u64>,
    pub fee_collected: Option<u64>,
    pub tx_hash: Option<String>,
}

#[post("/query")]
async fn get_response(data: web::Json<RequestBody>) -> impl Responder {
    let url = "http://localhost:11434/api/generate";

    let client = reqwest::Client::builder()
        .timeout(Duration::from_mins(2))
        .build()
        .unwrap();

    let message_val = &data.value;

    let payload = json!({
        "model" : "bank_agent",
        "prompt" : message_val,
        "stream": false,
    });

    let response = client
        .post(url)
        .header("Content_Type", "application/json")
        .body(payload.to_string())
        .send()
        .await
        .unwrap()
        .text()
        .await
        .unwrap();

    let outer_response: AiResponse = serde_json::from_str(&response).unwrap();
    let ai_result: MainResponse = serde_json::from_str(&outer_response.response).unwrap();

    if ai_result.intent == "swap" {
        let user_id = match data.user_id {
            Some(id) => id,
            None => {
                return HttpResponse::BadRequest().json(AiSwapResponse {
                    status: "error".to_string(),
                    message: "user_id required for swap".to_string(),
                    intent: ai_result.intent,
                    usdc_burned: None,
                    sol_received: None,
                    fee_collected: None,
                    tx_hash: None,
                });
            }
        };

        let user_pubkey = match &data.user_pubkey {
            Some(pk) => pk.clone(),
            None => {
                return HttpResponse::BadRequest().json(AiSwapResponse {
                    status: "error".to_string(),
                    message: "user_pubkey required for swap".to_string(),
                    intent: ai_result.intent,
                    usdc_burned: None,
                    sol_received: None,
                    fee_collected: None,
                    tx_hash: None,
                });
            }
        };

        let usdc_amount = match ai_result.amount {
            Some(amt) => amt as i64,
            None => {
                return HttpResponse::BadRequest().json(AiSwapResponse {
                    status: "error".to_string(),
                    message: "Amount required for swap".to_string(),
                    intent: ai_result.intent,
                    usdc_burned: None,
                    sol_received: None,
                    fee_collected: None,
                    tx_hash: None,
                });
            }
        };

        let users = web::block(move || {
            get_user()
        })
        .await
        .unwrap_or_default();

        let user = match users.iter().find(|u| u.id == user_id) {
            Some(u) => u,
            None => {
                return HttpResponse::NotFound().json(AiSwapResponse {
                    status: "error".to_string(),
                    message: "User not found".to_string(),
                    intent: ai_result.intent,
                    usdc_burned: None,
                    sol_received: None,
                    fee_collected: None,
                    tx_hash: None,
                });
            }
        };

        let user_usdc_ata = user.user_usdc_ata.clone();
        let (sol_amount, total_sol_needed, fee) = calculate_swap_amounts(usdc_amount);

        let vault = web::block(|| {
            let conn = &mut establish_connection();
            get_vault(conn)
        })
        .await
        .unwrap();

        if vault.sol_reserve < total_sol_needed {
            return HttpResponse::BadRequest().json(AiSwapResponse {
                status: "error".to_string(),
                message: "Insufficient SOL reserve. Please try again later.".to_string(),
                intent: ai_result.intent,
                usdc_burned: None,
                sol_received: None,
                fee_collected: None,
                tx_hash: None,
            });
        }

        let burn_tx = match burn_user_usdc(user_usdc_ata.clone(), usdc_amount).await {
            Ok(tx) => tx,
            Err(e) => {
                return HttpResponse::InternalServerError().json(AiSwapResponse {
                    status: "error".to_string(),
                    message: format!("Failed to burn USDC: {}", e),
                    intent: ai_result.intent,
                    usdc_burned: None,
                    sol_received: None,
                    fee_collected: None,
                    tx_hash: None,
                });
            }
        };

        let send_sol_tx = match send_sol_to_user(user_pubkey.clone(), sol_amount).await {
            Ok(tx) => tx,
            Err(e) => {
                return HttpResponse::InternalServerError().json(AiSwapResponse {
                    status: "error".to_string(),
                    message: format!("Failed to send SOL: {}", e),
                    intent: ai_result.intent,
                    usdc_burned: Some(usdc_amount),
                    sol_received: None,
                    fee_collected: Some(fee as u64),
                    tx_hash: None,
                });
            }
        };

        let net_sol_sent = sol_amount + NETWORK_FEE_LAMPORTS;

        let _ = web::block(move || {
            let conn = &mut establish_connection();
            update_vault_sol(conn, -net_sol_sent)
        }).await;

        let _ = web::block(move || {
            let conn = &mut establish_connection();
            update_vault_fees(conn, fee)
        }).await;

        let should_airdrop = web::block(|| {
            let conn = &mut establish_connection();
            check_airdrop_threshold(conn, AIRDROP_THRESHOLD_LAMPORTS)
        })
        .await
        .unwrap_or(false);

        let can_airdrop_now = web::block(|| {
            let conn = &mut establish_connection();
            can_airdrop(conn)
        })
        .await
        .unwrap_or(false);

        if should_airdrop && can_airdrop_now {
            tokio::spawn(async move {
                match trigger_airdrop().await {
                    Ok(tx) => println!("Airdrop triggered: {}", tx),
                    Err(e) => println!("Airdrop failed: {}", e),
                }
            });
        }

        return HttpResponse::Ok().json(AiSwapResponse {
            status: "success".to_string(),
            message: "Swap completed successfully".to_string(),
            intent: ai_result.intent,
            usdc_burned: Some(usdc_amount),
            sol_received: Some(sol_amount as u64),
            fee_collected: Some(fee as u64),
            tx_hash: Some(send_sol_tx),
        });
    }

    HttpResponse::Ok().json(ai_result)
}
