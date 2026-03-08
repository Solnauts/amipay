import axios, {
  AxiosError,
  AxiosInstance,
} from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// Shape of a backend error response body
// ─────────────────────────────────────────────────────────────────────────────

interface ApiErrorBody {
  message?: string;
  error?: string;
  status?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// BaseService — abstract, Singleton-ready
// The backend uses HttpOnly cookie auth (session_token) — no JWT in headers.
// withCredentials: true ensures Android sends & receives cookies on every request.
// ─────────────────────────────────────────────────────────────────────────────

abstract class BaseService {
  protected readonly client: AxiosInstance;

  protected constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 45_000,   // 45s — Solana on-chain TX confirmation can take 10-30s
      headers: {
        'Content-Type': 'application/json',
        // Bypass ngrok's browser-warning interstitial page for non-browser clients
        'ngrok-skip-browser-warning': '1',
      },
      // CRITICAL: tells axios (and the native layer) to include cookies
      withCredentials: true,
    });

    // ── Response Interceptor ─────────────────────────────────────────────────
    this.client.interceptors.response.use(
      (response) => response,
      async (error: unknown) => {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          const body = error.response?.data as ApiErrorBody | undefined;

          if (status === 401) {
            // Session expired — caller should handle navigation
            throw new Error('SESSION_EXPIRED');
          }

          if (status === 500) {
            throw new Error(body?.message ?? body?.error ?? 'Server error');
          }
        }
        return Promise.reject(error);
      },
    );
  }

  // ── Error Helper ───────────────────────────────────────────────────────────
  protected handleError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const axiosErr = error as AxiosError<ApiErrorBody>;
      const serverMsg =
        axiosErr.response?.data?.message ??
        axiosErr.response?.data?.error ??
        axiosErr.message;
      throw new Error(serverMsg ?? 'An unexpected error occurred');
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('An unexpected error occurred');
  }
}

export default BaseService;
