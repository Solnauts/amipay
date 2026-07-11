// ─────────────────────────────────────────────────────────────────────────────
// Centralized API configuration
// All services import from here — update this single file to change the base URL.
// ─────────────────────────────────────────────────────────────────────────────

/** Base URL for all HTTP API requests */
export const API_BASE_URL = 'https://api.amypay.com';

/** Base URL for WebSocket connections (derived from API_BASE_URL) */
export const WS_BASE_URL = API_BASE_URL
  .replace('https://', 'wss://')
  .replace('http://', 'ws://');
