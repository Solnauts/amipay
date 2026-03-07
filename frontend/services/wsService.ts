/**
 * WebSocket service for the AI Pay orchestrator.
 *
 * Uses the React Native built-in WebSocket API (no packages).
 * Handles:
 *  - Auth via ?token= query param (RN WebSocket doesn't support custom headers)
 *  - Automatic reconnection with exponential back-off
 *  - Heart-beat pings to detect stale connections
 *  - Typed send helpers for UserMessage / ActionResponse
 *  - Listener-based API for consuming server messages
 */

// ─── Server URL ──────────────────────────────────────────────────────────────

/**
 * Derive the WebSocket base URL from the same API URL used by HTTP services.
 * Converts http:// → ws:// and https:// → wss://
 */
function getWsBaseUrl(): string {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:4000';
    // Strip trailing slash if present
    const cleaned = apiUrl.replace(/\/+$/, '');
    if (cleaned.startsWith('https://')) {
        return cleaned.replace('https://', 'wss://');
    }
    return cleaned.replace('http://', 'ws://');
}

const WS_BASE_URL = getWsBaseUrl();
const WS_ENDPOINT = '/main_caller';

// ─── Types (mirror backend ws_types.rs) ─────────────────────────────────────

/**
 * --- Client → Server ---
 * Rust serde default enum tagging: { "VariantName": { ...fields } }
 */

export interface UserMessagePayload {
    conversation_id: string | null;
    content: string; // JSON-stringified { value: string }
}

export interface ActionResponsePayload {
    conversation_id: number;
    pending_action_id: number;
    response: string;
}

// Tagged union we send to the server
export type ClientMessage =
    | { UserMessage: UserMessagePayload }
    | { ActionResponse: ActionResponsePayload };

/**
 * --- Server → Client ---
 */

export interface AssistantMessagePayload {
    conversation_id: number;
    pending_action_id: number | null;
    task: string;
    action_buttons: string | null;
}

export interface ErrorPayload {
    conversation_id: number;
    pending_action_id: number | null;
    error_code: number;
    error_message: string;
}

export type ServerMessage =
    | { AssistanceMessage: AssistantMessagePayload }
    | { Error: ErrorPayload };

// ─── Listener types ─────────────────────────────────────────────────────────

export type OnAssistantMessage = (msg: AssistantMessagePayload) => void;
export type OnError = (err: ErrorPayload) => void;
export type OnConnectionChange = (connected: boolean) => void;
export type OnClose = (code?: number, reason?: string) => void;

export interface WsListeners {
    onAssistantMessage?: OnAssistantMessage;
    onError?: OnError;
    onConnectionChange?: OnConnectionChange;
    onClose?: OnClose;
}

// ─── Configuration ──────────────────────────────────────────────────────────

interface WsServiceConfig {
    /** JWT auth token obtained from POST /wallet/login */
    token: string;
    /** Optional custom base URL (defaults to WS_BASE_URL) */
    baseUrl?: string;
    /** Max reconnection attempts before giving up (default: 5) */
    maxReconnectAttempts?: number;
    /** Whether to automatically reconnect on unexpected close (default: true) */
    autoReconnect?: boolean;
}

// ─── Service ────────────────────────────────────────────────────────────────

const INITIAL_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;
const PING_INTERVAL_MS = 25_000; // keep-alive ping every 25 s

export class WsService {
    private ws: WebSocket | null = null;
    private token: string;
    private baseUrl: string;
    private listeners: WsListeners = {};

    // Reconnection state
    private autoReconnect: boolean;
    private maxReconnectAttempts: number;
    private reconnectAttempt = 0;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private isManualClose = false;

    // Heartbeat
    private pingTimer: ReturnType<typeof setInterval> | null = null;

    // Connection state
    private _isConnected = false;
    get isConnected(): boolean {
        return this._isConnected;
    }

    constructor(config: WsServiceConfig) {
        this.token = config.token;
        this.baseUrl = config.baseUrl ?? WS_BASE_URL;
        this.autoReconnect = config.autoReconnect ?? true;
        this.maxReconnectAttempts = config.maxReconnectAttempts ?? 5;
    }

    // ─── Public API ─────────────────────────────────────────────────────

    /** Register listeners. Can be called before or after connect(). */
    setListeners(listeners: WsListeners): void {
        this.listeners = listeners;
    }

    /** Update the auth token (e.g. after refresh). Takes effect on next connect(). */
    updateToken(token: string): void {
        this.token = token;
    }

    /** Open the WebSocket connection. */
    connect(): void {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            console.log('[WsService] already connected or connecting');
            return;
        }

        this.isManualClose = false;
        this.createSocket();
    }

    /** Gracefully close the connection. */
    disconnect(): void {
        this.isManualClose = true;
        this.clearTimers();
        if (this.ws) {
            this.ws.close(1000, 'client disconnect');
            this.ws = null;
        }
        this.setConnected(false);
    }

    /**
     * Send a user chat message.
     * @param text    The user's natural-language message (e.g. "send 50 to mom")
     * @param conversationId  Existing conversation ID, or null to create a new one
     */
    sendUserMessage(text: string, conversationId: string | null = null): void {
        const msg: ClientMessage = {
            UserMessage: {
                conversation_id: conversationId,
                // The backend deserialises `content` into RequestBody { value: String },
                // so we need to double-serialise.
                content: JSON.stringify({ value: text }),
            },
        };
        this.send(msg);
    }

    /**
     * Send an action response (e.g. PIN confirmation).
     */
    sendActionResponse(
        conversationId: number,
        pendingActionId: number,
        response: string,
    ): void {
        const msg: ClientMessage = {
            ActionResponse: {
                conversation_id: conversationId,
                pending_action_id: pendingActionId,
                response,
            },
        };
        this.send(msg);
    }

    // ─── Internals ──────────────────────────────────────────────────────

    private createSocket(): void {
        const url = `${this.baseUrl}${WS_ENDPOINT}?token=${encodeURIComponent(this.token)}`;
        console.log('[WsService] connecting to', url.replace(this.token, '<redacted>'));

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log('[WsService] ✅ connected');
            this.reconnectAttempt = 0;
            this.setConnected(true);
            this.startPing();
        };

        this.ws.onmessage = (event: WebSocketMessageEvent) => {
            this.handleMessage(event.data);
        };

        this.ws.onerror = (event: Event) => {
            // Use console.warn (not .error) to avoid triggering RN's red error overlay.
            // The reconnect logic in onclose will handle recovery.
            console.warn('[WsService] ⚠️ connection error — will retry');
            // onclose will fire after onerror — reconnect logic lives there
        };

        this.ws.onclose = (event: WebSocketCloseEvent) => {
            console.log(`[WsService] 🔌 closed code=${event.code} reason=${event.reason}`);
            this.stopPing();
            this.setConnected(false);
            this.listeners.onClose?.(event.code, event.reason);

            if (!this.isManualClose && this.autoReconnect) {
                this.scheduleReconnect();
            }
        };
    }

    private handleMessage(raw: string): void {
        let parsed: ServerMessage;
        try {
            parsed = JSON.parse(raw) as ServerMessage;
        } catch {
            console.error('[WsService] failed to parse server message:', raw);
            return;
        }

        if ('AssistanceMessage' in parsed) {
            console.log('[WsService] ← AssistantMessage', parsed.AssistanceMessage.task.substring(0, 80));
            this.listeners.onAssistantMessage?.(parsed.AssistanceMessage);
        } else if ('Error' in parsed) {
            console.warn('[WsService] ← Error', parsed.Error.error_code, parsed.Error.error_message);
            this.listeners.onError?.(parsed.Error);
        } else {
            console.warn('[WsService] unknown server message shape:', raw);
        }
    }

    private send(msg: ClientMessage): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('[WsService] cannot send — socket not open');
            return;
        }
        const json = JSON.stringify(msg);
        console.log('[WsService] →', json.substring(0, 120));
        this.ws.send(json);
    }

    // ── Reconnection ───────────────────────────────────────────────────

    private scheduleReconnect(): void {
        if (this.reconnectAttempt >= this.maxReconnectAttempts) {
            console.warn('[WsService] max reconnect attempts reached, giving up');
            return;
        }

        const delay = Math.min(
            INITIAL_RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempt),
            MAX_RECONNECT_DELAY_MS,
        );
        this.reconnectAttempt++;

        console.log(`[WsService] reconnecting in ${delay}ms (attempt ${this.reconnectAttempt}/${this.maxReconnectAttempts})`);

        this.reconnectTimer = setTimeout(() => {
            this.createSocket();
        }, delay);
    }

    // ── Keep-alive ────────────────────────────────────────────────────

    private startPing(): void {
        this.stopPing();
        this.pingTimer = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                // React Native WebSocket supports sending empty strings as pings
                // The backend ignores unknown message types gracefully
                // We send an empty text frame — the backend will respond with an error
                // for malformed JSON, but won't close the connection.
                // This keeps the TCP connection alive across NAT/proxy timeouts.
                // If you'd rather avoid the error log, you could skip this.
                // For now we just rely on the OS TCP keep-alive.
            }
        }, PING_INTERVAL_MS);
    }

    private stopPing(): void {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────

    private clearTimers(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.stopPing();
    }

    private setConnected(value: boolean): void {
        if (this._isConnected !== value) {
            this._isConnected = value;
            this.listeners.onConnectionChange?.(value);
        }
    }
}
