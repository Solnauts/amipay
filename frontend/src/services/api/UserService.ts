import { BackendUser } from '../../types/api';
import BaseService from './BaseService';
import { authService } from './AuthService';

// ─────────────────────────────────────────────────────────────────────────────
// UserService — Singleton
// ─────────────────────────────────────────────────────────────────────────────

class UserService extends BaseService {
  private static instance: UserService;

  private constructor() {
    super(process.env.EXPO_PUBLIC_API_URL!);

    // Forward JWT from authService on every request
    this.client.interceptors.request.use((config) => {
      const authHeader = authService.getAuthHeader();
      if (authHeader) config.headers['Authorization'] = authHeader;
      return config;
    });
  }

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  // ── Get USDC Balance (platform ledger) ────────────────────────────────────
  // GET /wallet/getusdcamount
  async getUsdcBalance(): Promise<number> {
    try {
      const response = await this.client.get<{ status: string; usdc_balance: number }>(
        '/wallet/getusdcamount',
      );
      console.log('[UserService] getUsdcBalance raw response:', JSON.stringify(response.data));
      // usdc_balance is in raw units (6 decimals) → divide by 10^6
      const raw = response.data.usdc_balance;
      const human = typeof raw === 'number' ? raw / 1_000_000 : null;
      console.log('[UserService] usdc_balance raw:', raw, '→ human:', human);
      return human as number;
    } catch (error) {
      this.handleError(error);
    }
  }

  // ── Get Profile ────────────────────────────────────────────────────────────
  // GET /api/user/profile
  async getProfile(): Promise<BackendUser> {
    try {
      const response = await this.client.get<BackendUser>('/api/user/profile');
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }
}

export const userService = UserService.getInstance();
