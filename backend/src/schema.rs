use diesel::sql_types::VarChar;

diesel::table! {
    user(id) {
        name -> VarChar,
        id -> Int4,
        password -> VarChar,
        address -> VarChar,
        ledger -> Array<ledger>,
        recipients -> Array<VarChar>
    }
}

diesel::table! {
    ledger(id){
        from  -> VarChar,
        id ->  Int4,
        to -> Varchar,
        amount -> BigInt
    }

}
