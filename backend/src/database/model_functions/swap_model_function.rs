use crate::{
    database::model::{DbSwapTransaction, NewSwapTransaction},
    schema::swap_transactions,
};
use diesel::prelude::*;

pub fn create_swap_transaction(
    conn: &mut PgConnection,
    user_id: i32,
    usdc_amount: i64,
    sol_amount: i64,
    fee_amount: i64,
    user_sender_ata: String,
    user_receiver_pubkey: String,
) -> DbSwapTransaction {
    let new_swap = NewSwapTransaction {
        user_id,
        usdc_amount,
        sol_amount,
        fee_amount,
        status: "pending".to_string(),
        user_sender_ata,
        user_receiver_pubkey,
    };

    diesel::insert_into(swap_transactions::table)
        .values(&new_swap)
        .get_result(conn)
        .expect("Error creating swap transaction")
}

pub fn update_swap_status(
    conn: &mut PgConnection,
    swap_id: i32,
    status: String,
    tx_hash: Option<String>,
) -> DbSwapTransaction {
    diesel::update(swap_transactions::find(swap_id))
        .set((
            swap_transactions::status.eq(status),
            swap_transactions::tx_hash.eq(tx_hash),
            swap_transactions::updated_at.eq(chrono::Utc::now().naive_utc()),
        ))
        .get_result(conn)
        .expect("Error updating swap status")
}

pub fn get_swap_by_id(conn: &mut PgConnection, swap_id: i32) -> Option<DbSwapTransaction> {
    swap_transactions::table.find(swap_id).first(conn).ok()
}

pub fn get_user_swaps(conn: &mut PgConnection, user_id: i32) -> Vec<DbSwapTransaction> {
    swap_transactions::table
        .filter(swap_transactions::user_id.eq(user_id))
        .order(swap_transactions::created_at.desc())
        .load(conn)
        .expect("Error loading swap transactions")
}

pub fn get_all_swaps(conn: &mut PgConnection) -> Vec<DbSwapTransaction> {
    swap_transactions::table
        .order(swap_transactions::created_at.desc())
        .load(conn)
        .expect("Error loading swap transactions")
}
