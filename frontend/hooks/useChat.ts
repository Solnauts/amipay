import { useState, useCallback, useEffect, useRef } from 'react';
import { chatService } from '../src/services';
import type { WsInboundMessage } from '../src/types/api';

// ─────────────────────────────────────────────────────────────────────────────
// useChat — manages WebSocket connection + message state
// Cleans up automatically on unmount
// ─────────────────────────────────────────────────────────────────────────────

interface UseChatReturn {
  messages: WsInboundMessage[];
  isConnected: boolean;
  connect: (conversationId: string) => Promise<void>;
  disconnect: () => void;
  sendMessage: (content: string) => void;
  confirmAction: (pendingActionId: string, response: string) => void;
}

export const useChat = (): UseChatReturn => {
  const [messages, setMessages] = useState<WsInboundMessage[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Track the active conversationId so sendMessage/confirmAction don't need it as args
  const conversationIdRef = useRef<string>('');

  // ── Connect ────────────────────────────────────────────────────────────────
  const connect = useCallback(async (conversationId: string): Promise<void> => {
    conversationIdRef.current = conversationId;
    await chatService.connect(conversationId);
    setIsConnected(true);
  }, []);

  // ── Disconnect ─────────────────────────────────────────────────────────────
  const disconnect = useCallback((): void => {
    chatService.disconnect();
    setIsConnected(false);
  }, []);

  // ── Send Message ───────────────────────────────────────────────────────────
  const sendMessage = useCallback((content: string): void => {
    chatService.sendMessage(content, conversationIdRef.current);
  }, []);

  // ── Confirm Action ─────────────────────────────────────────────────────────
  const confirmAction = useCallback(
    (pendingActionId: string, response: string): void => {
      chatService.confirmAction(
        pendingActionId,
        conversationIdRef.current,
        response,
      );
    },
    [],
  );

  // ── Subscribe to incoming messages & cleanup on unmount ───────────────────
  useEffect(() => {
    const unsubscribeMessage = chatService.onMessage((msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    const unsubscribeError = chatService.onError((err) => {
      console.error('[useChat] WebSocket error:', err);
      setIsConnected(false);
    });

    // Cleanup: unsubscribe listeners and disconnect socket on unmount
    return () => {
      unsubscribeMessage();
      unsubscribeError();
      chatService.disconnect();
    };
  }, []);

  return { messages, isConnected, connect, disconnect, sendMessage, confirmAction };
};
