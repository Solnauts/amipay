// @generated automatically by Diesel CLI.

diesel::table! {
    Ledger (id) {
        id -> Int4,
        senderId -> Int4,
        receiverId -> Int4,
    }
}

diesel::table! {
    Recipient (id) {
        name -> Text,
        userid -> Int4,
        id -> Int4,
    }
}

diesel::table! {
    User (id) {
        id -> Int4,
        name -> Text,
        password -> Text,
        amount -> Nullable<Int8>,
    }
}

diesel::joinable!(Recipient -> User (userid));

diesel::allow_tables_to_appear_in_same_query!(Ledger, Recipient, User,);
