import { useState, useCallback } from 'react';
import { transactionService } from '../src/services';
import type { Transaction } from '../src/types/api';

// ─────────────────────────────────────────────────────────────────────────────
// useTransactions — paginated transaction history
// Does NOT auto-fetch — caller controls when to load pages
// ─────────────────────────────────────────────────────────────────────────────

interface UseTransactionsReturn {
  transactions: Transaction[];
  total: number;
  isLoading: boolean;
  error: string | null;
  fetchPage: (page: number) => Promise<void>;
}

export const useTransactions = (): UseTransactionsReturn => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch Page ─────────────────────────────────────────────────────────────
  // Replaces current list — caller manages accumulation if infinite scroll needed
  const fetchPage = useCallback(async (page: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await transactionService.getHistory(page);
      setTransactions(response.transactions);
      setTotal(response.total);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch transactions';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { transactions, total, isLoading, error, fetchPage };
};
