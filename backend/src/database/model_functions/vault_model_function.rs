use crate::{
    database::model::{DbVaultBalance, UpdateVaultBalance},
    schema::vault_balances,
};
use diesel::prelude::*;

pub fn get_vault(conn: &mut PgConnection) -> DbVaultBalance {
    vault_balances::table
        .first(conn)
        .expect("Error loading vault balance")
}

pub fn update_vault_sol(conn: &mut PgConnection, sol_change: i64) -> DbVaultBalance {
    let vault = get_vault(conn);
    let new_sol_reserve = vault.sol_reserve + sol_change;

    diesel::update(vault_balances::table.find(vault.id))
        .set(vault_balances::sol_reserve.eq(new_sol_reserve))
        .get_result(conn)
        .expect("Error updating vault SOL reserve")
}

pub fn update_vault_fees(conn: &mut PgConnection, fee_change: i64) -> DbVaultBalance {
    let vault = get_vault(conn);
    let new_usdc_fees = vault.usdc_fees + fee_change;

    diesel::update(vault_balances::table.find(vault.id))
        .set(vault_balances::usdc_fees.eq(new_usdc_fees))
        .get_result(conn)
        .expect("Error updating vault fees")
}

pub fn update_vault_after_airdrop(conn: &mut PgConnection, airdrop_amount: i64) -> DbVaultBalance {
    let vault = get_vault(conn);
    let new_sol_reserve = vault.sol_reserve + airdrop_amount;
    let new_airdrop_count = vault.airdrop_count + 1;

    diesel::update(vault_balances::table.find(vault.id))
        .set((
            vault_balances::sol_reserve.eq(new_sol_reserve),
            vault_balances::last_airdrop_amount.eq(airdrop_amount),
            vault_balances::last_airdrop_timestamp.eq(chrono::Utc::now().naive_utc()),
            vault_balances::airdrop_count.eq(new_airdrop_count),
        ))
        .get_result(conn)
        .expect("Error updating vault after airdrop")
}

pub fn can_airdrop(conn: &mut PgConnection) -> bool {
    let vault = get_vault(conn);

    match vault.last_airdrop_timestamp {
        Some(timestamp) => {
            let cooldown_seconds = 7200i64;
            let elapsed = chrono::Utc::now().naive_utc().timestamp() - timestamp.timestamp();
            elapsed >= cooldown_seconds
        }
        None => true,
    }
}

pub fn check_airdrop_threshold(conn: &mut PgConnection, threshold: i64) -> bool {
    let vault = get_vault(conn);
    vault.usdc_fees >= threshold
}
