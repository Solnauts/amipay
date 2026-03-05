// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────

export interface RegisterRequest {
  name: string;
  password: string;
}

export interface LoginRequest {
  name: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserProfile;
}

export interface UserProfile {
  id: number;
  name: string;
  pubkey: string;
  amount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// RECIPIENTS
// ─────────────────────────────────────────────────────────────────────────────

export interface Recipient {
  id: number;
  name: string;
  pubkey: string;
  userId: number;
}

export interface CreateRecipientRequest {
  name: string;
  pubkey: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface Transaction {
  id: number;
  senderId: number;
  receiverId: number;
  amount: number;
  currency: string;
  txSignature: string | null;
  status: string;
  createdAt: string;
}

export interface TransactionHistoryResponse {
  transactions: Transaction[];
  total: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// WEBSOCKET — INBOUND (Server → App)
// ─────────────────────────────────────────────────────────────────────────────

export interface Action {
  id: string;
  label: string;
}

export interface AssistantMessage {
  type: 'assistant_message';
  conversationId: string;
  content: string;
  actions?: Action[];
  pendingActionId?: string;
}

export interface TxStatus {
  type: 'tx_status';
  conversationId: string;
  status: string;
  txSignature?: string;
  explorerUrl?: string;
}

export type WsInboundMessage = AssistantMessage | TxStatus;

// ─────────────────────────────────────────────────────────────────────────────
// WEBSOCKET — OUTBOUND (App → Server)
// ─────────────────────────────────────────────────────────────────────────────

export interface UserMessage {
  type: 'user_message';
  conversationId: string;
  content: string;
}

export interface ActionResponse {
  type: 'action_response';
  conversationId: string;
  pendingActionId: string;
  response: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI INTENT
// ─────────────────────────────────────────────────────────────────────────────

export type IntentType =
  | 'transfer'
  | 'check_balance'
  | 'transaction_history'
  | 'unknown';

export interface IntentJson {
  intent: IntentType;
  amount: number | null;
  currency: string;
  recipient: string | null;
  historyLimit: number | null;
  timePeriod: string | null;
}
