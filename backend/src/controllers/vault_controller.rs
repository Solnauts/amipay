use crate::database::{establish_connection, model_functions};
use crate::database::model_functions::{
    get_vault, update_vault_after_airdrop, can_airdrop, check_airdrop_threshold,
};
use crate::utility::{trigger_airdrop, get_airdrop_threshold, get_airdrop_amount, get_airdrop_cooldown};
use actix_web::{HttpResponse, Responder, get, post, web};
use serde::Serialize;

#[derive(Serialize)]
pub struct VaultStatusResponse {
    pub sol_reserve: i64,
    pub usdc_fees: i64,
    pub last_airdrop_amount: Option<i64>,
    pub last_airdrop_timestamp: Option<String>,
    pub airdrop_count: i32,
    pub airdrop_threshold: i64,
    pub can_airdrop: bool,
    pub should_airdrop: bool,
}

#[get("/vault/status")]
async fn get_vault_status() -> impl Responder {
    let vault = web::block(|| {
        let conn = &mut establish_connection();
        get_vault(conn)
    })
    .await;

    match vault {
        Ok(v) => {
            let can_airdrop_now = web::block(|| {
                let conn = &mut establish_connection();
                can_airdrop(conn)
            })
            .await
            .unwrap_or(false);

            let should_airdrop_now = web::block(|| {
                let conn = &mut establish_connection();
                check_airdrop_threshold(conn, get_airdrop_threshold())
            })
            .await
            .unwrap_or(false);

            let timestamp_str = v.last_airdrop_timestamp.map(|ts| {
                ts.format("%Y-%m-%d %H:%M:%S").to_string()
            });

            HttpResponse::Ok().json(VaultStatusResponse {
                sol_reserve: v.sol_reserve,
                usdc_fees: v.usdc_fees,
                last_airdrop_amount: v.last_airdrop_amount,
                last_airdrop_timestamp: timestamp_str,
                airdrop_count: v.airdrop_count,
                airdrop_threshold: get_airdrop_threshold(),
                can_airdrop: can_airdrop_now,
                should_airdrop: should_airdrop_now,
            })
        }
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "status": "error",
            "message": format!("Failed to get vault status: {}", e)
        })),
    }
}

#[post("/vault/airdrop")]
async fn trigger_airdrop_handler() -> impl Responder {
    let can_airdrop_now = web::block(|| {
        let conn = &mut establish_connection();
        can_airdrop(conn)
    })
    .await
    .unwrap_or(false);

    if !can_airdrop_now {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "status": "error",
            "message": "Airdrop on cooldown. Please wait.",
            "cooldown_seconds": get_airdrop_cooldown()
        }));
    }

    let should_airdrop = web::block(|| {
        let conn = &mut establish_connection();
        check_airdrop_threshold(conn, get_airdrop_threshold())
    })
    .await
    .unwrap_or(false);

    if !should_airdrop {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "status": "error",
            "message": "USDC fees below threshold",
            "threshold": get_airdrop_threshold()
        }));
    }

    match trigger_airdrop().await {
        Ok(tx_hash) => {
            let airdrop_amount = get_airdrop_amount();
            
            let _ = web::block(move || {
                let conn = &mut establish_connection();
                update_vault_after_airdrop(conn, airdrop_amount)
            }).await;

            HttpResponse::Ok().json(serde_json::json!({
                "status": "success",
                "message": "Airdrop triggered successfully",
                "tx_hash": tx_hash,
                "amount": airdrop_amount
            }))
        }
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "status": "error",
            "message": format!("Airdrop failed: {}", e)
        })),
    }
}
