// transactionsStore — MMKV-backed local transaction cache
//
// Responsibilities:
//  • Persist all transactions so screens load instantly (no API wait)
//  • Expose helpers to read, overwrite, and merge from API
//  • Also caches the raw TransactionRecord so contact sheets can filter by receiver_id / sender_id
//
// Key: 'transactions_v1'

import { createMMKV } from 'react-native-mmkv';
import { TransactionRecord } from '../types/api';

const storage = createMMKV({ id: 'transactions-store' });
const TX_KEY = 'transactions_v1';

export const transactionsStore = {
  // ── Read all raw records ────────────────────────────────────────────────────
  getAll(): TransactionRecord[] {
    const raw = storage.getString(TX_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as TransactionRecord[];
    } catch {
      return [];
    }
  },

  // ── Overwrite all ──────────────────────────────────────────────────────────
  setAll(transactions: TransactionRecord[]): void {
    storage.set(TX_KEY, JSON.stringify(transactions));
  },

  // ── Clear ─────────────────────────────────────────────────────────────────
  clear(): void {
    storage.set(TX_KEY, JSON.stringify([]));
  },
};
