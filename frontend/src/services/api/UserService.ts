import { UserProfile } from '../../types/api';
import BaseService from './BaseService';

// ─────────────────────────────────────────────────────────────────────────────
// UserService — Singleton
// ─────────────────────────────────────────────────────────────────────────────

class UserService extends BaseService {
  private static instance: UserService;

  private constructor() {
    super(process.env.EXPO_PUBLIC_API_URL!);
  }

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  // ── Get Balance ────────────────────────────────────────────────────────────
  // GET /api/user/balance
  async getBalance(): Promise<number> {
    try {
      const response = await this.client.get<{ amount: number }>(
        '/api/user/balance',
      );
      return response.data.amount;
    } catch (error) {
      this.handleError(error);
    }
  }

  // ── Get Profile ────────────────────────────────────────────────────────────
  // GET /api/user/profile
  async getProfile(): Promise<UserProfile> {
    try {
      const response = await this.client.get<UserProfile>('/api/user/profile');
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }
}

export const userService = UserService.getInstance();
