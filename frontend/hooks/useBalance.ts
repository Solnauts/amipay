import { useState, useEffect, useCallback } from 'react';
import { userService } from '../src/services';

// ─────────────────────────────────────────────────────────────────────────────
// useBalance — fetches and exposes the user's USDC balance
// Auto-fetches on mount; call refetch() to manually refresh
// ─────────────────────────────────────────────────────────────────────────────

interface UseBalanceReturn {
  balance: number | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useBalance = (): UseBalanceReturn => {
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const amount = await userService.getUsdcBalance();
      setBalance(amount);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch balance';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { balance, isLoading, error, refetch };
};
