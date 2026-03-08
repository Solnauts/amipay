use crate::database::establish_connection;
use crate::database::model::{DbLedger, NewLedger};
use crate::errors::DbError;
use crate::schema::{ledger, user};
use diesel::PgConnection;
use diesel::prelude::*;
use diesel::result::Error as DieselError;
use diesel::sql_types::BigInt;

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

/// Helper: sum `amount` for a given user filtered by direction column and
/// a list of status values (passed as a comma-separated SQL literal inside
/// an IN clause). Using raw SQL here because Diesel's DSL makes variadic IN
/// with a dynamic list awkward without extra macros.
fn sum_amount_for_statuses(
    conn: &mut PgConnection,
    filter_column: &str,
    target_user_id: i32,
    statuses: &[&str],
) -> Result<i64, DbError> {
    // Build a safe SQL IN list from the known-safe status string literals.
    let placeholders: Vec<String> = statuses
        .iter()
        .enumerate()
        .map(|(i, _)| format!("${}", i + 2))
        .collect();
    let query = format!(
        "SELECT COALESCE(SUM(amount)::BIGINT, 0) FROM ledger WHERE \"{}\" = $1 AND status IN ({})",
        filter_column,
        placeholders.join(", ")
    );

    #[derive(QueryableByName)]
    struct SumRow {
        #[diesel(sql_type = BigInt)]
        coalesce: i64,
    }

    // Build the query and bind the user_id first, then each status.
    let mut q = diesel::sql_query(query).bind::<diesel::sql_types::Int4, _>(target_user_id);
    // We need owned strings so we can bind them — collect first.
    let status_strings: Vec<String> = statuses.iter().map(|s| s.to_string()).collect();
    // Diesel's sql_query bind is not variadic; use raw PostgreSQL ANY instead
    // by falling back to a single-bind array approach via a re-written query.
    drop(q);

    // Simpler approach: build IN list as a literal and use a single bind for user_id.
    let in_list = status_strings
        .iter()
        .map(|s| format!("'{}'", s.replace('\'', "''")))
        .collect::<Vec<_>>()
        .join(", ");
    let safe_query = format!(
        "SELECT COALESCE(SUM(amount)::BIGINT, 0) AS coalesce FROM ledger WHERE \"{}\" = $1 AND status IN ({})",
        filter_column, in_list
    );

    let row = diesel::sql_query(safe_query)
        .bind::<diesel::sql_types::Int4, _>(target_user_id)
        .get_result::<SumRow>(conn)
        .map_err(|e| DbError::BalanceCalcFailed {
            user_id: target_user_id,
            reason: e.to_string(),
        })?;

    Ok(row.coalesce)
}

/// Calculate the net balance for `target_user_id` by scanning the ledger.
///
/// Incoming (credit) statuses : "confirmed" (received) + "deposit"
/// Outgoing (debit)  statuses : "confirmed" (sent) + "claimed" (withdrawn)
pub fn calculate_balance_from_ledger(
    conn: &mut PgConnection,
    target_user_id: i32,
) -> Result<BalanceCalcResult, DbError> {
    // Money coming IN to the user: peer transfers that confirmed + external deposits.
    let total_in = sum_amount_for_statuses(
        conn,
        "receiverId",
        target_user_id,
        &["confirmed", "deposit"],
    )?;
    // Money going OUT from the user: transfers the user sent (status="confirmed")
    // + amounts they withdrew/claimed (status="claimed").
    let total_out =
        sum_amount_for_statuses(conn, "senderId", target_user_id, &["confirmed", "claimed"])?;
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
///
/// claimable = (total received + deposits) - (total sent) - (total claimed)
pub fn get_claimable_amount(conn: &mut PgConnection, target_user_id: i32) -> Result<i64, DbError> {
    let total_confirmed_in = sum_amount_for_statuses(
        conn,
        "receiverId",
        target_user_id,
        &["confirmed", "deposit"],
    )?;
    let total_sent = sum_amount_for_statuses(conn, "senderId", target_user_id, &["confirmed"])?;
    let total_claimed = sum_amount_for_statuses(conn, "senderId", target_user_id, &["claimed"])?;
    Ok(total_confirmed_in - total_sent - total_claimed)
}

/// Record a successful claim (user_usdc_ata → destination on-chain withdrawal).
///
/// Both sender and receiver are the same user — the `"claimed"` status
/// distinguishes these entries from peer transfers. This pattern avoids FK
/// violations (no "vault user" row needed in the `user` table), and is
/// consistent with how deposits are recorded.
pub fn record_claim(
    conn: &mut PgConnection,
    recipient_user_id: i32,
    claim_amount: i64,
    currency_val: String,
    tx_sig: Option<String>,
) -> Result<ClaimResult, DbError> {
    conn.transaction::<ClaimResult, DieselError, _>(|txn_conn| {
        let claimable = get_claimable_amount(txn_conn, recipient_user_id)
            .map_err(|_| DieselError::RollbackTransaction)?;

        if claim_amount > claimable {
            return Err(DieselError::RollbackTransaction);
        }

        let claim_entry = NewLedger {
            sender_id: recipient_user_id,
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

// ── Deposit flow ─────────────────────────────────────────────────────────────

/// Result returned to the caller after a successful deposit record.
pub struct DepositResult {
    /// The amount that was deposited (stored as micro-units, e.g. micro-USDC).
    pub deposit_amount: i64,
    /// The user's new cached balance after the deposit is recorded.
    pub new_balance: i64,
    /// Optional on-chain transaction signature kept for the response body.
    pub tx_signature: Option<String>,
}

/// Record an external USDC deposit for `user_id`.
///
/// Flow (as directed in wallet_controller):
///   1. Insert ONE ledger row  (sender = VAULT/0, receiver = user_id, status = "deposit")
///   2. Recalculate `user.amount` from the full ledger (in - out) so the
///      cached balance always reflects the exact ledger state.
///
/// Everything runs inside a single transaction — if the balance update fails,
/// the ledger insert is rolled back as well.
///
/// `deposit_amount_f64` is the raw float from the JSON body; we convert to
/// i64 micro-units (×1_000_000) to stay consistent with the rest of the ledger.
pub fn deposit_usdc(
    conn: &mut PgConnection,
    user_id: i32,
    deposit_amount_f64: f64,
    tx_sig: Option<String>,
) -> Result<DepositResult, DbError> {
    // Convert float to integer micro-units (1 USDC = 1_000_000 micro-USDC).
    let deposit_amount: i64 = (deposit_amount_f64 * 1_000_000.0).round() as i64;

    // For a deposit the user is funding their own account (external on-chain
    // transfer → user's ATA). Both sender and receiver are therefore the same
    // user — this keeps the FK constraint satisfied without needing a special
    // vault row, and the "deposit" status distinguishes it from peer transfers.
    conn.transaction::<DepositResult, DieselError, _>(|txn_conn| {
        // Step 1: Insert the deposit ledger entry.
        let new_entry = NewLedger {
            sender_id: user_id,
            receiver_id: user_id,
            amount: deposit_amount,
            currency: "USDC".to_string(),
            tx_signature: tx_sig.clone(),
            status: "deposit".to_string(),
        };

        diesel::insert_into(ledger::table)
            .values(&new_entry)
            .execute(txn_conn)?;

        // Step 2: Recalculate user.amount from the full ledger diff and persist it.
        let new_balance = update_user_amount_from_ledger(txn_conn, user_id)
            .map_err(|_| DieselError::RollbackTransaction)?;

        Ok(DepositResult {
            deposit_amount,
            new_balance,
            tx_signature: tx_sig,
        })
    })
    .map_err(|e| DbError::LedgerInsertFailed {
        reason: e.to_string(),
    })
}

// ── Standalone helpers ──────────────────────────────────────────────────────

/// Standalone: recalculate and persist amounts for both sender and receiver.
pub fn update_amounts_standalone(sender_id: i32, receiver_id: i32) -> Result<(i64, i64), DbError> {
    let conn = &mut establish_connection()?;
    update_both_user_amounts(conn, sender_id, receiver_id)
}

//function to get all transactions of the user
pub fn get_transactions_for_user(
    conn: &mut PgConnection,
    user_id: i32,
) -> Result<Vec<DbLedger>, DbError> {
    let transactions = ledger::table
        .filter(
            ledger::senderId
                .eq(user_id)
                .or(ledger::receiverId.eq(user_id)),
        )
        .load::<DbLedger>(conn)?;
    Ok(transactions)
}
