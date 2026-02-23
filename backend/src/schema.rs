// @generated automatically by Diesel CLI.

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
    recipient (id) {
        name -> Text,
        userid -> Int4,
        id -> Int4,
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

diesel::joinable!(conversation -> user (user_id));
diesel::joinable!(recipient -> user (userid));

diesel::allow_tables_to_appear_in_same_query!(conversation, ledger, recipient, user,);
