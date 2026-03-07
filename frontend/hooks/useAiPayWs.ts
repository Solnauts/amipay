/**
 * React hook wrapping WsService for the AI Pay chat screen.
 *
 * Provides:
 *  - WebSocket lifecycle tied to the component mount
 *  - State for messages, connection status, waiting indicator
 *  - Typed helpers to send chat & action responses
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    WsService,
    type AssistantMessagePayload,
    type ErrorPayload,
} from '@/services/wsService';

// ─── Chat message model (used by the UI) ────────────────────────────────────

export interface ChatMessage {
    id: string;
    text: string;
    isUser: boolean;
    time: string;
    /** If set, the server expects an ActionResponse for this pending_action_id */
    pendingActionId?: number;
    /** conversation_id from the server */
    conversationId?: number;
    /** Whether this is an error message */
    isError?: boolean;
    errorCode?: number;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

interface UseAiPayWsOptions {
    /** JWT auth token from /wallet/login */
    token: string | null;
    /** Override the WS base URL (optional) */
    baseUrl?: string;
}

export function useAiPayWs({ token, baseUrl }: UseAiPayWsOptions) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isWaiting, setIsWaiting] = useState(false);

    // Persist the current conversation_id returned by the server
    const conversationIdRef = useRef<number | null>(null);
    const wsRef = useRef<WsService | null>(null);
    const msgCounterRef = useRef(0);

    // ── Helpers ────────────────────────────────────────────────────────

    const nowTime = useCallback(() => {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, []);

    const nextId = useCallback((prefix: string) => {
        msgCounterRef.current += 1;
        return `${prefix}-${Date.now()}-${msgCounterRef.current}`;
    }, []);

    // ── Append helper (avoids closure-stale issues) ────────────────────

    const appendMessage = useCallback((msg: ChatMessage) => {
        setMessages((prev) => [...prev, msg]);
    }, []);

    // ── Handlers ──────────────────────────────────────────────────────

    const handleAssistantMessage = useCallback(
        (payload: AssistantMessagePayload) => {
            setIsWaiting(false);

            // Track the conversation_id from the server
            conversationIdRef.current = payload.conversation_id;

            const msg: ChatMessage = {
                id: nextId('ai'),
                text: payload.task,
                isUser: false,
                time: nowTime(),
                pendingActionId: payload.pending_action_id ?? undefined,
                conversationId: payload.conversation_id,
            };
            appendMessage(msg);
        },
        [appendMessage, nextId, nowTime],
    );

    const handleError = useCallback(
        (payload: ErrorPayload) => {
            setIsWaiting(false);

            const msg: ChatMessage = {
                id: nextId('err'),
                text: payload.error_message,
                isUser: false,
                time: nowTime(),
                isError: true,
                errorCode: payload.error_code,
                conversationId: payload.conversation_id,
                pendingActionId: payload.pending_action_id ?? undefined,
            };
            appendMessage(msg);
        },
        [appendMessage, nextId, nowTime],
    );

    const handleConnectionChange = useCallback((connected: boolean) => {
        setIsConnected(connected);
        if (!connected) {
            setIsWaiting(false);
        }
    }, []);

    const handleClose = useCallback((_code?: number, reason?: string) => {
        if (reason) {
            console.log('[useAiPayWs] WS closed:', reason);
        }
    }, []);

    // ── Lifecycle ─────────────────────────────────────────────────────

    useEffect(() => {
        if (!token) return;

        const ws = new WsService({
            token,
            baseUrl,
            autoReconnect: true,
            maxReconnectAttempts: 5,
        });

        ws.setListeners({
            onAssistantMessage: handleAssistantMessage,
            onError: handleError,
            onConnectionChange: handleConnectionChange,
            onClose: handleClose,
        });

        ws.connect();
        wsRef.current = ws;

        return () => {
            ws.disconnect();
            wsRef.current = null;
        };
        // We intentionally only re-create the socket when token/baseUrl change.
        // The callbacks are stable refs, but ESLint may still complain.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, baseUrl]);

    // Re-attach listeners when handler refs change (without recreating the socket)
    useEffect(() => {
        wsRef.current?.setListeners({
            onAssistantMessage: handleAssistantMessage,
            onError: handleError,
            onConnectionChange: handleConnectionChange,
            onClose: handleClose,
        });
    }, [handleAssistantMessage, handleError, handleConnectionChange, handleClose]);

    // ── Send helpers ──────────────────────────────────────────────────

    const sendUserMessage = useCallback(
        (text: string) => {
            if (!wsRef.current || !text.trim()) return;

            // Append user bubble immediately
            const userMsg: ChatMessage = {
                id: nextId('u'),
                text: text.trim(),
                isUser: true,
                time: nowTime(),
            };
            appendMessage(userMsg);
            setIsWaiting(true);

            // Use existing conversation_id if we have one
            const convId = conversationIdRef.current;
            wsRef.current.sendUserMessage(
                text.trim(),
                convId !== null ? String(convId) : null,
            );
        },
        [appendMessage, nextId, nowTime],
    );

    const sendActionResponse = useCallback(
        (conversationId: number, pendingActionId: number, response: string) => {
            if (!wsRef.current) return;

            // Append user response bubble (e.g. masked PIN)
            const userMsg: ChatMessage = {
                id: nextId('u'),
                text: '••••', // Don't display the actual PIN
                isUser: true,
                time: nowTime(),
            };
            appendMessage(userMsg);
            setIsWaiting(true);

            wsRef.current.sendActionResponse(conversationId, pendingActionId, response);
        },
        [appendMessage, nextId, nowTime],
    );

    // ── Reset ─────────────────────────────────────────────────────────

    const resetConversation = useCallback(() => {
        setMessages([]);
        conversationIdRef.current = null;
        setIsWaiting(false);
    }, []);

    return {
        messages,
        isConnected,
        isWaiting,
        sendUserMessage,
        sendActionResponse,
        resetConversation,
    };
}
