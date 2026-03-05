use crate::database::db::establish_connection;
use crate::database::model::{
    DbPendingAction, Dbrecipient, NewPendingAction, PendingActionPayload, RecipientCandidate,
    UpdatePendingActionStatus,
};
use crate::errors::DbError;
use crate::schema::pending_action;
use chrono::{Duration, Utc};
use diesel::prelude::*;

use diesel::PgConnection;

// ── Payload Builders ────────────────────────────────────────────────────────

/// Build a `TransferConfirm` payload.
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
            name: r.alias_used,
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

pub fn create_pending_action(
    conn: &mut PgConnection,
    target_user_id: i32,
    target_conversation_id: i32,
    target_action_type: &str,
    target_payload: PendingActionPayload,
) -> Result<DbPendingAction, DbError> {
    let payload_json =
        serde_json::to_value(&target_payload).map_err(|e| DbError::PendingActionCreateFailed {
            reason: format!("payload serialization failed: {}", e),
        })?;

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
        .map_err(|e| DbError::PendingActionCreateFailed {
            reason: e.to_string(),
        })
}

// ── Get a pending action by ID ──────────────────────────────────────────────

pub fn get_pending_action_by_id(
    conn: &mut PgConnection,
    action_id: i32,
) -> Result<Option<DbPendingAction>, DbError> {
    use crate::schema::pending_action::dsl::*;

    pending_action
        .filter(id.eq(action_id))
        .first::<DbPendingAction>(conn)
        .optional()
        .map_err(|e| DbError::QueryFailed {
            context: format!("pending_action lookup id={}", action_id),
            reason: e.to_string(),
        })
}

// ── Get a pending action by ID, with ownership + validity checks ────────────

pub fn get_valid_pending_action(
    conn: &mut PgConnection,
    action_id: i32,
    target_user_id: i32,
) -> Result<Option<DbPendingAction>, DbError> {
    use crate::schema::pending_action::dsl::*;

    pending_action
        .filter(id.eq(action_id))
        .filter(user_id.eq(target_user_id))
        .filter(status.eq("pending"))
        .filter(expires_at.gt(Utc::now()))
        .first::<DbPendingAction>(conn)
        .optional()
        .map_err(|e| DbError::QueryFailed {
            context: format!(
                "valid pending_action id={} user={}",
                action_id, target_user_id
            ),
            reason: e.to_string(),
        })
}

// ── Update status ───────────────────────────────────────────────────────────

pub fn update_pending_action_status(
    conn: &mut PgConnection,
    action_id: i32,
    new_status: &str,
) -> Result<DbPendingAction, DbError> {
    let changeset = UpdatePendingActionStatus {
        status: new_status.to_string(),
    };

    diesel::update(pending_action::table.filter(pending_action::id.eq(action_id)))
        .set(&changeset)
        .get_result(conn)
        .map_err(|e| DbError::PendingActionUpdateFailed {
            action_id,
            reason: e.to_string(),
        })
}

// ── Cancel all pending actions for a user ───────────────────────────────────

pub fn cancel_all_pending_for_user(
    conn: &mut PgConnection,
    target_user_id: i32,
) -> Result<usize, DbError> {
    use crate::schema::pending_action::dsl::*;

    diesel::update(
        pending_action
            .filter(user_id.eq(target_user_id))
            .filter(status.eq("pending")),
    )
    .set(status.eq("cancelled"))
    .execute(conn)
    .map_err(|e| DbError::PendingActionUpdateFailed {
        action_id: -1,
        reason: format!("cancel_all for user {}: {}", target_user_id, e),
    })
}

// ── Expire stale actions ────────────────────────────────────────────────────

pub fn expire_stale_actions(conn: &mut PgConnection) -> Result<usize, DbError> {
    use crate::schema::pending_action::dsl::*;

    diesel::update(
        pending_action
            .filter(status.eq("pending"))
            .filter(expires_at.le(Utc::now())),
    )
    .set(status.eq("expired"))
    .execute(conn)
    .map_err(|e| DbError::PendingActionUpdateFailed {
        action_id: -1,
        reason: format!("expire_stale: {}", e),
    })
}

// ── Standalone helpers ──────────────────────────────────────────────────────

pub fn create_pending_action_standalone(
    target_user_id: i32,
    target_conversation_id: i32,
    target_action_type: &str,
    target_payload: PendingActionPayload,
) -> Result<DbPendingAction, DbError> {
    let conn = &mut establish_connection()?;
    create_pending_action(
        conn,
        target_user_id,
        target_conversation_id,
        target_action_type,
        target_payload,
    )
}

pub fn get_valid_pending_action_standalone(
    action_id: i32,
    target_user_id: i32,
) -> Result<Option<DbPendingAction>, DbError> {
    let conn = &mut establish_connection()?;
    get_valid_pending_action(conn, action_id, target_user_id)
}

pub fn update_pending_action_status_standalone(
    action_id: i32,
    new_status: &str,
) -> Result<DbPendingAction, DbError> {
    let conn = &mut establish_connection()?;
    update_pending_action_status(conn, action_id, new_status)
}
