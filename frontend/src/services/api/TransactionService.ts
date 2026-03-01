import { TransactionHistoryResponse } from '../../types/api';
import BaseService from './BaseService';

// ─────────────────────────────────────────────────────────────────────────────
// TransactionService — Singleton
// ─────────────────────────────────────────────────────────────────────────────

class TransactionService extends BaseService {
  private static instance: TransactionService;

  private constructor() {
    super(process.env.EXPO_PUBLIC_API_URL!);
  }

  public static getInstance(): TransactionService {
    if (!TransactionService.instance) {
      TransactionService.instance = new TransactionService();
    }
    return TransactionService.instance;
  }

  // ── Get History ────────────────────────────────────────────────────────────
  // GET /api/user/transactions?page=&limit=
  async getHistory(
    page: number = 1,
    limit: number = 20,
  ): Promise<TransactionHistoryResponse> {
    try {
      const response = await this.client.get<TransactionHistoryResponse>(
        '/api/user/transactions',
        { params: { page, limit } },
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }
}

export const transactionService = TransactionService.getInstance();
