use crate::database::establish_connection;
use crate::database::model::{DbLedger, NewLedger};
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
//
// Balance = SUM(amount where user is receiver AND status='confirmed')
//         − SUM(amount where user is sender   AND status='confirmed')
//
// This is the **single source of truth** for a user's balance.
// The `user.amount` column is just a cached snapshot of this value.

/// Helper: run a SUM query with an explicit BIGINT cast to avoid
/// Diesel's Numeric return type on sum(Int8).
fn sum_amount_for(
    conn: &mut PgConnection,
    filter_column: &str,
    target_user_id: i32,
    status_filter: &str,
) -> Result<i64, DieselError> {
    // Using raw SQL because diesel::dsl::sum(Int8) → Numeric,
    // but we want i64 directly.
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
        .get_result::<SumRow>(conn)?;

    Ok(row.coalesce)
}

/// Calculate the net balance for `target_user_id` by scanning the ledger.
pub fn calculate_balance_from_ledger(
    conn: &mut PgConnection,
    target_user_id: i32,
) -> Result<BalanceCalcResult, DieselError> {
    // Total money received (user is the receiver in confirmed txs)
    let total_in = sum_amount_for(conn, "receiverId", target_user_id, "confirmed")?;

    // Total money sent (user is the sender in confirmed txs)
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
) -> Result<i64, DieselError> {
    let calc = calculate_balance_from_ledger(conn, target_user_id)?;

    diesel::update(user::table.filter(user::id.eq(target_user_id)))
        .set(user::amount.eq(calc.net_balance))
        .execute(conn)?;

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
) -> Result<(i64, i64), DieselError> {
    let sender_balance = update_user_amount_from_ledger(conn, sender_id)?;
    let receiver_balance = update_user_amount_from_ledger(conn, receiver_id)?;
    Ok((sender_balance, receiver_balance))
}

// ── Record transfer + update amounts (all in one DB transaction) ────────────

/// Called after the on-chain `transfer_to_vault` succeeds.
///
/// This function:
///   1. Inserts ONE ledger row (sender → receiver, status = "confirmed")
///   2. Recalculates `user.amount` for BOTH users from the full ledger
///   3. Returns the new balances
///
/// Everything runs inside a single Diesel/PG transaction so either ALL
/// writes succeed or NONE do.
pub fn record_transfer_and_update_amounts(
    conn: &mut PgConnection,
    sender_user_id: i32,
    receiver_user_id: i32,
    transfer_amount: i64,
    currency_val: String,
    tx_sig: Option<String>,
) -> Result<TransferResult, DieselError> {
    conn.transaction::<TransferResult, DieselError, _>(|txn_conn| {
        // ── 1. Insert ledger entry ──────────────────────────────────────
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

        // ── 2. Recalculate amounts for both ─────────────────────────────
        let (sender_bal, receiver_bal) =
            update_both_user_amounts(txn_conn, sender_user_id, receiver_user_id)?;

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
}

// ── Claim flow (recipient withdraws from vault) ─────────────────────────────
//
// Right now the recipient must "claim" the money. This means:
//   1. The ledger already shows them as the receiver (status = "confirmed")
//   2. Their `user.amount` already reflects the incoming amount
//   3. The actual on-chain withdrawal (vault → recipient USDC ATA) happens
//      when they trigger the claim
//   4. We record a separate "claim" ledger entry to track the on-chain
//      disbursement
//
// We introduce a new status: "claimed" to distinguish between:
//   - "confirmed"  → money is in the vault, ledger updated, user.amount updated
//   - "claimed"    → money has been disbursed from vault to recipient on-chain

/// Get total claimable amount for a user (confirmed transfers where they
/// are the receiver, minus any amounts already claimed).
pub fn get_claimable_amount(
    conn: &mut PgConnection,
    target_user_id: i32,
) -> Result<i64, DieselError> {
    // Total confirmed incoming
    let total_confirmed_in = sum_amount_for(conn, "receiverId", target_user_id, "confirmed")?;

    // Total already claimed (withdrawn on-chain)
    let total_claimed = sum_amount_for(conn, "senderId", target_user_id, "claimed")?;

    Ok(total_confirmed_in - total_claimed)
}

/// Record a successful claim (vault → recipient on-chain withdrawal).
///
/// This creates a ledger entry of type "claimed" and then recalculates
/// the user's balance. The `vault_user_id` represents the system/vault
/// entity in the ledger (you might use a sentinel user ID like 0 or a
/// dedicated "vault" user row).
pub fn record_claim(
    conn: &mut PgConnection,
    recipient_user_id: i32,
    claim_amount: i64,
    currency_val: String,
    tx_sig: Option<String>,
    vault_user_id: i32, // system user representing the vault
) -> Result<ClaimResult, DieselError> {
    conn.transaction::<ClaimResult, DieselError, _>(|txn_conn| {
        // Verify they actually have enough to claim
        let claimable = get_claimable_amount(txn_conn, recipient_user_id)?;
        if claim_amount > claimable {
            return Err(DieselError::RollbackTransaction);
        }

        // Record the claim as: vault → recipient, status = "claimed"
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

        // Recalculate the recipient's balance
        let new_balance = update_user_amount_from_ledger(txn_conn, recipient_user_id)?;

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
}

// ── Standalone helper (uses its own connection) ─────────────────────────────
// Use this when you don't already have a connection in scope.

/// Standalone: recalculate and persist amounts for both sender and receiver.
/// Opens its own DB connection.
pub fn update_amounts_standalone(sender_id: i32, receiver_id: i32) -> Result<(i64, i64), String> {
    let conn = &mut establish_connection();

    update_both_user_amounts(conn, sender_id, receiver_id)
        .map_err(|e| format!("Failed to update amounts: {}", e))
}
