# Remitly2 Contract Documentation

## Overview

Remitly2 is a **Solana smart contract** built with Anchor/Rust for a USDC vault/remittance system. It operates on devnet and allows users to deposit USDC into program-controlled vaults, which can then be withdrawn (claimed) with a configurable fee deducted.

The contract collects fees in two stages:
- **Half fee** at deposit (transfertovault)
- **Half fee** at claim (claim_by_user)

---

## Program Configuration

### Static Constants

| Constant | Value | Location |
|----------|-------|----------|
| Program ID | `HeHSU8GmNjDF7kwM7j2fbheeigdZD9AJzeMC2u5SGCs5` | `lib.rs:10` |
| USDC Mint | `USDCoctVLVnvTXBEuP9s8hntucdJokbo17RwHuNXemT` | Multiple files |
| Admin | `9XuNexvJhHUMxtKBdzsF1zsffAMzGbp4JuRAWaevxZAJ` | `create_main_accounts.rs:8` |

### Constraints

- **Fee limit**: Maximum 5% (500 basis points)
- **Token**: USDC only (devnet)
- **Decimals**: 6

---

## Account Structure

### 1. MainAccountShape

PDA that stores the program's global state.

```rust
pub struct MainAccountShape {
    pub admin_signer: Pubkey,           // Admin who controls the program
    pub usdc_mint: Pubkey,              // USDC mint address
    pub main_vault_account: Pubkey,     // Main vault PDA
    pub self_bump: u8,                  // PDA bump for main_state
    pub main_usdc_vault_bump: u8,       // PDA bump for vault
    pub fee: u64,                       // Fee percentage (max 500)
    pub fee_collector_usdc_ata: Pubkey, // Program-owned ATA for fee collection
}
```

### 2. PDA Derivation Seeds

| Account | Seeds |
|---------|-------|
| main_state | `["main_state", usdc_mint, signer]` |
| main_usdc_vault | `["main_usdc_vault", usdc_mint, signer]` |
| user_usdc_ata | `["user_usdc_ata", unique_id, usdc_mint]` |
| fee_collector_usdc_ata | Standard ATA derivation (owner = main_state, mint = usdc_mint) |

---

## Instructions

### 1. createMainAccounts

**Purpose**: Initializes the program for the first time - creates main_state PDA, main_usdc_vault, and fee_collector_usdc_ata.

**Parameters**:
- `fee: u64` - Fee percentage (max 500 = 5%)

**Accounts Required**:
| Account | Type | Description |
|---------|------|-------------|
| signer | Signer | Admin signer (must match hardcoded ADMIN) |
| usdc_mint | Mint | USDC mint (must match hardcoded USDC_MINT) |
| system_program | Program | System program |
| main_state_account | PDA | Main state account (init_if_needed) |
| fee_collector_usdc_ata | TokenAccount | Program-owned ATA for fees (init_if_needed) |
| token_program | Interface | Token interface |
| associated_token_program | Program | Associated Token program |
| main_usdc_vault | TokenAccount | Main vault (init_if_needed) |

**Validation**:
- Signer must match hardcoded ADMIN
- USDC mint must match hardcoded USDC_MINT
- Fee must be <= 500 (5%)

---

### 2. initialize

**Purpose**: Creates a user-specific USDC token account (user_usdc_ata).

**Parameters**:
- `unique_id: String` - Unique identifier for user

**Accounts Required**:
- `signer` - Must be admin_signer from main_state
- `usdc_mint` - USDC mint
- `system_program` - System program
- `main_state_account` - Existing main state
- `token_program` - Token interface
- `user_usdc_ata` - PDA for user's USDC account

**Returns**: User's USDC ATA public key (via `set_return_data`)

---

### 3. transfertovault

**Purpose**: Transfers USDC from user's PDA to the main vault, with half fee deducted.

**Parameters**:
- `amount: u64` - Amount to transfer

**Accounts Required**:
- `signer` - Must be admin_signer
- `usdc_mint` - USDC mint
- `system_program` - System program
- `token_program` - Token interface
- `main_state_account` - Main state PDA
- `fee_collector_usdc_ata` - Program-owned fee collector ATA
- `user_usdc_ata` - User's USDC token account
- `main_usdc_vault` - Main vault

**Flow**:
1. Validates amount > 0
2. Validates sufficient balance in user_usdc_ata
3. Calculates half fee: `amount * (fee / 2) / 10000`
4. Transfers net amount (after fee) from user_usdc_ata to main_usdc_vault
5. Transfers fee to fee_collector_usdc_ata

**Fee Calculation**:
```rust
fee_amount = amount * (fee / 2) / 10000
net_amount = amount - fee_amount
```

---

### 4. claim_by_user

**Purpose**: Allows user to withdraw USDC from the main vault, with half fee deducted.

**Parameters**:
- `amount: u64` - Amount to claim

**Accounts Required**:
- `signer` - Must be admin_signer
- `usdc_mint` - USDC mint
- `system_program` - System program
- `token_program` - Token interface
- `main_state_account` - Main state PDA
- `fee_collector_usdc_ata` - Program-owned fee collector ATA
- `user_usdc_ata` - User's USDC token account
- `main_usdc_vault` - Main vault

**Flow**:
1. Calculates half fee: `amount * (fee / 2) / 10000`
2. Transfers net amount (after fee) from main_usdc_vault to user_usdc_ata
3. Transfers fee to fee_collector_usdc_ata

**Fee Calculation**:
```rust
fee_amount = amount * (fee / 2) / 10000
net_amount = amount - fee_amount
```

---

### 5. MaunalInitialize

**Purpose**: Manual initialization with different seed pattern (for admin use).

**Accounts Required**:
- `signer` - Any signer (no admin check)
- `usdc_mint` - USDC mint
- `system_program` - System program
- `main_state_account` - Existing main state
- `token_program` - Token interface
- `user_usdc_ata` - User's USDC token account

**Note**: Uses different seed pattern (`["user_usdc_ata", usdc_mint]`) vs `initialize` (`["user_usdc_ata", unique_id, usdc_mint]`)

---

## Fee Collection System

### Overview

The contract collects fees in **two stages**:

| Stage | Instruction | Fee Amount |
|-------|------------|------------|
| 1. Deposit | `transfertovault` | Half of total fee (fee/2) |
| 2. Claim | `claim_by_user` | Half of total fee (fee/2) |
| **Total** | | Full fee (fee) |

### Example (fee = 100 = 1%)

1. **Deposit 1000 USDC**:
   - Fee: 1000 × (100/2) / 10000 = 5 USDC
   - Net to vault: 995 USDC

2. **Claim 995 USDC**:
   - Fee: 995 × (100/2) / 10000 ≈ 4.975 USDC
   - Net to user: ~990.025 USDC

3. **Total fee collected**: ~9.975 USDC (~1%)

### Fee Collector ATA

- **Owner**: `main_state_account` (program PDA)
- **Type**: Associated Token Account (ATA)
- **Derivation**: Standard ATA (owner = main_state_pda, mint = usdc_mint)
- **Purpose**: Holds all collected fees in USDC

---

## Error Codes

### InitializeAccountErrors

| Code | Message |
|------|---------|
| 6000 | `incorrect usdc mint address` |
| 6001 | `Admin is not verify` |
| 6002 | `unauthorized signer account` |
| 6003 | `Fee can be higher than the 5%` |

### TransferToVaultError

| Code | Message |
|------|---------|
| 6004 | `insufficient amount to transfer` |
| 6005 | `the amount should be greater then 0` |
| 6006 | `In multiply the calculation overflow` |

---

## Testing

### Test Files

- `tests/contract.ts` - Main test suite
- `tests/client.ts` - Solana Kit client setup

### Test Coverage

1. **Create Main Accounts**
   - Successful creation with all accounts
   - Double creation prevention
   - Field verification including fee_collector_usdc_ata

2. **Initialize**
   - Successful initialization
   - Wrong USDC mint rejection
   - Double initialization prevention

3. **Transfer to Vault**
   - Successful transfer with fee verification
   - Insufficient balance rejection
   - Zero amount rejection
   - Fee collection verification

4. **Claim By User**
   - Successful claim with fee verification
   - Fee collection verification

5. **Security Tests**
   - Unauthorized signer rejection
   - Wrong state account rejection
   - Wrong vault account rejection
   - Signer impersonation rejection

6. **Edge Cases**
   - Max u64 amount handling
   - Exact balance transfer

### Running Tests

```bash
cd contract
anchor build
anchor test
```

---

## Known Issues

None currently - all bugs have been fixed.

---

## Project Structure

```
Remitly2/
├── contract/
│   ├── programs/
│   │   └── contract/
│   │       └── src/
│   │           ├── lib.rs              # Main program entry
│   │           ├── brainstructs.rs      # Account structures
│   │           ├── errors.rs            # Error definitions
│   │           └── instructions/
│   │               ├── mod.rs
│   │               ├── create_main_accounts.rs
│   │               ├── initialize_accounts.rs
│   │               ├── manual_initialize_accounts.rs
│   │               ├── vault_transfer.rs
│   │               └── claim_transfer.rs
│   ├── tests/
│   │   ├── contract.ts
│   │   └── client.ts
│   ├── migrations/
│   │   └── deploy.ts
│   ├── Anchor.toml
│   ├── package.json
│   └── tsconfig.json
├── backend/
├── frontend/
├── databaseutility/
└── git-command.md
```

---

## Dependencies

### Rust (Cargo)
- `anchor-lang` - Anchor framework
- `anchor-spl` - SPL token integration
- `anchor-spl::associated_token` - Associated Token Account

### TypeScript/Node
- `@coral-xyz/anchor` - Anchor client
- `@solana/spl-token` - Token operations
- `@solana/web3.js` - Solana JavaScript API
- `@solana/kit` - Solana Kit for RPC calls

---

## Usage Flow

```
1. Admin calls createMainAccounts(fee)
   ├── Creates main_state PDA
   ├── Creates main_usdc_vault (program-owned)
   └── Creates fee_collector_usdc_ata (program-owned ATA)

2. User calls initialize(unique_id)
   └── Creates user_usdc_ata PDA

3. User deposits USDC to user_usdc_ata
   └── Standard SPL transfer from user's wallet

4. Admin calls transfertovault(amount)
   ├── Transfers net amount to main_usdc_vault
   └── Transfers half fee to fee_collector_usdc_ata

5. User calls claim_by_user(amount)
   ├── Transfers net amount to user_usdc_ata
   └── Transfers half fee to fee_collector_usdc_ata
```

---

## Security Considerations

1. **Admin-only operations**: Only the admin_signer can transfer to vault and claim
2. **PDA-controlled tokens**: All token accounts are owned by PDAs, not directly by users
3. **Mint validation**: Only the hardcoded USDC mint is accepted
4. **Fee caps**: Maximum 5% fee enforced on initialization
5. **Program-owned fee ATA**: Fee collector is owned by program, enabling future on-chain swap functionality

---

## Notes

- This contract runs on **devnet only**
- Uses Token-2022 compatible interfaces (`TokenInterface`)
- All amounts are in raw units (10^6 for USDC)
- Program uses CPI (Cross-Program Invocation) for token transfers
- Fee collector ATA is program-owned, allowing for future USDC → SOL swap implementation
