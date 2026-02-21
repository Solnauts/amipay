//make the handle user message function
use crate::controllers::ai_controller::{RequestBody, get_ai_response};
use crate::database::model::DbUser;
use crate::database::model_functions::{
    get_user_info,
    user_model_function::{
        UpdateUserLedgerRequest, UserInfoRequest, UserInfoResponse, add_user_ledger,
    },
};
use crate::schema::recipient;
use crate::utility::{get_user_ata_balance, transfer_to_vault};

//this function should contain the stream of the websocket message for conversating with the client
pub async fn handle_user_message(user_message: String, user_id: i32) {
    let serealized_message = serde_json::from_str::<RequestBody>(&user_message).unwrap();

    //call the database for user_info
    let request_payload = UserInfoRequest {
        intent: "user_info".to_string(),
        user_id: user_id,
        recipient_name: None,
    };

    let user_info = get_user_info(request_payload);

    let UserInfoResponse::FullInfo(user_info) = user_info else {
        return;
    };

    // call the existing ai controller
    let intent_response = get_ai_response(serealized_message).await;

    //get the value out of it
    let intent_result = Box::leak(Box::new(intent_response));

    let user_info_ref: &'static DbUser = Box::leak(Box::new(user_info));

    //extract the intent from the upper response
    match intent_result {
        // transfer logic
        response if response.intent == "transfer".to_string() => {
            println!("user want to send the money");

            //call the check balance function
            get_user_ata_balance(
                user_info_ref.unique_id.to_string(),
                response.amount.unwrap(),
            );

            //call the check the recipient function
            let request_payload = UserInfoRequest {
                intent: "recipient".to_string(),
                user_id: user_id,
                recipient_name: None,
            };

            let recipient = get_user_info(request_payload);

            let UserInfoResponse::Recipient(recipient) = recipient else {
                return;
            };

            //if pass
            //call the transfer function (transfer from user usdc ata to main vault and then update
            //the data base)
            let transfer_response = transfer_to_vault(
                user_info_ref.unique_id.to_string(),
                response.amount.unwrap(),
            );

            //the logic of account balance updation always be the difference of ledger so work
            //accordingly
            match transfer_response {
                Ok(transfer_response) => {
                    if transfer_response.success == true {
                        //update the ledger of the sender
                        let sender_ledger_request = UpdateUserLedgerRequest {
                            user_id: user_info_ref.id,
                            sender_id: user_info_ref.id,
                            receiver_id: recipient.userid,
                            amount: response.amount.unwrap() as i64,
                            currency: response.currency.clone().unwrap(),
                            tx_signature: None,
                            status: "confirmed".to_string(),
                        };

                        //sender
                        let sender_ledger_updation_result = add_user_ledger(sender_ledger_request);

                        //recipient ledger request
                        let recipient_ledger_request = UpdateUserLedgerRequest {
                            user_id: recipient.userid,
                            sender_id: user_info_ref.id,
                            receiver_id: recipient.userid,
                            amount: response.amount.unwrap() as i64,
                            currency: response.currency.clone().unwrap(),
                            tx_signature: None,
                            status: "confirmed".to_string(),
                        };

                        //sender ledger request
                        let recipient_send_request

                        

                    }
                }
                Err(err) => {
                    println!("error sending transaction : {}", err);
                    //send the error to the user
                }
            }
        }

        //for checking balance
        s if s.intent == "check_balance".to_string() => {
            println!("user want to check the balance");

            //call the check balance function for this can query both the user
            //call the database for user_info
            let request_payload = UserInfoRequest {
                intent: "amount".to_string(),
                user_id: user_id,
                recipient_name: None,
            };
            let user_info = get_user_info(request_payload);
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
