# Security Audit Report: Remitly Solana Contract

## Overview

This document outlines the security vulnerabilities identified in the Remitly Solana smart contract along with their severity levels and recommended solutions.

---

## Security Issues

### 1. 🔴 CRITICAL: Missing Mint Address Validation

**Location**: `initialize_accounts.rs:15`, `vault_transfer.rs:13`

**Problem**: The `usdc_mint` account is not validated against a known USDC mint address. An attacker could pass any SPL token mint and potentially trick users or the system.

**Impact**: Complete fund loss if users deposit to a fake token vault.

**Solution**: Add a constraint to verify the mint address:
```rust
#[account(
    constraint = usdc_mint.key() == EXPECTED_USDC_MINT @ CustomError::InvalidMint
)]
pub usdc_mint: InterfaceAccount<'info, Mint>,
```

Or store the expected mint in a config account and validate against it.

---

### 2. 🔴 CRITICAL: PDA Seed Mismatch Between Instructions

**Location**: `initialize_accounts.rs:27` vs `vault_transfer.rs:118-121`

**Problem**: 
- Initialize uses seeds: `[b"user_usdc_ata", usdc_mint.key().as_ref()]`
- Transfer uses seeds: `[b"pool_state_v3", usdc_mint.as_ref()]`

These don't match! The transfer function will fail or use a completely different PDA.

**Impact**: Transfer functionality broken; potential for unintended account access.

**Solution**: Use consistent seed patterns across all instructions:
```rust
// Define seeds in a central location
pub const VAULT_SEED: &[u8] = b"vault";
pub const STATE_SEED: &[u8] = b"state";
```

---

### 3. 🔴 CRITICAL: Missing `init` Constraint on State Account

**Location**: `initialize_accounts.rs:21`

**Problem**: The `main_state_account` is declared but not initialized with `#[account(init, ...)]`. It's expected to already exist, but there's no instruction to create it.

**Impact**: Program cannot function as the state account doesn't exist.

**Solution**: Either:
1. Add `init` constraint with proper seeds and payer
2. Create a separate instruction to initialize the state account first

---

### 4. 🟠 HIGH: Missing Signer Authority Validation

**Location**: `vault_transfer.rs:25-30`

**Problem**: The transfer instruction uses `main_state_account` as the authority for token transfers, but doesn't verify that the actual signer has permission to trigger this transfer. The signer is marked mutable but their authority isn't validated.

**Impact**: Potential unauthorized transfers if accounts can be crafted correctly.

**Solution**: Add relationship validation:
```rust
#[account(
    mut,
    token::mint = usdc_mint,
    token::authority = signer,  // User's own ATA
)]
pub user_usdc_ata: InterfaceAccount<'info, TokenAccount>,
```

---

### 5. 🟠 HIGH: No Access Control / Admin Validation

**Location**: All instructions

**Problem**: There's no admin/owner validation. Anyone can call `initialize` and `transfertovault`.

**Impact**: 
- Multiple vault initializations
- Unauthorized operations

**Solution**: Add admin validation:
```rust
#[account(
    constraint = signer.key() == main_state_account.admin @ CustomError::Unauthorized
)]
pub signer: Signer<'info>,
```

---

### 6. 🟠 HIGH: User's ATA Authority Mismatch

**Location**: `vault_transfer.rs:25-26`

**Problem**: The `user_usdc_ata` has `token::authority = main_state_account`, meaning the **program** controls the user's tokens, not the user themselves. This is unusual and dangerous.

**Impact**: Users lose control of their deposited funds.

**Solution**: 
- For user deposits: authority should be the signer (user)
- For vault withdrawals: authority should be the PDA

---

### 7. 🟡 MEDIUM: Empty Errors Module

**Location**: `errors.rs`

**Problem**: The errors module is empty. Custom errors are defined inline in `vault_transfer.rs` but not centralized.

**Impact**: Inconsistent error handling; harder to maintain.

**Solution**: Define all errors in `errors.rs`:
```rust
use anchor_lang::prelude::*;

#[error_code]
pub enum ContractError {
    #[msg("Invalid USDC mint address")]
    InvalidMint,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Insufficient funds for transfer")]
    InsufficientFunds,
    #[msg("Account already initialized")]
    AlreadyInitialized,
}
```

---

### 8. 🟡 MEDIUM: Missing Account Validation Constraints

**Location**: `vault_transfer.rs:22`, `initialize_accounts.rs:21`

**Problem**: `main_state_account` lacks seed constraints to verify it's the correct PDA.

**Impact**: Wrong account could be passed.

**Solution**: Add seeds constraint:
```rust
#[account(
    seeds = [b"state", usdc_mint.key().as_ref()],
    bump = main_state_account.bump,
)]
pub main_state_account: Account<'info, MainAccountShape>,
```

---

### 9. 🟡 MEDIUM: No Reentrancy Protection

**Location**: `vault_transfer.rs`

**Problem**: No reentrancy guards on the transfer function.

**Impact**: Potential reentrancy attacks if composing with other programs.

**Solution**: Use a state flag or Anchor's built-in reentrancy guards.

---

### 10. 🟢 LOW: Missing Amount Validation

**Location**: `vault_transfer.rs:41`

**Problem**: No check for `amount == 0`. Zero-amount transfers waste compute units.

**Impact**: Resource waste, potential for spam transactions.

**Solution**: Add validation:
```rust
require!(amount > 0, ContractError::InvalidAmount);
```

---

### 11. 🟢 LOW: Unused Imports and Dead Code

**Location**: Various files

**Problem**: Commented-out fee logic, unused imports.

**Impact**: Code maintainability issues.

**Solution**: Remove dead code or implement it properly.

---

## Summary Table

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | Missing mint validation | 🔴 CRITICAL | Open |
| 2 | PDA seed mismatch | 🔴 CRITICAL | Open |
| 3 | Missing init on state account | 🔴 CRITICAL | Open |
| 4 | Missing signer authority check | 🟠 HIGH | Open |
| 5 | No access control | 🟠 HIGH | Open |
| 6 | User ATA authority mismatch | 🟠 HIGH | Open |
| 7 | Empty errors module | 🟡 MEDIUM | Open |
| 8 | Missing account constraints | 🟡 MEDIUM | Open |
| 9 | No reentrancy protection | 🟡 MEDIUM | Open |
| 10 | Missing zero-amount check | 🟢 LOW | Open |
| 11 | Dead code | 🟢 LOW | Open |

---

## Recommendations Priority

1. **Immediately fix** all CRITICAL issues before any deployment
2. **Address HIGH** issues before testnet deployment
3. **Fix MEDIUM** issues before mainnet deployment
4. **Consider LOW** issues for code quality

---

## Testing Recommendations

1. Test with wrong mint address (should fail)
2. Test with uninitialized accounts (should fail)
3. Test with zero amount transfers (should fail)
4. Test unauthorized access attempts (should fail)
5. Test successful initialization and transfer flows
6. Test double initialization attempts (should fail)

---

*Generated: 2026-02-10*
