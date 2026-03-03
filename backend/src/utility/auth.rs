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

    return alias_vec;
}
