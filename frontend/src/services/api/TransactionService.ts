import { DepositRequest, DepositResponse } from '../../types/api';
import BaseService from './BaseService';
import { authService } from './AuthService';

// ─────────────────────────────────────────────────────────────────────────────
// TransactionService — Singleton
// ─────────────────────────────────────────────────────────────────────────────

class TransactionService extends BaseService {
  private static instance: TransactionService;

  private constructor() {
    super(process.env.EXPO_PUBLIC_API_URL!);

    // Forward the JWT from authService on every request.
    // authService.setToken() only sets it on authService's own axios instance,
    // so we read it dynamically here before each call.
    this.client.interceptors.request.use((config) => {
      const authHeader = authService.getAuthHeader();
      if (authHeader) {
        config.headers['Authorization'] = authHeader;
      }
      return config;
    });
  }

  public static getInstance(): TransactionService {
    if (!TransactionService.instance) {
      TransactionService.instance = new TransactionService();
    }
    return TransactionService.instance;
  }

  // ── Record Deposit ─────────────────────────────────────────────────────────
  // POST /wallet/deposit — stores confirmed on-chain deposit in the database
  async recordDeposit(payload: DepositRequest): Promise<DepositResponse> {
    try {
      const response = await this.client.post<DepositResponse>(
        '/wallet/deposit',
        payload,
      );
      console.log('[Deposit] Step 6: ✅ recorded:', response.data);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }
}

export const transactionService = TransactionService.getInstance();
