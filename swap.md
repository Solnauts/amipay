# Solana Devnet Swap Service - MVP Plan

## Problem Statement
- Solana Devnet has no liquidity pools (Jupiter, Raydium, Orca don't work)
- Devnet faucet has rate limits (2 requests per ~2 hours)
- Need a way to continuously swap USDC → SOL for testing

## Solution Architecture

### High-Level Flow
```
User Request: "Swap 1 USDC for SOL"
         │
         ▼
┌─────────────────────┐
│  Backend Service    │
│  (REST API Server)  │
└─────────┬───────────┘
          │
          ▼
┌──────────────────────────────────────┐
│  1. Validate request                  │
│  2. Burn/Transfer USDC from user    │
│  3. Calculate SOL equivalent        │
│  4. Send SOL from reserve           │
│  5. Track USDC fees collected        │
│  6. Check threshold → trigger airdrop│
└──────────────────────────────────────┘
```

## System Components

### 1. REST API Server (Rust + Axum)
```
Endpoints:
- POST /swap          - Execute a swap
- GET  /status        - Service status (vault balance, queue)
- GET  /health        - Health check
```

### 2. Swap Service Core
```
Responsibilities:
- Accept user swap requests
- Burn USDC from user wallet
- Calculate SOL equivalent (fixed $150/SOL)
- Send SOL from reserve to user
- Track accumulated USDC fees
- Trigger airdrop when threshold reached
```

### 3. Vault Manager
```
USDC Vault:
- Tracks fees collected in USDC
- Threshold: 1 SOL worth (~$150)

SOL Reserve:
- Initial funding: 2-5 SOL via airdrop
- Used to pay gas fees and user swaps
- Replenished when threshold reached
```

### 4. Airdrop Manager
```
Logic:
- Track last airdrop timestamp
- Rate limit: 1 airdrop per 2 hours
- Queue airdrop requests if needed
- Destination: Admin wallet (your wallet)
```

## Data Models

### SwapRequest
```rust
struct SwapRequest {
    user_wallet: Pubkey,      // User's wallet address
    usdc_amount: u64,         // Amount in lamports (6 decimals)
    recipient: Option<Pubkey>, // Optional: send SOL to different wallet
}
```

### SwapResponse
```rust
struct SwapResponse {
    status: SwapStatus,       // Completed, Pending, Failed
    usdc_burned: u64,         // USDC burned
    sol_received: u64,        // SOL received (lamports)
    transaction_hash: String, // On-chain transaction
    queue_position: Option<usize>, // If pending
}
```

### ServiceStatus
```rust
struct ServiceStatus {
    usdc_vault_balance: u64,      // USDC collected as fees
    sol_reserve: u64,              // SOL in reserve
    pending_swaps: usize,          // Queue length
    last_airdrop: u64,            // Timestamp
    airdrop_ready: bool,           // Can request airdrop?
}
```

## Implementation Phases

### Phase 1: Core Service (Priority: HIGH)
- [ ] Set up Axum HTTP server
- [ ] Implement swap endpoint
- [ ] Add USDC burn logic
- [ ] Add SOL transfer logic
- [ ] Basic price calculation ($150/SOL fixed)

### Phase 2: Vault & Fee Tracking (Priority: HIGH)
- [ ] Track USDC fees collected
- [ ] Track SOL reserve balance
- [ ] Implement threshold check (≥$150 USDC)
- [ ] Add status endpoint

### Phase 3: Airdrop Automation (Priority: MEDIUM)
- [ ] Implement airdrop cooldown tracker
- [ ] Auto-trigger airdrop when threshold reached
- [ ] Add retry logic with backoff
- [ ] Queue airdrop requests if rate limited

### Phase 4: Queue System (Priority: MEDIUM)
- [ ] Implement request queue
- [ ] Process swaps in order
- [ ] Return queue position to users
- [ ] Handle timeouts

### Phase 5: Monitoring (Priority: LOW)
- [ ] Add logging
- [ ] Health check endpoint
- [ ] Metrics dashboard

## API Specification

### POST /swap
```json
Request:
{
  "user_wallet": "7eGbwQouEwFdPegxPy7ioBXvQSeVTRBiy15XEyoSJ4As",
  "usdc_amount": 1000000,
  "recipient": "optional_other_wallet"
}

Response (200):
{
  "status": "completed",
  "usdc_burned": 1000000,
  "sol_received": 6666666,
  "transaction_hash": "abc123..."
}

Response (202 - Queued):
{
  "status": "pending",
  "queue_position": 2,
  "estimated_time": "2 hours"
}
```

### GET /status
```json
Response:
{
  "usdc_vault_balance": 2500000,
  "sol_reserve": 1500000000,
  "pending_swaps": 2,
  "last_airdrop": 1700000000,
  "airdrop_ready": false,
  "next_airdrop_in": 1800
}
```

## Configuration
```rust
const SOL_PRICE_USD: f64 = 150.0;           // Fixed price
const FEE_PERCENT: u64 = 30;                // 0.3% fee
const AIRDROP_THRESHOLD_USDC: u64 = 150_000_000; // $150 worth
const AIRDROP_AMOUNT_SOL: u64 = 2_000_000_000; // 2 SOL
const AIRDROP_COOLDOWN_SECS: u64 = 7200;    // 2 hours
```

## File Structure
```
sol-swap/
├── src/
│   ├── main.rs           # Entry point
│   ├── server.rs         # HTTP server
│   ├── swap.rs           # Swap logic
│   ├── vault.rs          # Vault management
│   ├── airdrop.rs        # Airdrop handling
│   ├── queue.rs          # Request queue
│   └── models.rs         # Data models
├── Cargo.toml
└── .env
```

## External Dependencies
- solana-sdk = "1.18"
- solana-client = "1.18"
- spl-token = "4.0"
- axum = "0.7"
- tokio = "1"
- serde = "1.0"
- anyhow = "1.0"

## Testing Strategy
1. Unit tests for swap calculations
2. Integration tests with Devnet
3. Manual testing with wallet
4. Load testing queue system

## Known Constraints
- Devnet airdrop rate limit: ~2 requests per 2 hours
- No real DEX pools on Devnet
- Price uses fixed fallback ($150/SOL)

## Success Criteria
- [ ] Users can swap USDC for SOL
- [ ] Fee collection works
- [ ] Airdrop triggers automatically at threshold
- [ ] Queue handles rate limits gracefully
- [ ] Service remains funded for continuous operation

## Future Enhancements
- Real-time price feeds
- Multiple token support (USDT, etc.)
- Admin dashboard
- WebSocket updates
- Mainnet support
