//import the crate called name used to import random crate 
 



/// Create a unique alias for a user
pub fn create_unique_alias() -> String {
    let mut alias = username.to_string();
    let mut i = 1;
    while alias.len() < 6 {
        alias.push_str(&i.to_string());
        i += 1;
    }
    alias
}