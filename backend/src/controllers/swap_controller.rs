use actix_web::{HttpResponse, Responder, post, web};
use serde::{Deserialize, Serialize};

use crate::utility::jupiter_swap;

#[derive(Deserialize, Debug)]
pub struct SwapRequest {
    pub amount: u64,
    pub input_mint: Option<String>,
    pub output_mint: Option<String>,
    pub slippage_bps: Option<u16>,
}

#[derive(Serialize)]
struct SwapResponse {
    status: String,
    signature: String,
    input_mint: String,
    output_mint: String,
    in_amount: String,
    out_amount: String,
    explorer_url: String,
}

#[derive(Serialize)]
struct ErrorResponse {
    status: String,
    message: String,
}

#[post("/swap")]
pub async fn swap_handler(data: web::Json<SwapRequest>) -> actix_web::Result<impl Responder> {
    let req = data.into_inner();

    let input_mint = req.input_mint.unwrap_or_else(|| {
        "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU".to_string() // devnet USDC
    });
    let output_mint = req.output_mint.unwrap_or_else(|| {
        "So11111111111111111111111111111111111111112".to_string() // SOL
    });
    let slippage = req.slippage_bps.unwrap_or(50);

    match jupiter_swap::execute_swap(&input_mint, &output_mint, req.amount, slippage).await {
        Ok(result) => Ok(HttpResponse::Ok().json(SwapResponse {
            status: "success".into(),
            signature: result.signature.clone(),
            input_mint: result.input_mint,
            output_mint: result.output_mint,
            in_amount: result.in_amount,
            out_amount: result.out_amount,
            explorer_url: format!(
                "https://explorer.solana.com/tx/{}?cluster=devnet",
                result.signature
            ),
        })),
        Err(e) => Ok(HttpResponse::InternalServerError().json(ErrorResponse {
            status: "error".into(),
            message: e.to_string(),
        })),
    }
}
