use crate::database::db::establish_connection;
use crate::database::model::{
    DbPendingAction, Dbrecipient, NewPendingAction, PendingActionPayload, RecipientCandidate,
    UpdatePendingActionStatus,
};
use crate::schema::pending_action;
use chrono::{Duration, Utc};
use diesel::PgConnection;
use diesel::prelude::*;
use diesel::result::Error as DieselError;

// ── Payload Builders ────────────────────────────────────────────────────────
// These functions create the typed `PendingActionPayload` that gets stored
// as JSONB in the `pending_action.payload` column. Call one of these, then
// pass the result into `create_pending_action`.

/// Build a `TransferConfirm` payload.
///
/// Use when **exactly 1 recipient** matched and you're asking the user:
///   "Send $100 USDC to Mom (Sarah Johnson)? [Confirm] [Cancel]"
pub fn build_transfer_confirm_payload(
    amount: f64,
    currency: &str,
    recipient_id: i32,
    recipient_name: &str,
    sender_unique_id: &str,
) -> PendingActionPayload {
    PendingActionPayload::TransferConfirm {
        amount,
        currency: currency.to_string(),
        recipient_id,
        recipient_name: recipient_name.to_string(),
        sender_unique_id: sender_unique_id.to_string(),
    }
}

/// Build a `RecipientSelect` payload.
///
/// Use when **multiple recipients** matched the name and you're asking
/// the user to pick one:
///   "Multiple recipients found: 1. Mom (Sarah) 2. Mom (Maria). Choose one."
///
/// Takes a `Vec<Dbrecipient>` directly from the DB query result — it maps
/// each into a `RecipientCandidate` internally so you don't have to.
pub fn build_recipient_select_payload(
    amount: f64,
    currency: &str,
    recipients: Vec<Dbrecipient>,
    sender_unique_id: &str,
) -> PendingActionPayload {
    let candidates = recipients
        .into_iter()
        .map(|r| RecipientCandidate {
            id: r.id,
            name: r.name,
        })
        .collect();

    PendingActionPayload::RecipientSelect {
        amount,
        currency: currency.to_string(),
        candidates,
        sender_unique_id: sender_unique_id.to_string(),
    }
}

/// Build a `PinVerify` payload.
///
/// Use when the recipient is resolved and the transfer is ready, but you
/// need the user's PIN before executing:
///   "Please enter your PIN to authorize sending $100 to Mom."
pub fn build_pin_verify_payload(
    amount: f64,
    currency: &str,
    recipient_id: i32,
    recipient_name: &str,
    sender_unique_id: &str,
) -> PendingActionPayload {
    PendingActionPayload::PinVerify {
        amount,
        currency: currency.to_string(),
        recipient_id,
        recipient_name: recipient_name.to_string(),
        sender_unique_id: sender_unique_id.to_string(),
    }
}

// ── Create a new pending action ─────────────────────────────────────────────
/// Creates a pending_action row in the database.
///
/// `handle_user_message` calls this when it needs the user to respond
/// (confirm transfer, select recipient, enter PIN). The returned
/// `DbPendingAction.id` is sent to the client so it can reference this
/// action in its `ActionResponse` message.
pub fn create_pending_action(
    conn: &mut PgConnection,
    target_user_id: i32,
    target_conversation_id: i32,
    target_action_type: &str,
    target_payload: PendingActionPayload,
) -> Result<DbPendingAction, DieselError> {
    let payload_json =
        serde_json::to_value(&target_payload).map_err(|_| DieselError::RollbackTransaction)?;

    let new_action = NewPendingAction {
        user_id: target_user_id,
        conversation_id: target_conversation_id,
        action_type: target_action_type.to_string(),
        payload: payload_json,
        status: "pending".to_string(),
        expires_at: Utc::now() + Duration::minutes(5),
    };

    diesel::insert_into(pending_action::table)
        .values(&new_action)
        .get_result(conn)
}

// ── Get a pending action by ID ──────────────────────────────────────────────
/// Loads a pending action by its primary key.
/// Used by `handle_action_response` when the user replies.
pub fn get_pending_action_by_id(
    conn: &mut PgConnection,
    action_id: i32,
) -> Result<Option<DbPendingAction>, DieselError> {
    use crate::schema::pending_action::dsl::*;

    pending_action
        .filter(id.eq(action_id))
        .first::<DbPendingAction>(conn)
        .optional()
}

// ── Get a pending action by ID, with ownership + validity checks ────────────
/// Loads a pending action only if:
///   1. It belongs to the given user
///   2. Its status is still "pending"
///   3. It hasn't expired yet
///
/// This is the primary function `handle_action_response` should use to
/// prevent users from acting on someone else's pending action or replaying
/// old/expired ones.
pub fn get_valid_pending_action(
    conn: &mut PgConnection,
    action_id: i32,
    target_user_id: i32,
) -> Result<Option<DbPendingAction>, DieselError> {
    use crate::schema::pending_action::dsl::*;

    pending_action
        .filter(id.eq(action_id))
        .filter(user_id.eq(target_user_id))
        .filter(status.eq("pending"))
        .filter(expires_at.gt(Utc::now()))
        .first::<DbPendingAction>(conn)
        .optional()
}

// ── Update status ───────────────────────────────────────────────────────────
/// Sets the status of a pending action (e.g., "confirmed", "cancelled", "expired").
pub fn update_pending_action_status(
    conn: &mut PgConnection,
    action_id: i32,
    new_status: &str,
) -> Result<DbPendingAction, DieselError> {
    let changeset = UpdatePendingActionStatus {
        status: new_status.to_string(),
    };

    diesel::update(pending_action::table.filter(pending_action::id.eq(action_id)))
        .set(&changeset)
        .get_result(conn)
}

// ── Cancel all pending actions for a user ───────────────────────────────────
/// Bulk-cancels any still-pending actions for a user.
/// Useful when the user starts a brand new conversation or explicitly
/// cancels an ongoing flow.
pub fn cancel_all_pending_for_user(
    conn: &mut PgConnection,
    target_user_id: i32,
) -> Result<usize, DieselError> {
    use crate::schema::pending_action::dsl::*;

    diesel::update(
        pending_action
            .filter(user_id.eq(target_user_id))
            .filter(status.eq("pending")),
    )
    .set(status.eq("cancelled"))
    .execute(conn)
}

// ── Expire stale actions ────────────────────────────────────────────────────
/// Marks all past-due pending actions as "expired".
/// Call this periodically (e.g., from a background task) or lazily
/// before querying pending actions.
pub fn expire_stale_actions(conn: &mut PgConnection) -> Result<usize, DieselError> {
    use crate::schema::pending_action::dsl::*;

    diesel::update(
        pending_action
            .filter(status.eq("pending"))
            .filter(expires_at.le(Utc::now())),
    )
    .set(status.eq("expired"))
    .execute(conn)
}

// ── Standalone helpers (open their own connections) ──────────────────────────

/// Standalone: create a pending action using its own DB connection.
pub fn create_pending_action_standalone(
    target_user_id: i32,
    target_conversation_id: i32,
    target_action_type: &str,
    target_payload: PendingActionPayload,
) -> Result<DbPendingAction, String> {
    let conn = &mut establish_connection();
    create_pending_action(
        conn,
        target_user_id,
        target_conversation_id,
        target_action_type,
        target_payload,
    )
    .map_err(|e| format!("Failed to create pending action: {}", e))
}

/// Standalone: get a valid pending action using its own DB connection.
pub fn get_valid_pending_action_standalone(
    action_id: i32,
    target_user_id: i32,
) -> Result<Option<DbPendingAction>, String> {
    let conn = &mut establish_connection();
    get_valid_pending_action(conn, action_id, target_user_id)
        .map_err(|e| format!("Failed to load pending action: {}", e))
}

/// Standalone: update status using its own DB connection.
pub fn update_pending_action_status_standalone(
    action_id: i32,
    new_status: &str,
) -> Result<DbPendingAction, String> {
    let conn = &mut establish_connection();
    update_pending_action_status(conn, action_id, new_status)
        .map_err(|e| format!("Failed to update pending action: {}", e))
}
