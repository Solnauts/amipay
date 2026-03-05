// ─────────────────────────────────────────────────────────────────────────────
// WALLET AUTH
// ─────────────────────────────────────────────────────────────────────────────

/** GET /wallet/nonce */
export interface NonceResponse {
  nonce: string;
  message: string; // e.g. "Sign in to Remitly: <nonce>"
}

/** POST /wallet/login — body */
export interface WalletLoginRequest {
  address: string;   // base58 Solana public key
  signature: string; // base58 Ed25519 signature of the nonce message
  nonce: string;
}

export interface BackendUser {
  id: number;
  name: string | null;          // Optional<String> on the backend
  wallet_address: string | null; // Optional<String> on the backend
  method_type: string;
  has_pin: boolean;
}

/** POST /wallet/login — response. Backend returns JWT in body (not cookie). */
export interface WalletLoginResponse {
  status: 'success' | 'error';
  token: string;       // JWT — must be stored and sent as Authorization: Bearer <token>
  is_new_user: boolean;
  user: BackendUser;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────────────────────────────────────

/** POST /wallet/update-profile */
export interface UpdateProfileRequest {
  username: string;
  pin: string; // plain-text PIN; bcrypt-hashed on server
}

export interface UpdateProfileResponse {
  status: string;
  message: string;
  user: BackendUser;
}

// ─────────────────────────────────────────────────────────────────────────────
// ALIAS
// ─────────────────────────────────────────────────────────────────────────────

/** GET /wallet/unique-alias */
export interface UniqueAliasResponse {
  alias: string[];
}

/** POST /wallet/create-alias */
export interface CreateAliasRequest {
  alias: string;
}

export interface CreateAliasResponse {
  status: string;
  message: string;
  alias: string;
}

/** POST /wallet/get_user_alias */
export interface AliasRecord {
  id: number;
  user_id: number;
  alias_name: string;
  is_primary: boolean;
  created_at: string;
  half_alias: string;
}

export interface GetUserAliasResponse {
  status: string;
  alias: AliasRecord[];
}

// ─────────────────────────────────────────────────────────────────────────────
// WALLET ADDRESS
// ─────────────────────────────────────────────────────────────────────────────

/** POST /wallet/address */
export interface WalletAddressResponse {
  status: string;
  data: string; // base58 wallet address
}

// ─────────────────────────────────────────────────────────────────────────────
// RECIPIENTS (CONTACTS)
// ─────────────────────────────────────────────────────────────────────────────

/** POST /wallet/add-recipient */
export interface AddRecipientRequest {
  recipient_alias: string;
}

export interface AddRecipientResponse {
  status: string;
  recipient_id: number;
  recipient_user_id: number;
  alias_used: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLAIM / TRANSFER
// ─────────────────────────────────────────────────────────────────────────────

/** POST /claimamount */
export interface ClaimRequest {
  amount: number;           // lamports / smallest unit
  method: 'Auto-Claim' | 'Manual-Claim';
  recipient_pubkey: string | null; // required for Manual-Claim
  recipient_id: number;
}

export interface ClaimResponse {
  status: string;
  error_code: number | null;
  message: string;
  claimed_amount: number | null;
  new_balance: number | null;
  tx_signature: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// WEBSOCKET — OUTBOUND  (App → Server)
// ─────────────────────────────────────────────────────────────────────────────

export interface WsUserMessage {
  UserMessage: {
    conversation_id: string | null;
    content: string;
  };
}

export interface WsActionResponse {
  ActionResponse: {
    conversation_id: number;
    pending_action_id: number;
    response: 'confirm' | 'cancel' | string;
  };
}

export type WsOutboundMessage = WsUserMessage | WsActionResponse;

// ─────────────────────────────────────────────────────────────────────────────
// WEBSOCKET — INBOUND  (Server → App)
// ─────────────────────────────────────────────────────────────────────────────

export interface WsAssistanceMessage {
  AssistanceMessage: {
    conversation_id: number;
    pending_action_id: number | null;
    task: string;
    action_buttons: string | null; // comma-separated labels e.g. "confirm,cancel"
  };
}

export interface WsError {
  Error: {
    conversation_id: number;
    pending_action_id: number | null;
    error_code: number;
    error_message: string;
  };
}

export type WsInboundMessage = WsAssistanceMessage | WsError;
