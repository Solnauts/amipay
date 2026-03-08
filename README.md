# Remitly — AI-Powered Stablecoin Remittance

> **"Send $100 to Mom"** — and the AI handles the rest.

A conversational remittance application where natural-language commands are parsed by a local AI model, validated by a secure backend, and settled on-chain via Solana smart contracts using USDC stablecoins.

---

## Table of Contents

1. [Vision & Core Idea](#1-vision--core-idea)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Transaction Flow — Step by Step](#3-transaction-flow--step-by-step)
4. [Data Modeling](#4-data-modeling)
5. [Communication Protocol — HTTP vs WebSocket](#5-communication-protocol--http-vs-websocket)
6. [AI Layer Design — Security Boundary](#6-ai-layer-design--security-boundary)
7. [Connection Model — User ↔ AI ↔ Backend](#7-connection-model--user--ai--backend)
8. [Technology Stack](#8-technology-stack)
9. [Security Architecture](#9-security-architecture)
10. [DevOps & Infrastructure](#10-devops--infrastructure)
11. [Current Codebase Status](#11-current-codebase-status)
12. [Open Questions & Future Brainstorming](#12-open-questions--future-brainstorming)
13. [Getting Started (Development)](#13-getting-started-development)

---

## 1. Vision & Core Idea

The average user doesn't care about wallets, token mints, associated token accounts, or RPC calls. They care about one thing: **sending money to someone they love, fast and cheap.**

Remitly bridges that gap:

| What the user sees | What happens under the hood |
|---|---|
| "Send $100 to Mom" | AI parses intent → Backend validates balance & recipient → Solana contract executes USDC transfer |
| "Show my last 5 transactions" | AI parses intent → Backend queries ledger → Returns formatted history |
| "Check balance" | AI parses intent → Backend reads on-chain USDC balance → Returns result |

The AI is **NOT** a chatbot. It is a **structured intent parser** — a translator between human language and machine-executable JSON commands. It never sees private keys, never signs transactions, and never holds funds.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (Next.js)                         │
│                                                                     │
│   ┌─────────────┐    ┌──────────────┐    ┌─────────────────────┐   │
│   │  Chat UI     │    │ Recipient    │    │  Transaction        │   │
│   │  (WebSocket) │    │ Selector     │    │  History View       │   │
│   └──────┬───────┘    └──────────────┘    └─────────────────────┘   │
│          │                                                          │
└──────────┼──────────────────────────────────────────────────────────┘
           │  WebSocket (chat flow)
           │  REST (account mgmt, history, auth)
           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND (Actix Web / Rust)                     │
│                                                                     │
│   ┌───────────────┐   ┌─────────────────┐   ┌──────────────────┐   │
│   │ AI Controller │   │ User Controller │   │ Swap Controller  │   │
│   │ (Intent Parse)│   │ (Auth/Accounts) │   │ (Jupiter DEX)    │   │
│   └───────┬───────┘   └────────┬────────┘   └────────┬─────────┘   │
│           │                    │                      │             │
│   ┌───────▼───────┐   ┌───────▼────────┐             │             │
│   │ Ollama (Local │   │ PostgreSQL     │             │             │
│   │ AI Instance)  │   │ (Diesel ORM)   │             │             │
│   └───────────────┘   └────────────────┘             │             │
│                                                       │             │
│   ┌───────────────────────────────────────────────────▼─────────┐   │
│   │                Transaction Orchestrator                     │   │
│   │  (Balance Check → Recipient Resolve → Build Tx → Submit)   │   │
│   └───────────────────────────────┬─────────────────────────────┘   │
│                                   │                                 │
└───────────────────────────────────┼─────────────────────────────────┘
                                    │  RPC (solana_client)
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     SOLANA BLOCKCHAIN (Devnet/Mainnet)               │
│                                                                     │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │              Anchor Smart Contract                            │  │
│   │                                                              │  │
│   │  ┌────────────────────┐  ┌───────────────┐  ┌────────────┐  │  │
│   │  │ create_main_accts  │  │  initialize   │  │ transferTo │  │  │
│   │  │ (Admin Setup)      │  │  (User ATA)   │  │ Vault      │  │  │
│   │  └────────────────────┘  └───────────────┘  └────────────┘  │  │
│   │                                                              │  │
│   │  MainAccountShape (PDA) ──▶ Main USDC Vault (PDA)           │  │
│   └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Transaction Flow — Step by Step

This is the **core flow** of the application, broken down into every decision point.

### Phase 1: User Input → AI Parsing

```
User types: "Send $100 to Mom"
         │
         ▼
┌─────────────────────────────────┐
│   Frontend sends via WebSocket: │
│   { "value": "Send $100 to Mom" }│
└──────────────┬──────────────────┘
               ▼
┌─────────────────────────────────┐
│   Backend → Ollama AI (Local)   │
│                                 │
│   AI Output (structured JSON):  │
│   {                             │
│     "intent": "transfer",       │
│     "amount": 100,              │
│     "currency": "USDC",         │
│     "recipient": "mom",         │
│     "history_limit": null,      │
│     "time_period": null         │
│   }                             │
└──────────────┬──────────────────┘
               ▼
         Phase 2 begins
```

### Phase 2: Backend Validation & Recipient Resolution

```
AI JSON received by Transaction Orchestrator
         │
         ▼
┌──────────────────────────────────────┐
│  STEP 1: Balance Check               │
│  Query user's on-chain USDC balance  │
│                                      │
│  balance >= amount?                  │
│    ├─ NO  → Return to chat:          │
│    │    "Insufficient balance.        │
│    │     Current: $42. Please         │
│    │     recharge your account."      │
│    │    [FLOW ENDS]                   │
│    │                                  │
│    └─ YES → Continue to Step 2       │
└──────────────┬───────────────────────┘
               ▼
┌──────────────────────────────────────┐
│  STEP 2: Recipient Resolution        │
│  Query DB: recipients WHERE          │
│    name ILIKE '%mom%'                │
│    AND userid = current_user.id      │
│                                      │
│  Results count?                      │
│    ├─ 0 matches (Scenario 1):        │
│    │    Return to chat:              │
│    │    "No recipient named 'Mom'     │
│    │     found. Please add a          │
│    │     recipient first."            │
│    │    [FLOW ENDS]                   │
│    │                                  │
│    ├─ 1 match (Scenario 2):          │
│    │    Return to chat:              │
│    │    "Send $100 USDC to            │
│    │     Mom (Sarah Johnson)?         │
│    │     [Confirm] [Cancel]"          │
│    │    [WAIT FOR USER CONFIRMATION]  │
│    │                                  │
│    └─ N matches (Scenario 3):        │
│         Return to chat:              │
│         "Multiple recipients found:   │
│          1. Mom (Sarah Johnson)       │
│          2. Mom (Maria Garcia)        │
│          Choose one."                 │
│         [WAIT FOR USER SELECTION]     │
└──────────────┬───────────────────────┘
               ▼
         Phase 3 begins
```

### Phase 3: Transaction Execution

```
User confirms recipient selection
         │
         ▼
┌──────────────────────────────────────┐
│  Build Final Transaction JSON:       │
│  {                                   │
│    "intent": "send",                 │
│    "sender": "user_pubkey_abc...",   │
│    "recipient": "recip_pubkey_xyz",  │
│    "amount": 100_000_000,            │
│    "currency": "USDC"               │
│  }                                   │
│                                      │
│  Note: amount in smallest unit       │
│  (USDC has 6 decimals)              │
└──────────────┬───────────────────────┘
               ▼
┌──────────────────────────────────────┐
│  Execute Solana Transaction:         │
│                                      │
│  1. Get latest blockhash             │
│  2. Build instruction for            │
│     `transfertovault` on contract    │
│  3. Sign with backend authority      │
│  4. Send & confirm transaction       │
│  5. Record in ledger table           │
│  6. Return tx signature to user      │
└──────────────┬───────────────────────┘
               ▼
┌──────────────────────────────────────┐
│  Chat Response to User:              │
│  "✅ $100 USDC sent to Mom!          │
│   Tx: 5Uj3k...7xRm                  │
│   View on Explorer ↗"               │
└──────────────────────────────────────┘
```

---

## 4. Data Modeling

### 4.1 Database Schema (PostgreSQL)

```sql
-- Core user table (existing)
CREATE TABLE "user" (
    id       SERIAL PRIMARY KEY,
    name     TEXT NOT NULL,
    password TEXT NOT NULL,          -- ⚠️ Must be hashed (bcrypt/argon2)
    amount   BIGINT,                -- Cached balance (sync from chain)
    pubkey   BYTEA NOT NULL          -- Solana public key (32 bytes)
);

-- Recipients / contacts (existing)
CREATE TABLE recipient (
    id       SERIAL PRIMARY KEY,
    name     TEXT NOT NULL,          -- Display name ("Mom", "Dad", etc.)
    userid   INT NOT NULL REFERENCES "user"(id),
    -- 🔴 NEEDED: recipient's Solana pubkey or wallet address
    -- recipient_pubkey BYTEA NOT NULL
);

-- Transaction ledger (existing, needs expansion)
CREATE TABLE ledger (
    id          SERIAL PRIMARY KEY,
    senderId    INT NOT NULL REFERENCES "user"(id),
    receiverId  INT NOT NULL REFERENCES "user"(id),
    -- 🔴 NEEDED: Additional fields
    -- amount      BIGINT NOT NULL,
    -- currency    TEXT NOT NULL DEFAULT 'USDC',
    -- tx_signature TEXT,              -- Solana transaction signature
    -- status      TEXT NOT NULL,      -- 'pending', 'confirmed', 'failed'
    -- created_at  TIMESTAMPTZ DEFAULT NOW(),
    -- confirmed_at TIMESTAMPTZ
);

-- 🟢 NEW: Chat/Conversation sessions
CREATE TABLE conversation (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     INT NOT NULL REFERENCES "user"(id),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 🟢 NEW: Individual messages in a conversation
CREATE TABLE message (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversation(id),
    role            TEXT NOT NULL,       -- 'user', 'system', 'assistant'
    content         TEXT NOT NULL,       -- Display message
    intent_json     JSONB,              -- Parsed AI intent (if applicable)
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 🟢 NEW: Pending confirmations (for the multi-step flow)
CREATE TABLE pending_action (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         INT NOT NULL REFERENCES "user"(id),
    conversation_id UUID NOT NULL REFERENCES conversation(id),
    action_type     TEXT NOT NULL,       -- 'transfer_confirm', 'recipient_select'
    payload         JSONB NOT NULL,      -- The full transaction details
    status          TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'cancelled', 'expired'
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 On-Chain Account Model (Solana/Anchor)

```
MainAccountShape (PDA)
├── admin_signer: Pubkey         ← Backend's authority
├── usdc_mint: Pubkey            ← USDC mint address
├── main_vault_account: Pubkey   ← Platform's central USDC vault
├── self_bump: u8                ← PDA bump seed
└── main_usdc_vault_bump: u8     ← Vault PDA bump seed

User ATA (Associated Token Account)
├── Created via `initialize` instruction
├── Authority: MainAccountShape (PDA)
└── Mint: USDC

Transfer Flow:
  User ATA ──(transfertovault)──▶ Main USDC Vault ──(withdraw*)──▶ Recipient ATA
                                                       * to be implemented
```

### 4.3 AI Intent Schema

```jsonc
// Input: Natural language → Output: Structured JSON
{
    "intent": "transfer" | "check_balance" | "transaction_history" | "unknown",
    "amount": 100,           // number or null
    "currency": "USDC",      // string, default "USDC"
    "recipient": "mom",      // string or null — fuzzy name, NOT a pubkey
    "history_limit": null,   // number or null
    "time_period": null       // string or null (e.g., "7d")
}
```

**Critical design rule:** The AI only outputs the **human-readable recipient name** (like `"mom"`). It **never** sees or outputs wallet addresses, user IDs, private keys, or any sensitive data. The backend is solely responsible for resolving `"mom"` → `recipient.pubkey`.

---

## 5. Communication Protocol — HTTP vs WebSocket

### Recommendation: **Hybrid approach — WebSocket for chat, REST for everything else.**

| Concern | WebSocket | REST (HTTP) |
|---|---|---|
| Chat messages (real-time, multi-step) | ✅ **Use this** | ❌ Awkward for multi-step |
| Account creation / auth | ❌ Overkill | ✅ **Use this** |
| Transaction history queries | ❌ Not needed | ✅ **Use this** |
| Recipient management (CRUD) | ❌ Not needed | ✅ **Use this** |
| Transaction status updates | ✅ **Use this** (push) | ⚠️ Requires polling |

### Why WebSocket for the Chat Flow?

The **transfer flow is inherently multi-step and conversational:**

```
User: "Send $100 to Mom"
  ← System: "Multiple recipients found: 1. Mom (Sarah) 2. Mom (Maria)"
User: "1"
  ← System: "Send $100 USDC to Mom (Sarah Johnson)? [Confirm] [Cancel]"
User: "Confirm"
  ← System: "✅ Sent! Tx: 5Uj3k..."
```

This is a **stateful conversation** — each message depends on the previous context. With plain HTTP:
- You'd need the client to poll for responses
- Multi-step flows require tracking state across multiple disconnected requests
- No way to push status updates ("transaction confirmed on-chain!")

With **WebSocket:**
- Server can push messages at any time (confirmation prompts, status updates)
- Natural conversation feels responsive and instant
- State is maintained per-connection via `conversation_id`

### WebSocket Message Protocol

```jsonc
// Client → Server
{
    "type": "user_message",
    "conversation_id": "uuid-here",
    "content": "Send $100 to Mom"
}

// Client → Server (confirmation)
{
    "type": "action_response",
    "conversation_id": "uuid-here",
    "pending_action_id": "uuid-here",
    "response": "confirm"       // or "cancel", or selection index
}

// Server → Client (chat message)
{
    "type": "assistant_message",
    "conversation_id": "uuid-here",
    "content": "Send $100 USDC to Mom (Sarah Johnson)?",
    "actions": [                 // Optional interactive elements
        { "id": "confirm", "label": "✅ Confirm" },
        { "id": "cancel", "label": "❌ Cancel" }
    ],
    "pending_action_id": "uuid-here"
}

// Server → Client (transaction update)
{
    "type": "tx_status",
    "conversation_id": "uuid-here",
    "status": "confirmed",
    "tx_signature": "5Uj3k...7xRm",
    "explorer_url": "https://explorer.solana.com/tx/..."
}
```

### REST Endpoints (alongside WebSocket)

```
POST   /api/auth/register          — Create account + Solana wallet
POST   /api/auth/login             — Authenticate, receive JWT
GET    /api/user/balance            — Get current USDC balance
GET    /api/user/transactions       — Paginated transaction history
POST   /api/recipients              — Add a recipient
GET    /api/recipients              — List recipients
PUT    /api/recipients/:id          — Update recipient
DELETE /api/recipients/:id          — Remove recipient
POST   /api/swap                    — Jupiter swap (existing)
```

---

## 6. AI Layer Design — Security Boundary

### The Golden Rule

> **The AI is a TRANSLATOR, not an ACTOR.**  
> It translates human language → structured JSON. It never sees, touches, or manages anything sensitive.

### What the AI Sees

```
Input:  "Send $100 to Mom"
Output: { "intent": "transfer", "amount": 100, "currency": "USDC", "recipient": "mom" }
```

### What the AI NEVER Sees

| Sensitive Data | Why Not |
|---|---|
| Private keys | AI compromise = total fund loss |
| Wallet addresses | No need — backend resolves names to addresses |
| User IDs / database IDs | AI works with natural language only |
| Account balances | Backend checks balance independently |
| Transaction signatures | AI doesn't execute transactions |
| JWT tokens / auth credentials | AI is called server-side, not client-facing |
| Passwords | Obviously |

### AI Isolation Architecture

```
┌──────────────────────────────────────────┐
│          SECURITY BOUNDARY               │
│                                          │
│   ┌──────────┐      ┌────────────────┐  │
│   │ User msg │ ───▶ │   Ollama AI    │  │
│   │ (string) │      │   (Local)      │  │
│   │          │ ◀─── │                │  │
│   │ AI JSON  │      │  No network    │  │
│   │ (intent) │      │  No DB access  │  │
│   └──────────┘      │  No keys       │  │
│                      │  No state      │  │
│                      └────────────────┘  │
│                                          │
│   The AI container/process has:          │
│   ✅ Read-only access to model weights   │
│   ❌ No network access (except backend)  │
│   ❌ No filesystem access                │
│   ❌ No environment variables            │
│   ❌ No database connection              │
└──────────────────────────────────────────┘
```

### Current Implementation (Ollama Modelfile)

Your existing `Modelfile` correctly implements this principle:
- **Model:** `qwen3:1.7b` — small, fast, runs locally
- **System prompt:** Forces JSON-only output, no chatbot behavior
- **Temperature:** `0.0` — deterministic parsing, no creative responses
- **Output schema:** Strictly defined fields, null for inapplicable data

### AI Improvements to Consider

| Improvement | Details |
|---|---|
| **Input sanitization** | Strip anything that looks like a key/address before sending to AI |
| **Output validation** | Validate AI JSON against a strict schema before acting on it |
| **Fallback parsing** | If AI returns garbage → return "I didn't understand. Try: 'Send $100 to Mom'" |
| **Rate limiting** | Max N AI requests per user per minute |
| **Model upgrade path** | Current: Ollama local. Future: Could swap in a cloud model via API gateway (same interface) |

---

## 7. Connection Model — User ↔ AI ↔ Backend

### The Triangle That Isn't

A common misconception is that the User, AI, and Backend form a triangle. **They don't.** It's a linear pipeline where the **Backend is the orchestrator:**

```
   User ◄──── WebSocket ────► Backend ────► AI (Ollama)
                                │
                                ├────► PostgreSQL
                                │
                                └────► Solana RPC
```

**The user NEVER talks directly to the AI.** The backend:
1. Receives the user's message
2. Forwards ONLY the text to the AI
3. Receives the AI's structured JSON response
4. Validates and enriches it with real data (balances, recipients)
5. Decides what to send back to the user

This is critical because it means:
- The backend can **inject context** the AI doesn't have
- The backend can **override** bad AI outputs
- The backend can **audit** every interaction
- The AI can be **swapped out** without changing anything else

### Connection Lifecycle

```
1. User opens app
   └─▶ Frontend establishes WebSocket connection to Backend
       └─▶ Backend authenticates via JWT token in connection handshake
           └─▶ Connection is now AUTHENTICATED and PERSISTENT

2. User sends message
   └─▶ WebSocket message hits Backend
       └─▶ Backend extracts text, sends to Ollama (HTTP POST, local)
           └─▶ Ollama returns intent JSON
               └─▶ Backend validates intent
                   └─▶ Backend checks balance (Solana RPC)
                       └─▶ Backend resolves recipient (PostgreSQL)
                           └─▶ Backend sends response via WebSocket

3. User confirms action
   └─▶ Backend retrieves pending_action from DB
       └─▶ Backend builds Solana transaction
           └─▶ Backend signs and submits to Solana
               └─▶ Backend records in ledger
                   └─▶ Backend pushes confirmation via WebSocket
```

### State Management

| State | Where it lives |
|---|---|
| Auth session | JWT token (stateless, validated per request) |
| Conversation context | `conversation` + `message` tables |
| Pending confirmations | `pending_action` table (with TTL/expiry) |
| WebSocket connection | In-memory (Actix actor or connection map) |
| User balance | On-chain (USDC token account) + cached in `user.amount` |

---

## 8. Technology Stack

### 8.1 Frontend

| Technology | Purpose | Why |
|---|---|---|
| **Next.js 14+** (App Router) | Framework | SSR, file-based routing, excellent DX |
| **TypeScript** | Language | Type safety for complex message types |
| **WebSocket API** (native) | Real-time chat | Browser-native, no library needed |
| **TanStack Query** | REST data fetching | Caching, retry, optimistic updates |
| **Zustand** or **Jotai** | State management | Lightweight, no boilerplate |
| **Framer Motion** | Animations | Smooth chat message animations |
| **shadcn/ui** | UI Components | Beautiful, accessible, customizable |
| **Tailwind CSS** | Styling | Rapid UI development |
| **@solana/web3.js** | Wallet connection | If user needs to sign (future: on-ramp) |

### 8.2 Backend

| Technology | Purpose | Why |
|---|---|---|
| **Rust** | Language | Memory safety, performance, Solana ecosystem |
| **Actix Web** | HTTP framework | Async, fast, WebSocket support built-in |
| **actix-web-actors** | WebSocket handling | Actor model for concurrent connections |
| **Diesel** | ORM / database | Type-safe queries, migrations |
| **PostgreSQL** | Database | Relational data, JSONB for flexible fields |
| **solana-client** | Solana RPC | Transaction building and submission |
| **solana-sdk** | Crypto / keys | Keypair management, signing |
| **reqwest** | HTTP client | Calling Ollama API |
| **jsonwebtoken** | Auth | JWT token generation and validation |
| **argon2** / **bcrypt** | Password hashing | Secure credential storage |
| **serde** / **serde_json** | Serialization | JSON parsing throughout |
| **dotenv** | Config | Environment variable management |
| **tracing** | Logging | Structured, async-aware logging |
| **tokio** | Async runtime | Powers Actix and all async operations |

### 8.3 AI Layer

| Technology | Purpose | Why |
|---|---|---|
| **Ollama** | Local AI inference | Privacy, no API costs, low latency |
| **Qwen3 1.7B** | Language model | Small, fast, good at structured output |
| **Custom Modelfile** | Model config | Forces JSON-only output, zero temperature |

### 8.4 Web3 / Solana

| Technology | Purpose | Why |
|---|---|---|
| **Anchor Framework** | Smart contract framework | Safe, high-level Solana development |
| **SPL Token / Token-2022** | Token standard | USDC transfers via `token_interface` |
| **PDA (Program Derived Address)** | Account management | Deterministic, program-controlled accounts |
| **USDC (Circle)** | Stablecoin | 1:1 USD peg, widely accepted |
| **Jupiter Aggregator** | DEX aggregation | Token swaps (existing integration) |
| **Solana CLI + Anchor CLI** | Development tools | Build, deploy, test contracts |

### 8.5 DevOps & Infrastructure

| Technology | Purpose | Why |
|---|---|---|
| **Docker** + **Docker Compose** | Containerization | Reproducible environments |
| **Cloudflare Tunnel** | Secure ingress | No exposed ports, DDoS protection |
| **Nginx** | Reverse proxy | WebSocket upgrade support, rate limiting |
| **GitHub Actions** | CI/CD | Automated testing and deployment |
| **Prometheus + Grafana** | Monitoring | Track transaction volume, latency, errors |
| **Sentry** | Error tracking | Real-time error alerting |
| **Solana Devnet → Mainnet** | Deployment | Progressive rollout strategy |

---

## 9. Security Architecture

### 9.1 Frontend Security

| Threat | Mitigation |
|---|---|
| **XSS (Cross-Site Scripting)** | Sanitize all user inputs; React's JSX auto-escapes by default; CSP headers |
| **CSRF** | JWT in `Authorization` header (not cookies) for REST; WebSocket auth via handshake token |
| **Private key exposure** | **Keys NEVER touch the frontend.** All signing happens on the backend. Frontend only displays results |
| **Man-in-the-Middle** | Enforce HTTPS everywhere; HSTS headers; Cloudflare TLS |
| **Wallet phishing** | If wallet connect is added: validate transaction details before signing; display human-readable summaries |
| **Session hijacking** | Short-lived JWTs (15 min); refresh tokens in httpOnly cookies; token rotation |
| **Input injection** | Validate and sanitize chat messages before sending to backend; max length limits |

### 9.2 Backend Security

| Threat | Mitigation |
|---|---|
| **SQL Injection** | Diesel ORM uses parameterized queries by default — **never** use raw SQL with user input |
| **Authentication bypass** | JWT validation on every request; middleware-level auth guard |
| **AI prompt injection** | AI input is **only** the user's message text — no system data appended. Backend validates AI output schema independently |
| **Unauthorized transactions** | Multi-step confirmation flow; `pending_action` with expiry; amount limits per transaction |
| **Private key compromise** | Backend signing keys stored in encrypted environment variables; consider HSM/KMS for production |
| **Rate limiting / DDoS** | Per-user rate limits on AI requests, transactions, and WebSocket messages |
| **Logging sensitive data** | **NEVER** log private keys, passwords, or full wallet addresses. Log only truncated pubkeys and tx signatures |
| **Dependency vulnerabilities** | `cargo audit` in CI; Dependabot alerts; pin dependency versions |
| **Environment variable leaks** | `.env` in `.gitignore`; use secrets manager in production (AWS SSM, Vault) |

### 9.3 Smart Contract (Solana) Security

| Threat | Mitigation |
|---|---|
| **Unauthorized instruction calls** | `constraint = signer.key() == main_state_account.admin_signer` (existing) |
| **Wrong token mint** | `constraint = usdc_mint.key() == USDC_MINT` (existing) |
| **Integer overflow** | Use `checked_add`, `checked_sub`, `checked_mul` for all arithmetic |
| **Reentrancy** | Solana's single-threaded execution model prevents traditional reentrancy; still validate state after CPI calls |
| **PDA seed collision** | Use unique, deterministic seed combinations (existing: `["main_state", usdc_mint, signer]`) |
| **Drain attack on vault** | Transfer-out function (when built) must validate: admin signer, amount ≤ balance, valid recipient ATA |
| **Front-running** | Solana's fast finality (400ms) reduces window; for high-value: use transaction priority fees |
| **Upgrade authority** | Lock upgrade authority on mainnet after audit; use multisig for any upgrades |
| **Missing account validation** | Anchor's `#[account]` constraints handle most cases; add custom checks for business logic |
| **Incorrect decimal handling** | USDC has 6 decimals. $100 = `100_000_000` lamports. **Always** validate decimal conversion |

### 9.4 DevOps Security

| Threat | Mitigation |
|---|---|
| **Exposed secrets in CI** | Use GitHub Actions secrets; never echo secrets in logs |
| **Container escape** | Minimal base images (distroless/alpine); non-root containers; read-only filesystems |
| **Network exposure** | Cloudflare Tunnel (no open ports); internal services on private network |
| **Database access** | Firewall rules; only backend container can reach PostgreSQL; SSL connections |
| **Ollama exposure** | Ollama listens on `localhost` only; never expose to public network |
| **Audit trail** | Log all transaction attempts (success and failure) with timestamps and user IDs |
| **Backup & recovery** | Automated PostgreSQL backups; test restore procedures regularly |

---

## 10. DevOps & Infrastructure

### 10.1 Development Environment

```yaml
# docker-compose.yml (development)
version: "3.9"
services:
  backend:
    build: ./backend
    ports:
      - "4000:4000"
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/remitly
      - SOLANA_RPC_URL=https://api.devnet.solana.com
      - OLLAMA_URL=http://ollama:11434
    depends_on:
      - db
      - ollama

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_WS_URL=ws://localhost:4000/ws
      - NEXT_PUBLIC_API_URL=http://localhost:4000/api

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=remitly
      - POSTGRES_USER=remitly
      - POSTGRES_PASSWORD=dev_password
    volumes:
      - pgdata:/var/lib/postgresql/data

  ollama:
    image: ollama/ollama
    volumes:
      - ollama_data:/root/.ollama
    # GPU passthrough for faster inference
    # deploy:
    #   resources:
    #     reservations:
    #       devices:
    #         - capabilities: [gpu]

volumes:
  pgdata:
  ollama_data:
```

### 10.2 Production Architecture

```
                    Internet
                       │
                       ▼
              ┌─────────────────┐
              │ Cloudflare CDN  │
              │ + WAF + DDoS    │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │ Cloudflare      │
              │ Tunnel          │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │  Nginx Reverse  │
              │  Proxy          │
              │  (Rate Limit,   │
              │   WS Upgrade)   │
              └────────┬────────┘
                       │
           ┌───────────┼───────────┐
           ▼           ▼           ▼
     ┌──────────┐ ┌──────────┐ ┌──────────┐
     │ Backend  │ │ Backend  │ │ Backend  │
     │ Instance │ │ Instance │ │ Instance │
     │    1     │ │    2     │ │    3     │
     └────┬─────┘ └────┬─────┘ └────┬─────┘
          │             │             │
          └───────────┬─┘─────────────┘
                      │
         ┌────────────┼────────────┐
         ▼            ▼            ▼
    ┌─────────┐  ┌─────────┐  ┌─────────┐
    │ Postgres│  │ Ollama  │  │ Solana  │
    │ (Primary│  │ (GPU    │  │ RPC     │
    │  + Read │  │  Node)  │  │ (Helius/│
    │ Replica)│  │         │  │ QuickNode)│
    └─────────┘  └─────────┘  └─────────┘
```

### 10.3 CI/CD Pipeline

```yaml
# .github/workflows/ci.yml (conceptual)
stages:
  1. Lint & Format:
     - cargo fmt --check
     - cargo clippy -- -D warnings
     - eslint + prettier (frontend)

  2. Test:
     - cargo test (backend unit tests)
     - anchor test (smart contract tests)
     - jest/vitest (frontend tests)

  3. Security Scan:
     - cargo audit
     - npm audit
     - snyk container scan

  4. Build:
     - cargo build --release
     - next build
     - anchor build

  5. Deploy (on merge to main):
     - Build Docker images
     - Push to container registry
     - Rolling deploy to production
     - Run smoke tests
     - Notify on Slack/Discord
```

---

## 11. Current Codebase Status

### What's Built ✅

| Component | Status | Files |
|---|---|---|
| AI Intent Parser (Ollama) | ✅ Working | `Modelfile`, `ai_controller.rs` |
| Backend HTTP Server | ✅ Basic | `main.rs` (Actix Web on port 4000) |
| Database Models | ✅ Basic | `model.rs`, `schema.rs` (User, Recipient, Ledger) |
| Solana Contract — Init | ✅ Working | `create_main_accounts.rs`, `initialize_accounts.rs` |
| Solana Contract — Transfer | ✅ Working | `vault_transfer.rs` |
| Jupiter Swap Integration | ✅ Working | `jupiter_swap.rs`, `swap_controller.rs` |
| Contract Error Handling | ✅ Basic | `errors.rs` |

### What's Needed 🔴

| Component | Priority | Details |
|---|---|---|
| **WebSocket handler** | 🔴 Critical | Multi-step chat flow requires WS support in Actix |
| **Transaction Orchestrator** | 🔴 Critical | The glue: AI parse → validate → resolve → execute |
| **Authentication (JWT)** | 🔴 Critical | No auth exists currently; needed for user identity |
| **Password hashing** | 🔴 Critical | Passwords stored in plain text currently |
| **Recipient pubkey field** | 🔴 Critical | Recipients table missing wallet address |
| **Withdraw from vault** | 🔴 Critical | Contract can receive but can't send to recipients yet |
| **Ledger expansion** | 🟡 High | Missing: amount, currency, tx_signature, status, timestamps |
| **Frontend** | 🟡 High | Currently empty (`.gitkeep` only) |
| **Balance sync** | 🟡 High | Sync on-chain balance to DB cache |
| **Conversation persistence** | 🟡 Medium | Store chat history for UX continuity |
| **Pending action system** | 🟡 Medium | Confirmation flow with expiry |
| **Rate limiting** | 🟡 Medium | Prevent abuse of AI and transaction endpoints |
| **Proper error handling** | 🟡 Medium | Remove `.unwrap()` calls; use proper Result chains |
| **Environment config** | 🟡 Medium | Hardcoded RPC URLs and program IDs |
| **Fee deduction** | 🟢 Low | Fee logic is commented out in contract |
| **Transaction history endpoint** | 🟢 Low | Query and paginate ledger |

---

## 12. Open Questions & Future Brainstorming

### Architecture Decisions to Make

| Question | Options | Recommendation |
|---|---|---|
| **Who holds user keys?** | Custodial (backend holds keys) vs Non-custodial (user wallet) | Start **custodial** for simplest UX ("send $100 to Mom" just works). Add non-custodial option later for power users. |
| **On-ramp (fiat → USDC)?** | Stripe, MoonPay, Transak, direct bank | Integrate a third-party on-ramp (MoonPay/Transak). This is your "recharge account" flow. |
| **Off-ramp (USDC → fiat)?** | Partner with local payout providers | Phase 2 — focus on crypto-to-crypto first |
| **Multi-currency?** | USDC only vs multiple stablecoins | Start USDC only; add USDT, EURC later via Jupiter swaps |
| **AI model hosting?** | Ollama local vs cloud API | Local for dev & privacy. Consider cloud (with API key rotation) for scale. Keep the **interface identical** so it's swappable. |
| **Notification system?** | Push notifications, email, SMS | Add push notifications (Firebase) for tx confirmations, especially when recipient is also a user |

### Feature Ideas for V2+

- **Recurring transfers**: "Send $50 to Mom every Friday"
- **Group payments**: "Split $100 between Mom and Dad"
- **Payment requests**: Mom can request $100 from their child
- **QR code payments**: Scan to pay another Remitly user
- **Transaction receipts**: PDF/image receipt generation
- **Multi-language AI**: Parse intents in Spanish, Hindi, etc.
- **Voice input**: "Hey Remitly, send $100 to Mom"
- **Spending analytics**: "How much did I send this month?"
- **Contact sync**: Import contacts from phone

### Compliance & Legal (Critical for Remittance)

> ⚠️ **This section is critical and should not be skipped.**

| Requirement | Details |
|---|---|
| **KYC (Know Your Customer)** | Required for any money transmission. Integrate a KYC provider (Sumsub, Veriff, Jumio) |
| **AML (Anti-Money Laundering)** | Transaction monitoring for suspicious patterns. Use Chainalysis or Elliptic |
| **Money Transmitter License** | Required in most US states. Consider starting in crypto-friendly jurisdictions |
| **OFAC Sanctions Screening** | Screen recipient addresses against OFAC sanctions list |
| **Data Privacy (GDPR/CCPA)** | User data handling, right to deletion, data portability |
| **Transaction Limits** | Enforce daily/monthly limits per KYC tier |

---

## 13. Getting Started (Development)

### Prerequisites

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Solana CLI
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"

# Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor anchor-cli

# Ollama
brew install ollama       # macOS
# or: curl -fsSL https://ollama.com/install.sh | sh   # Linux

# Node.js (for frontend)
brew install node         # macOS

# PostgreSQL
brew install postgresql   # macOS
```

### Setup

```bash
# 1. Clone & setup
git clone <repo-url>
cd remitly

# 2. Start database
createdb remitly
cd backend && diesel migration run

# 3. Setup AI model
ollama create bank_agent -f Modelfile

# 4. Configure environment
cp .env.example .env
# Edit .env with your values:
#   DATABASE_URL=postgres://localhost/remitly
#   SOLANA_RPC_URL=https://api.devnet.solana.com
#   PROGRAM_ID=HeHSU8GmNjDF7kwM7j2fbheeigdZD9AJzeMC2u5SGCs5

# 5. Start backend
cd backend && cargo run

# 6. Start frontend (once built)
cd frontend && npm install && npm run dev

# 7. Deploy contract (Devnet)
cd contract && anchor build && anchor deploy
```

### Project Structure

```
remitly/
├── README.md                       ← You are here
├── Modelfile                       ← Ollama AI model configuration
│
├── backend/                        ← Rust/Actix Web API server
│   └── src/
│       ├── main.rs                 ← Server entry point
│       ├── schema.rs               ← Diesel schema (auto-generated)
│       ├── controllers/
│       │   ├── ai_controller.rs    ← AI intent parsing endpoint
│       │   ├── user_controller.rs  ← User/account management
│       │   ├── swap_controller.rs  ← Jupiter DEX swap handler
│       │   └── prompt.txt          ← Brainstorming notes
│       ├── database/
│       │   ├── db.rs               ← Connection pool
│       │   ├── model.rs            ← ORM models (DbUser, Dbrecipient)
│       │   └── model_functions/    ← Query functions
│       └── utility/
│           └── jupiter_swap.rs     ← Jupiter aggregator integration
│
├── contract/                       ← Solana/Anchor smart contract
│   └── programs/contract/src/
│       ├── lib.rs                  ← Program entry (instructions)
│       ├── brainstructs.rs         ← Account data structures
│       ├── errors.rs               ← Custom error types
│       └── instructions/
│           ├── create_main_accounts.rs  ← Admin setup
│           ├── initialize_accounts.rs   ← User ATA creation
│           └── vault_transfer.rs        ← USDC transfer logic
│
├── frontend/                       ← Next.js web app (to be built)
│
└── databaseutility/                ← DB migration utilities
```

---

## Contributing

This project is in active development. See the [Open Questions](#12-open-questions--future-brainstorming) section for areas that need brainstorming and the [What's Needed](#whats-needed-) table for implementation priorities.

---

## License

TBD

---

*Built with Rust 🦀, Solana ⚡, and a dream to make sending money as easy as sending a text message.* 💸
