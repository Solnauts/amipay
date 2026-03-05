import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';
import { router } from 'expo-router';

// ─────────────────────────────────────────────────────────────────────────────
// Token Storage Key
// ─────────────────────────────────────────────────────────────────────────────

export const TOKEN_KEY = 'remitly_token';

// ─────────────────────────────────────────────────────────────────────────────
// Shape of a backend error response body
// ─────────────────────────────────────────────────────────────────────────────

interface ApiErrorBody {
  message?: string;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// BaseService — abstract, Singleton-ready
// ─────────────────────────────────────────────────────────────────────────────

abstract class BaseService {
  protected readonly client: AxiosInstance;

  protected constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 10_000,
      headers: { 'Content-Type': 'application/json' },
    });

    // ── Request Interceptor ──────────────────────────────────────────────────
    // AsyncStorage.getItem is async, so we use the eject pattern:
    // attach the token inside the fulfilled handler asynchronously.
    this.client.interceptors.request.use(
      async (
        config: InternalAxiosRequestConfig,
      ): Promise<InternalAxiosRequestConfig> => {
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: unknown) => Promise.reject(error),
    );

    // ── Response Interceptor ─────────────────────────────────────────────────
    this.client.interceptors.response.use(
      (response) => response,
      async (error: unknown) => {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;

          if (status === 401) {
            // Clear stale token and redirect to login
            await AsyncStorage.removeItem(TOKEN_KEY);
            router.replace('/login');
          }

          if (status === 500) {
            const body = error.response?.data as ApiErrorBody | undefined;
            throw new Error(body?.message ?? body?.error ?? 'Server error');
          }
        }
        return Promise.reject(error);
      },
    );
  }

  // ── Error Helper ───────────────────────────────────────────────────────────
  // Converts any thrown value into a human-readable Error and re-throws.
  // Return type `never` ensures TypeScript knows this always throws.
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
