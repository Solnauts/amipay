use crate::database::establish_connection;
use crate::database::model::{DbLedger, NewLedger};
use crate::errors::DbError;
use crate::schema::{ledger, user};
use diesel::prelude::*;
use diesel::result::Error as DieselError;
use diesel::sql_types::BigInt;
use diesel::PgConnection;

// ── Response Types ──────────────────────────────────────────────────────────

/// Outcome of a balance recalculation
pub struct BalanceCalcResult {
    pub user_id: i32,
    pub total_received: i64,
    pub total_sent: i64,
    pub net_balance: i64,
}

/// Outcome of the full transfer + amount-update flow
pub struct TransferResult {
    pub success: bool,
    pub ledger_entry_id: i32,
    pub sender_new_balance: i64,
    pub receiver_new_balance: i64,
    pub message: String,
}

/// Claim-specific result
pub struct ClaimResult {
    pub success: bool,
    pub claimed_amount: i64,
    pub new_balance: i64,
    pub message: String,
}

// ── Core: calculate balance from ledger ─────────────────────────────────────

/// Helper: run a SUM query with an explicit BIGINT cast.
fn sum_amount_for(
    conn: &mut PgConnection,
    filter_column: &str,
    target_user_id: i32,
    status_filter: &str,
) -> Result<i64, DbError> {
    let query = format!(
        "SELECT COALESCE(SUM(amount)::BIGINT, 0) FROM ledger WHERE \"{}\" = $1 AND status = $2",
        filter_column
    );

    #[derive(QueryableByName)]
    struct SumRow {
        #[diesel(sql_type = BigInt)]
        coalesce: i64,
    }

    let row = diesel::sql_query(query)
        .bind::<diesel::sql_types::Int4, _>(target_user_id)
        .bind::<diesel::sql_types::Text, _>(status_filter)
        .get_result::<SumRow>(conn)
        .map_err(|e| DbError::BalanceCalcFailed {
            user_id: target_user_id,
            reason: e.to_string(),
        })?;

    Ok(row.coalesce)
}

/// Calculate the net balance for `target_user_id` by scanning the ledger.
pub fn calculate_balance_from_ledger(
    conn: &mut PgConnection,
    target_user_id: i32,
) -> Result<BalanceCalcResult, DbError> {
    let total_in = sum_amount_for(conn, "receiverId", target_user_id, "confirmed")?;
    let total_out = sum_amount_for(conn, "senderId", target_user_id, "confirmed")?;
    let net = total_in - total_out;

    Ok(BalanceCalcResult {
        user_id: target_user_id,
        total_received: total_in,
        total_sent: total_out,
        net_balance: net,
    })
}

// ── Update user.amount from ledger ──────────────────────────────────────────

/// Recalculate and persist the cached `user.amount` for a single user.
pub fn update_user_amount_from_ledger(
    conn: &mut PgConnection,
    target_user_id: i32,
) -> Result<i64, DbError> {
    let calc = calculate_balance_from_ledger(conn, target_user_id)?;

    diesel::update(user::table.filter(user::id.eq(target_user_id)))
        .set(user::amount.eq(calc.net_balance))
        .execute(conn)
        .map_err(|e| DbError::BalanceCalcFailed {
            user_id: target_user_id,
            reason: e.to_string(),
        })?;

    println!(
        "[balance] user {} → received={} sent={} net={}",
        target_user_id, calc.total_received, calc.total_sent, calc.net_balance
    );

    Ok(calc.net_balance)
}

/// Convenience wrapper: recalculate for both sender and receiver in one call.
pub fn update_both_user_amounts(
    conn: &mut PgConnection,
    sender_id: i32,
    receiver_id: i32,
) -> Result<(i64, i64), DbError> {
    let sender_balance = update_user_amount_from_ledger(conn, sender_id)?;
    let receiver_balance = update_user_amount_from_ledger(conn, receiver_id)?;
    Ok((sender_balance, receiver_balance))
}

// ── Record transfer + update amounts ────────────────────────────────────────

/// Called after the on-chain `transfer_to_vault` succeeds.
///
/// This function:
///   1. Inserts ONE ledger row (sender → receiver, status = "confirmed")
///   2. Recalculates `user.amount` for BOTH users from the full ledger
///   3. Returns the new balances
///
/// Everything runs inside a single Diesel/PG transaction.
pub fn record_transfer_and_update_amounts(
    conn: &mut PgConnection,
    sender_user_id: i32,
    receiver_user_id: i32,
    transfer_amount: i64,
    currency_val: String,
    tx_sig: Option<String>,
) -> Result<TransferResult, DbError> {
    conn.transaction::<TransferResult, DieselError, _>(|txn_conn| {
        // 1. Insert ledger entry
        let new_entry = NewLedger {
            sender_id: sender_user_id,
            receiver_id: receiver_user_id,
            amount: transfer_amount,
            currency: currency_val,
            tx_signature: tx_sig,
            status: "confirmed".to_string(),
        };

        let inserted: DbLedger = diesel::insert_into(ledger::table)
            .values(&new_entry)
            .get_result(txn_conn)?;

        // 2. Recalculate amounts for both — propagate DbError as DieselError
        let sender_bal = update_user_amount_from_ledger(txn_conn, sender_user_id)
            .map_err(|_| DieselError::RollbackTransaction)?;
        let receiver_bal = update_user_amount_from_ledger(txn_conn, receiver_user_id)
            .map_err(|_| DieselError::RollbackTransaction)?;

        Ok(TransferResult {
            success: true,
            ledger_entry_id: inserted.id,
            sender_new_balance: sender_bal,
            receiver_new_balance: receiver_bal,
            message: format!(
                "Transfer recorded. Sender balance: {}, Receiver balance: {}",
                sender_bal, receiver_bal
            ),
        })
    })
    .map_err(|e| DbError::LedgerInsertFailed {
        reason: e.to_string(),
    })
}

// ── Claim flow ──────────────────────────────────────────────────────────────

/// Get total claimable amount for a user.
pub fn get_claimable_amount(conn: &mut PgConnection, target_user_id: i32) -> Result<i64, DbError> {
    let total_confirmed_in = sum_amount_for(conn, "receiverId", target_user_id, "confirmed")?;
    let total_claimed = sum_amount_for(conn, "senderId", target_user_id, "claimed")?;
    Ok(total_confirmed_in - total_claimed)
}

/// Record a successful claim (vault → recipient on-chain withdrawal).
pub fn record_claim(
    conn: &mut PgConnection,
    recipient_user_id: i32,
    claim_amount: i64,
    currency_val: String,
    tx_sig: Option<String>,
    vault_user_id: i32,
) -> Result<ClaimResult, DbError> {
    conn.transaction::<ClaimResult, DieselError, _>(|txn_conn| {
        let claimable = get_claimable_amount(txn_conn, recipient_user_id)
            .map_err(|_| DieselError::RollbackTransaction)?;

        if claim_amount > claimable {
            return Err(DieselError::RollbackTransaction);
        }

        let claim_entry = NewLedger {
            sender_id: vault_user_id,
            receiver_id: recipient_user_id,
            amount: claim_amount,
            currency: currency_val,
            tx_signature: tx_sig,
            status: "claimed".to_string(),
        };

        diesel::insert_into(ledger::table)
            .values(&claim_entry)
            .execute(txn_conn)?;

        let new_balance = update_user_amount_from_ledger(txn_conn, recipient_user_id)
            .map_err(|_| DieselError::RollbackTransaction)?;

        Ok(ClaimResult {
            success: true,
            claimed_amount: claim_amount,
            new_balance,
            message: format!(
                "Claimed {} successfully. New balance: {}",
                claim_amount, new_balance
            ),
        })
    })
    .map_err(|e| DbError::ClaimRecordFailed {
        user_id: recipient_user_id,
        reason: e.to_string(),
    })
}

// ── Standalone helpers ──────────────────────────────────────────────────────

/// Standalone: recalculate and persist amounts for both sender and receiver.
pub fn update_amounts_standalone(sender_id: i32, receiver_id: i32) -> Result<(i64, i64), DbError> {
    let conn = &mut establish_connection()?;
    update_both_user_amounts(conn, sender_id, receiver_id)
}
