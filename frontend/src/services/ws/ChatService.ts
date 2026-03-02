import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActionResponse,
  UserMessage,
  WsInboundMessage,
} from '../../types/api';
import { TOKEN_KEY } from '../api/BaseService';

// ─────────────────────────────────────────────────────────────────────────────
// ChatService — Singleton WebSocket Manager
// Uses React Native's global WebSocket (no library needed)
// ─────────────────────────────────────────────────────────────────────────────

class ChatService {
  private static instance: ChatService;

  private socket: WebSocket | null = null;
  private messageListeners = new Set<(msg: WsInboundMessage) => void>();
  private errorListeners = new Set<(err: Event) => void>();
  private retryCount = 0;

  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 2000;

  // Track the active conversationId for reconnects
  private activeConversationId: string = '';

  private constructor() {}

  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  // ── Connect ────────────────────────────────────────────────────────────────
  async connect(conversationId: string): Promise<void> {
    // Close any existing connection cleanly before opening a new one
    if (this.socket) {
      this.disconnect();
    }

    this.activeConversationId = conversationId;

    const token = await AsyncStorage.getItem(TOKEN_KEY);
    const wsBase = process.env.EXPO_PUBLIC_WS_URL!;
    const url = token
      ? `${wsBase}?token=${encodeURIComponent(token)}`
      : wsBase;

    return new Promise((resolve, reject) => {
      // React Native global WebSocket — no import needed
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.retryCount = 0;
        resolve();
      };

      this.socket.onmessage = (event: MessageEvent<string>) => {
        try {
          const parsed = JSON.parse(event.data) as WsInboundMessage;
          this.messageListeners.forEach((cb) => cb(parsed));
        } catch {
          // Silently ignore malformed server frames
          console.warn('[ChatService] Failed to parse WS message:', event.data);
        }
      };

      this.socket.onclose = () => {
        if (this.retryCount < this.MAX_RETRIES) {
          this.reconnect(this.activeConversationId);
        }
      };

      this.socket.onerror = (event: Event) => {
        this.errorListeners.forEach((cb) => cb(event));
        reject(new Error('[ChatService] WebSocket connection error'));
      };
    });
  }

  // ── Disconnect ─────────────────────────────────────────────────────────────
  disconnect(): void {
    if (this.socket) {
      // Remove listeners before closing to suppress the onclose retry logic
      this.socket.onclose = null;
      this.socket.onerror = null;
      this.socket.onmessage = null;
      this.socket.close();
      this.socket = null;
    }
    this.retryCount = 0;
  }

  // ── Send Message ───────────────────────────────────────────────────────────
  sendMessage(content: string, conversationId: string): void {
    if (!this.isConnected()) {
      console.warn('[ChatService] Cannot send — socket not connected');
      return;
    }

    const message: UserMessage = {
      type: 'user_message',
      conversationId,
      content,
    };

    this.socket!.send(JSON.stringify(message));
  }

  // ── Confirm Action ─────────────────────────────────────────────────────────
  confirmAction(
    pendingActionId: string,
    conversationId: string,
    response: string,
  ): void {
    if (!this.isConnected()) {
      console.warn('[ChatService] Cannot confirm action — socket not connected');
      return;
    }

    const message: ActionResponse = {
      type: 'action_response',
      conversationId,
      pendingActionId,
      response,
    };

    this.socket!.send(JSON.stringify(message));
  }

  // ── onMessage ──────────────────────────────────────────────────────────────
  // Returns a cleanup function — call it to unsubscribe.
  onMessage(cb: (msg: WsInboundMessage) => void): () => void {
    this.messageListeners.add(cb);
    return () => this.messageListeners.delete(cb);
  }

  // ── onError ────────────────────────────────────────────────────────────────
  // Returns a cleanup function — call it to unsubscribe.
  onError(cb: (err: Event) => void): () => void {
    this.errorListeners.add(cb);
    return () => this.errorListeners.delete(cb);
  }

  // ── isConnected ────────────────────────────────────────────────────────────
  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  // ── Reconnect (private) ────────────────────────────────────────────────────
  private reconnect(conversationId: string): void {
    this.retryCount += 1;
    const delay = this.RETRY_DELAY_MS * this.retryCount;

    console.warn(
      `[ChatService] Reconnecting (attempt ${this.retryCount}/${this.MAX_RETRIES}) in ${delay}ms...`,
    );

    setTimeout(() => {
      this.connect(conversationId).catch((err: unknown) => {
        console.error('[ChatService] Reconnect failed:', err);
      });
    }, delay);
  }
}

export const chatService = ChatService.getInstance();
