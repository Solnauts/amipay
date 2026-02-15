use crate::database::{establish_connection, model_functions};
use crate::database::model_functions::{
    create_swap_transaction, update_swap_status, get_vault, update_vault_sol, 
    update_vault_fees, check_airdrop_threshold, can_airdrop,
};
use crate::utility::{
    burn_user_usdc, send_sol_to_user, calculate_swap_amounts, 
    trigger_airdrop, NETWORK_FEE_LAMPORTS, AIRDROP_THRESHOLD_LAMPORTS,
};
use actix_web::{HttpResponse, Responder, post, web};
use serde::Deserialize;

#[derive(Deserialize, Debug)]
pub struct SwapRequest {
    pub user_id: i32,
    pub user_pubkey: String,
    pub user_usdc_ata: String,
    pub usdc_amount: i64,
}

#[derive(Debug, Serialize)]
pub struct SwapResponse {
    pub status: String,
    pub message: String,
    pub usdc_burned: i64,
    pub sol_received: i64,
    pub fee_collected: i64,
    pub tx_hash: String,
}

#[post("/swap")]
async fn swap_handler(data: web::Json<SwapRequest>) -> impl Responder {
    let user_id = data.user_id;
    let user_pubkey = data.user_pubkey.clone();
    let user_usdc_ata = data.user_usdc_ata.clone();
    let usdc_amount = data.usdc_amount;

    if usdc_amount <= 0 {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "status": "error",
            "message": "USDC amount must be positive"
        }));
    }

    let (sol_amount, total_sol_needed, fee) = calculate_swap_amounts(usdc_amount);

    let vault = web::block(move || {
        let conn = &mut establish_connection();
        get_vault(conn)
    })
    .await;

    let vault = match vault {
        Ok(v) => v,
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "status": "error",
                "message": format!("Failed to get vault: {}", e)
            }));
        }
    };

    if vault.sol_reserve < total_sol_needed {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "status": "error",
            "message": "Insufficient SOL reserve. Please try again later.",
            "reserve": vault.sol_reserve,
            "needed": total_sol_needed
        }));
    }

    let burn_tx = match burn_user_usdc(user_usdc_ata.clone(), usdc_amount).await {
        Ok(tx) => tx,
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "status": "error",
                "message": format!("Failed to burn USDC: {}", e)
            }));
        }
    };

    let swap_record = web::block(move || {
        let conn = &mut establish_connection();
        create_swap_transaction(
            conn,
            user_id,
            usdc_amount,
            sol_amount,
            fee,
            user_usdc_ata.clone(),
            user_pubkey.clone(),
        )
    })
    .await;

    let swap_record = match swap_record {
        Ok(r) => r,
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "status": "error",
                "message": format!("Failed to create swap record: {}", e)
            }));
        }
    };

    let send_sol_tx = match send_sol_to_user(user_pubkey.clone(), sol_amount).await {
        Ok(tx) => tx,
        Err(e) => {
            let _ = web::block(move || {
                let conn = &mut establish_connection();
                update_swap_status(conn, swap_record.id, "failed_burn_only".to_string(), Some(burn_tx))
            }).await;
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "status": "error",
                "message": format!("Failed to send SOL: {}", e)
            }));
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

    let _ = web::block(move || {
        let conn = &mut establish_connection();
        update_swap_status(conn, swap_record.id, "completed".to_string(), Some(send_sol_tx.clone()))
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

    HttpResponse::Ok().json(SwapResponse {
        status: "success".to_string(),
        message: "Swap completed successfully".to_string(),
        usdc_burned: usdc_amount,
        sol_received: sol_amount,
        fee_collected: fee,
        tx_hash: send_sol_tx,
    })
}
