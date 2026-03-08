import { useState, useEffect, useCallback } from 'react';
import { transactionService } from '../src/services';
import { TransactionRecord } from '../src/types/api';
import { ActivityTransaction, TxType } from '../components/activity/activityData';
import { transactionsStore } from '../src/store/transactionsStore';
import { useWallet } from '../context/WalletContext';

// Backend stores amounts in micro-units (6 decimal places)
// e.g. 10_000_000 → 10.00 USDC
const DECIMALS = 1_000_000;

// ─────────────────────────────────────────────────────────────────────────────
// Direction logic:
//   status === 'deposit'          → always received (money coming into vault)
//   status === 'claimed'          → always sent (withdrawn from vault)
//   status === 'confirmed'
//     receiver_id === userId      → YOU received money from someone else
//     sender_id   === userId      → YOU sent money to someone else
// ─────────────────────────────────────────────────────────────────────────────

function mapToActivity(tr: TransactionRecord, userId: number): ActivityTransaction {
  const rawAmount = tr.amount / DECIMALS;

  let type: TxType;
  let amount: number;
  let color: string;
  let displayName: string;
  let description: string;

  switch (tr.status) {
    case 'deposit':
      // Always a deposit into your own vault — positive
      type = 'received';
      amount = rawAmount;
      color = '#22c55e';       // green
      displayName = 'Deposit';
      description = 'Deposited to vault';
      break;

    case 'claimed':
      // Withdrawal from vault to your wallet — negative
      type = 'sent';
      amount = -rawAmount;
      color = '#F97316';       // orange
      displayName = 'Claimed';
      description = 'Withdrawn from vault';
      break;

    case 'confirmed':
      if (tr.receiver_id === userId) {
        // YOU are the receiver — money came IN
        type = 'received';
        amount = rawAmount;
        color = '#22c55e';     // green
        displayName = 'Received';
        description = `Received from #${tr.sender_id}`;
      } else {
        // YOU are the sender (or a neutral observer — treat as sent)
        type = 'sent';
        amount = -rawAmount;
        color = '#ef4444';     // red
        displayName = 'Sent';
        description = `Sent to #${tr.receiver_id}`;
      }
      break;

    default:
      type = 'received';
      amount = rawAmount;
      color = '#64748b';
      displayName = tr.status;
      description = tr.status;
  }

  return {
    id: String(tr.id),
    initials: displayName.charAt(0).toUpperCase(),
    name: displayName,
    description,
    token: tr.currency ?? 'USDC',
    amount,
    type,
    color,
    date: tr.created_at,
  };
}

export interface UseTransactionsReturn {
  transactions: ActivityTransaction[];
  rawRecords: TransactionRecord[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useTransactions = (): UseTransactionsReturn => {
  const { user } = useWallet();
  const userId = user?.id ?? 0;

  // 1. Boot from local cache immediately (no flicker / no spinner on re-visit)
  const [rawRecords, setRawRecords] = useState<TransactionRecord[]>(() =>
    transactionsStore.getAll(),
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Derive the mapped list from the raw records so both are always in sync
  // Pass userId so direction is computed correctly for the current user
  const transactions: ActivityTransaction[] = rawRecords
    .filter((tr) => tr && tr.id)
    .map((tr) => mapToActivity(tr, userId))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // 2. Fetch from API, update cache, update state
  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await transactionService.getAllTransactions();

      if (resp && resp.transactions) {
        const sorted = [...resp.transactions].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        transactionsStore.setAll(sorted);
        setRawRecords(sorted);
      }
    } catch (err: any) {
      console.error('[useTransactions] fetch error:', err);
      setError(err?.message || 'Failed to fetch transactions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch once on mount (first-time load / cold start)
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    rawRecords,          // ← raw TransactionRecord[] for contact-level filtering
    isLoading,
    error,
    refresh: fetchTransactions,
  };
};

