// @generated automatically by Diesel CLI.

diesel::table! {
    alias (id) {
        id -> Int4,
        user_id -> Int4,
        alias_name -> Text,
        is_primary -> Bool,
        created_at -> Timestamptz,
    }
}

diesel::table! {
    conversation (id) {
        id -> Int4,
        user_id -> Int4,
        created_at -> Timestamptz,
    }
}

diesel::table! {
    ledger (id) {
        id -> Int4,
        senderId -> Int4,
        receiverId -> Int4,
        amount -> Int8,
        currency -> Text,
        tx_signature -> Nullable<Text>,
        status -> Text,
        created_at -> Timestamptz,
        confirmed_at -> Nullable<Timestamptz>,
    }
}

diesel::table! {
    pending_action (id) {
        id -> Int4,
        user_id -> Int4,
        conversation_id -> Int4,
        action_type -> Text,
        payload -> Jsonb,
        status -> Text,
        expires_at -> Timestamptz,
        created_at -> Timestamptz,
    }
}

diesel::table! {
    recipient (id) {
        userid -> Int4,
        id -> Int4,
        recipient_user_id -> Int4,
        alias_used -> Text,
    }
}

diesel::table! {
    user (id) {
        id -> Int4,
        name -> Nullable<Text>,
        user_pin -> Text,
        amount -> Nullable<Int8>,
        unique_id -> Text,
        method_type -> Text,
        email -> Nullable<Text>,
        user_usdc_ata -> Nullable<Text>,
        wallet_address -> Nullable<Text>,
    }
}

diesel::joinable!(alias -> user (user_id));
diesel::joinable!(conversation -> user (user_id));
diesel::joinable!(pending_action -> conversation (conversation_id));
diesel::joinable!(pending_action -> user (user_id));

diesel::allow_tables_to_appear_in_same_query!(
    alias,
    conversation,
    ledger,
    pending_action,
    recipient,
    user,
);
