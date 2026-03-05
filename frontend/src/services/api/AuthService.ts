import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoginRequest, LoginResponse, RegisterRequest, UserProfile } from '../../types/api';
import BaseService, { TOKEN_KEY } from './BaseService';

// ─────────────────────────────────────────────────────────────────────────────
// AuthService — Singleton
// ─────────────────────────────────────────────────────────────────────────────

class AuthService extends BaseService {
  private static instance: AuthService;

  private constructor() {
    super(process.env.EXPO_PUBLIC_API_URL!);
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // ── Register ───────────────────────────────────────────────────────────────
  // POST /api/auth/register
  async register(data: RegisterRequest): Promise<UserProfile> {
    try {
      const response = await this.client.post<UserProfile>(
        '/api/auth/register',
        data,
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  // POST /api/auth/login
  // Persists JWT to AsyncStorage on success.
  async login(data: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await this.client.post<LoginResponse>(
        '/api/auth/login',
        data,
      );
      const { token } = response.data;
      await AsyncStorage.setItem(TOKEN_KEY, token);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  // Removes JWT from AsyncStorage — no backend call needed.
  async logout(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }

  // ── Get Token ──────────────────────────────────────────────────────────────
  // Returns the stored JWT or null if not logged in.
  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY);
  }
}

export const authService = AuthService.getInstance();
