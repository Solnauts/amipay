diesel::table! {
    user(id) {
        name -> VarChar,
        id -> Int4,
        password -> VarChar,
        recipients -> Array<VarChar>
    }
}
