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
        pubkey -> Bytea
    }
}

diesel::joinable!(recipient -> user (userid));

diesel::allow_tables_to_appear_in_same_query!(ledger, recipient, user,);
