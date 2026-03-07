import { DepositRequest, DepositResponse, ClaimRequest, ClaimResponse, AllTransactionsResponse } from '../../types/api';
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

  // ── Claim / Withdraw ─────────────────────────────────────────────────
  // POST /claimamount
  // amount: in USDC smallest unit (6 decimals) — e.g. 10 USDC = 10_000_000
  // method: 'Auto-Claim' (uses user's own wallet) | 'Manual-Claim' (explicit pubkey)
  async claimAmount(payload: ClaimRequest): Promise<ClaimResponse> {
    try {
      console.log('[Withdraw] claimAmount payload:', JSON.stringify(payload, null, 2));
      const response = await this.client.post<ClaimResponse>(
        '/claimamount',
        payload,
      );
      console.log('[Withdraw] claimAmount ✅:', response.data);
      return response.data;
    } catch (error: any) {
      // Log the full backend response so we can see the real error
      console.error('[Withdraw] claimAmount FAILED');
      console.error('  HTTP status  :', error?.response?.status);
      console.error('  Response body:', JSON.stringify(error?.response?.data, null, 2));
      console.error('  Axios message:', error?.message);
      this.handleError(error);
    }
  }

  // ── Get All Transactions ─────────────────────────────────────────────
  // GET /wallet/all_transactions
  async getAllTransactions(): Promise<AllTransactionsResponse> {
    try {
      const response = await this.client.get<AllTransactionsResponse>(
        '/wallet/all_transactions',
      );
      console.log('[Transaction] raw response:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }
}

export const transactionService = TransactionService.getInstance();
