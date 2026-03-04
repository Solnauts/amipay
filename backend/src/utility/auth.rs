use crate::database::{
    establish_connection, 
    model_functions::alias_model_function::is_alias_exists,
};
use petname::petname;
use rand::{self, Rng};

/// Create a unique alias for a user
pub fn create_unique_alias() -> Vec<String> {
    let mut alias_vec: Vec<String> = Vec::new();

    loop {
        let mut alias = petname(2, "").expect("failed to load petname");
        alias = alias.to_lowercase();

        //create a random number
        let mut rng = rand::thread_rng();
        let random_number = rng.gen_range(0..100);

        //create the main suffix
        let suffix = "@amipay";
        let main_alias = format!("{}{}{}", alias, random_number, suffix);

        alias_vec.push(main_alias);
        if alias_vec.len() == 10 {
            break;
        }
    }

    //call is_alias_exist function to check if the alias exists in the database
    let mut conn = establish_connection().unwrap();

    //call the database function to check the alias vec exist or not
    let main_alias_vec = is_alias_exists(&mut conn, alias_vec);

    main_alias_vec
}
