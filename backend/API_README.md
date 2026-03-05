# Remitly Backend — API Reference

> **Base URL:** `http://127.0.0.1:4000`  
> **Authentication:** Most protected endpoints require a valid JWT sent via the `Authorization: Bearer <token>` header (issued by `POST /wallet/login`).

---

## Table of Contents

1. [Authentication & Wallet](#1-authentication--wallet)
   - [GET /wallet/nonce](#11-get-walletnonce)
   - [POST /wallet/login](#12-post-walletlogin)
   - [POST /wallet/update-profile](#13-post-walletupdate-profile)
   - [GET /wallet/unique-alias](#14-get-walletunique-alias)
   - [POST /wallet/create-alias](#15-post-walletcreate-alias)
   - [POST /wallet/address](#16-post-walletaddress)
   - [POST /wallet/add-recipient](#17-post-walletadd-recipient)
   - [POST /wallet/get_user_alias](#18-post-walletget_user_alias)
2. [Account](#2-account)
   - [POST /createaccount](#21-post-createaccount)
3. [Ledger / Claiming](#3-ledger--claiming)
   - [POST /claimamount](#31-post-claimamount)
4. [WebSocket — Orchestrator](#4-websocket--orchestrator)
   - [GET /main_caller (WS Upgrade)](#41-get-main_caller-ws-upgrade)
   - [Client → Server Messages](#42-client--server-messages)
   - [Server → Client Messages](#43-server--client-messages)

---

## 1. Authentication & Wallet

### 1.1 `GET /wallet/nonce`

Generates a one-time nonce that the client must sign with their Solana wallet to prove ownership.

**Auth required:** No

**Request:** No body required.

**Success Response `200 OK`:**
```json
{
  "nonce": "a3f9c2d1e8b04567...",
  "message": "Sign in to Remitly: a3f9c2d1e8b04567..."
}
```

---

### 1.2 `POST /wallet/login`

Verifies the Ed25519 signature produced by the Solana wallet. Creates a new user if one doesn't exist, then returns a JWT `token` in the response body (valid 24 hours).

**Auth required:** No

**Request Body:**
```json
{
  "address":   "4Nd1m...Solana public key (base58)",
  "signature": "3Ke9p...Ed25519 signature of the nonce message (base58)",
  "nonce":     "a3f9c2d1e8b04567..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `address` | `string` | ✅ | Solana wallet public key (base58) |
| `signature` | `string` | ✅ | Ed25519 signature of `"Sign in to Remitly: <nonce>"` (base58) |
| `nonce` | `string` | ✅ | The nonce value received from `GET /wallet/nonce` |

**Success Response `200 OK`:**
```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5c...",
  "is_new_user": false,
  "user": {
    "id": 42,
    "name": "Alice",
    "wallet_address": "4Nd1m...base58...",
    "method_type": "wallet",
    "has_pin": true
  }
}
```

> The client must store this `token` securely (e.g. `SecureStore` / `Keychain` on mobile) and send it as `Authorization: Bearer <token>` on all subsequent requests.
>
> `is_new_user` is `true` when the wallet address was seen for the first time and a new account was created automatically.

---

### 1.3 `POST /wallet/update-profile`

Sets or updates the user's display name and PIN. Requires an active session.

**Auth required:** 🔒 `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "username": "alice_remitly",
  "pin":      "1234"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | `string` | ✅ | New display name for the user |
| `pin` | `string` | ✅ | Plain-text PIN (hashed with bcrypt on the server before storing) |

**Success Response `200 OK`:**
```json
{
  "status": "success",
  "message": "Profile updated successfully",
  "user": {
    "id": 42,
    "name": "alice_remitly",
    "wallet_address": "4Nd1m...base58...",
    "method_type": "wallet",
    "has_pin": true
  }
}
```

---

### 1.4 `GET /wallet/unique-alias`

Returns a list of unique, system-generated alias suggestions the user can pick from when creating their profile.

**Auth required:** No

**Request:** No body required.

**Success Response `200 OK`:**
```json
{
  "alias": [
    "swift_tiger_42",
    "cool_river_99",
    "bright_moon_7"
  ]
}
```

---

### 1.5 `POST /wallet/create-alias`

Saves a chosen alias for the authenticated user.

**Auth required:** 🔒 `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "alias": "swift_tiger_42"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `alias` | `string` | ✅ | The alias string to assign to the user |

**Success Response `200 OK`:**
```json
{
  "status": "success",
  "message": "Alias created successfully",
  "alias": "swift_tiger_42"
}
```

---

### 1.6 `POST /wallet/address`

Returns the authenticated user's on-chain wallet address.

**Auth required:** 🔒 `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "user_id": null
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_id` | `number \| null` | ❌ | Optional; currently unused. Pass `null` or omit. |

**Success Response `200 OK`:**
```json
{
  "status": "success",
  "data": "4Nd1m...base58 wallet address..."
}
```

---

### 1.7 `POST /wallet/add-recipient`

Adds another user as a recipient for the authenticated user, looked up by their alias.

**Auth required:** 🔒 `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "recipient_alias": "swift_tiger_42"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `recipient_alias` | `string` | ✅ | The alias of the user to add as recipient |

**Success Response `200 OK`:**
```json
{
  "status": "success",
  "recipient_id": 17,
  "recipient_user_id": 99,
  "alias_used": "swift_tiger_42"
}
```

---

### 1.8 `POST /wallet/get_user_alias`

Retrieves all aliases associated with the authenticated user.

**Auth required:** 🔒 `Authorization: Bearer <token>`

**Request:** No body required.

**Success Response `200 OK`:**
```json
{
  "status": "success",
  "alias": [
    {
      "id": 1,
      "user_id": 42,
      "alias_name": "swift_tiger_42",
      "is_primary": false,
      "created_at": "2026-03-05T12:00:00Z",
      "half_alias": "swift_tiger"
    }
  ]
}
```

---

## 2. Account

### 2.1 `POST /createaccount`

Creates a new user account using a phone number + PIN flow (non-wallet method). A Solana USDC Associated Token Account (ATA) is also created on-chain for the new user.

**Auth required:** No

**Request Body:**
```json
{
  "username":       "bob",
  "contact_number": 9876543210,
  "userpin":        4321,
  "email":          "bob@example.com"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contact_number` | `number` | ✅ | User's phone number (used as identity seed) |
| `userpin` | `number` | ✅ | Numeric PIN (hashed with bcrypt on server) |
| `username` | `string` | ❌ | Display name. Defaults to `"Guest"` if omitted |
| `email` | `string` | ❌ | Optional email address |

**Success Response `200 OK`:**
```json
{
  "status": "success",
  "message": "User account created successfully"
}
```

---

## 3. Ledger / Claiming

### 3.1 `POST /claimamount`

Initiates a token claim from the vault. Validates the requested amount against the ledger, executes the on-chain Solana claim, then records it in the database.

**Auth required:** No *(uses `recipient_id` in body)*

**Request Body:**
```json
{
  "amount":           500000,
  "method":           "Auto-Claim",
  "recipient_pubkey": null,
  "recipient_id":     17
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | `number (u64)` | ✅ | Amount to claim in lamports / smallest unit. Must be > 0 |
| `method` | `string` | ✅ | Either `"Auto-Claim"` or `"Manual-Claim"` |
| `recipient_pubkey` | `string \| null` | ⚠️ | **Required** when `method` is `"Manual-Claim"`. The on-chain destination address |
| `recipient_id` | `number (i32)` | ✅ | Database ID of the recipient record |

**Manual-Claim Example:**
```json
{
  "amount":           250000,
  "method":           "Manual-Claim",
  "recipient_pubkey": "4Nd1m...base58 destination...",
  "recipient_id":     17
}
```

**Success Response `200 OK`:**
```json
{
  "status":         "success",
  "error_code":     null,
  "message":        "Claim recorded successfully",
  "claimed_amount": 500000,
  "new_balance":    1500000,
  "tx_signature":   null
}
```

**Error Response (example — insufficient balance) `400 Bad Request`:**
```json
{
  "status":         "error",
  "error_code":     4202,
  "message":        "Insufficient claimable balance",
  "claimed_amount": null,
  "new_balance":    null,
  "tx_signature":   null
}
```

---

## 4. WebSocket — Orchestrator

### 4.1 `GET /main_caller` (WS Upgrade)

Upgrades to a persistent WebSocket connection. All AI-assisted commands (send money, check balance, view history, etc.) are handled over this socket.

**Auth required:** 🔒 `Authorization: Bearer <token>` header **or** `?token=<jwt>` query parameter (validated before the upgrade is accepted)

**Upgrade Headers:**
```
GET /main_caller HTTP/1.1
Host: 127.0.0.1:4000
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: <base64-key>
Sec-WebSocket-Version: 13
Authorization: Bearer <jwt>
```

**Alternative — token via query parameter:**
```
GET /main_caller?token=<jwt> HTTP/1.1
Host: 127.0.0.1:4000
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: <base64-key>
Sec-WebSocket-Version: 13
```

---

### 4.2 Client → Server Messages

All messages are JSON-encoded text frames wrapped in an outer tagged enum:

#### `UserMessage` — Send a natural-language command to the AI agent

```json
{
  "UserMessage": {
    "conversation_id": "15",
    "content": "Send 10 USDC to swift_tiger_42"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `conversation_id` | `string \| null` | ❌ | ID of an existing conversation. Omit or send `""` to start a new one |
| `content` | `string` | ✅ | The natural-language command for the AI |

**Example — start a new conversation:**
```json
{
  "UserMessage": {
    "conversation_id": null,
    "content": "What is my current USDC balance?"
  }
}
```

---

#### `ActionResponse` — Confirm or reject a pending action proposed by the AI

Sent after the server sends an `AssistanceMessage` with a `pending_action_id`.

```json
{
  "ActionResponse": {
    "conversation_id":   15,
    "pending_action_id": 7,
    "response":          "confirm"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `conversation_id` | `number` | ✅ | The conversation this action belongs to |
| `pending_action_id` | `number` | ✅ | ID of the pending action (from the server's `AssistanceMessage`) |
| `response` | `string` | ✅ | User's decision, e.g. `"confirm"` or `"cancel"` |

---

### 4.3 Server → Client Messages

#### `AssistanceMessage` — AI reply or action request

```json
{
  "AssistanceMessage": {
    "conversation_id":   15,
    "pending_action_id": 7,
    "task":              "You are about to send 10 USDC to swift_tiger_42. Confirm?",
    "action_buttons":    "confirm,cancel"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `conversation_id` | `number` | Current conversation ID |
| `pending_action_id` | `number \| null` | Set when the AI is waiting for user confirmation before executing an action |
| `task` | `string` | Human-readable message or question from the AI |
| `action_buttons` | `string \| null` | Comma-separated list of action button labels to render in the UI |

---

#### `Error` — WebSocket error frame

```json
{
  "Error": {
    "conversation_id":   15,
    "pending_action_id": null,
    "error_code":        4001,
    "error_message":     "Invalid or expired session token"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `conversation_id` | `number` | Conversation context (0 if unknown) |
| `pending_action_id` | `number \| null` | Pending action context if relevant |
| `error_code` | `number` | Numeric error code (see error code table below) |
| `error_message` | `string` | Human-readable error description |

---

## Error Code Reference

| Code Range | Category | Examples |
|------------|----------|---------|
| `4000–4099` | Auth errors | Missing/invalid Bearer token, invalid user ID |
| `4100–4199` | Validation errors | Missing fields, malformed messages, invalid conversation ID |
| `4200–4299` | Business / Ledger errors | Invalid amount, invalid claim method, insufficient balance, missing pubkey |
| `5000–5099` | Internal / DB errors | Blocking task failures, DB query errors |
| `5300–5399` | Security / Crypto errors | JWT secret missing, JWT encode/decode failure, bcrypt failure |
| `6000–6099` | Solana / On-chain errors | Claim failed, transfer failed |

---

## Authentication

All protected endpoints expect the JWT in the **`Authorization`** HTTP header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5c...
```

For WebSocket connections, the token can alternatively be passed as a `?token=` query parameter.

The token is valid for **24 hours** from the time of login.

