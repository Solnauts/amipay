//make the handle user message function
use crate::controllers::ai_controller::{RequestBody, get_ai_response};
use crate::utility::get_user_ata_balance;

//this function should contain the stream of the websocket message for conversating with the client
pub async fn handle_user_message(user_message: String, user_id: i32) {
    let serealized_message = serde_json::from_str::<RequestBody>(&user_message).unwrap();

    //call the database for user_info

    // call the existing ai controller
    let intent_response = get_ai_response(serealized_message).await;

    //extract the intent from the upper response
    match intent_response {
        // transfer logic
        s if s.intent == "transfer".to_string() => {
            println!("user want to send the money");

            //call the check balance function
            get_user_ata_balance(unqiue_id, amount_claim)

            //if pass
            //call the check the recipient function

            //if pass
            //call the transfer function (transfer from user usdc ata to main vault and then update
            //the data base)

            //the logic of account balance updation always be the difference of ledger so work
            //accordingly

            //if pass
            //send the transaction success/error to the user
        }

        //for checking balance
        s if s.intent == "check_balance".to_string() => {
            println!("user want to check the balance");

            //call the check balance function for this can query both the user
        }

        //for transaction history
        s if s.intent == "transaction_history".to_string() => {
            println!("user want to see the transaction history");

            //call the get transaction history function for this can query both the user
        }

        //if intent doesn't match
        _ => {
            println!("invalid request");
        }
    }
}

//handle user message function
pub fn handle_action_response() {}
