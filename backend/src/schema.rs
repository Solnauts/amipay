// @generated automatically by Diesel CLI.

diesel::table! {
    ledger (id) {
        id -> Int4,
        senderId -> Int4,
        receiverId -> Int4,
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
        name -> Text,
        password -> Text,
        amount -> Nullable<Int8>,
        unique_id -> Text,
        method_type -> Text,
        email -> Nullable<Text>,
        user_usdc_ata -> Text,
    }
}

diesel::joinable!(recipient -> user (userid));
diesel::joinable!(swap_transactions -> user (userid));

diesel::allow_tables_to_appear_in_same_query!(
    ledger,
    recipient,
    user,
    swap_transactions,
    vault_balances
);

diesel::table! {
    swap_transactions (id) {
        id -> Int4,
        user_id -> Int4,
        usdc_amount -> Int8,
        sol_amount -> Int8,
        fee_amount -> Int8,
        status -> Text,
        user_sender_ata -> Text,
        user_receiver_pubkey -> Text,
        tx_hash -> Nullable<Text>,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

diesel::table! {
    vault_balances (id) {
        id -> Int4,
        sol_reserve -> Int8,
        usdc_fees -> Int8,
        last_airdrop_amount -> Nullable<Int8>,
        last_airdrop_timestamp -> Nullable<Timestamp>,
        airdrop_count -> Int4,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}
