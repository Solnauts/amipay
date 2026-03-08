// Pure helper functions for the Activity screen
// No UI — keeps components clean and logic testable

import { ActivityTransaction, TxType } from '@/components/activity/activityData';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type FilterType = 'all' | TxType;

export type TransactionGroup = {
  label: string;   // e.g. "TODAY", "YESTERDAY", "FEB 27, 2026"
  data: ActivityTransaction[];
};

// ---------------------------------------------------------------------------
// Date label helper
// Returns a human-readable group header for a given ISO date string
// ---------------------------------------------------------------------------
export function getDateLabel(isoDate: string): string {
  const txDate = new Date(isoDate);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(txDate, today)) return 'TODAY';
  if (isSameDay(txDate, yesterday)) return 'YESTERDAY';

  return txDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).toUpperCase(); // e.g. "FEB 27, 2026"
}

// ---------------------------------------------------------------------------
// Time formatter
// Returns relative time like "2hr ago", "5hr ago", "2d ago"
// ---------------------------------------------------------------------------
export function formatTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}min ago`;
  if (hours < 24) return `${hours}hr ago`;
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Amount formatter
// Returns "+500" or "-100" (no sign for display, caller uses color)
// ---------------------------------------------------------------------------
export function formatAmount(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = Number.isInteger(abs) ? String(abs) : abs.toFixed(1);
  return amount >= 0 ? `+${formatted}` : `-${formatted}`;
}

// ---------------------------------------------------------------------------
// Filter transactions by type
// ---------------------------------------------------------------------------
export function filterTransactions(
  transactions: ActivityTransaction[],
  filter: FilterType,
): ActivityTransaction[] {
  if (filter === 'all') return transactions;
  return transactions.filter((tx) => tx.type === filter);
}

// ---------------------------------------------------------------------------
// Search transactions by name or description (case-insensitive)
// ---------------------------------------------------------------------------
export function searchTransactions(
  transactions: ActivityTransaction[],
  query: string,
): ActivityTransaction[] {
  if (!query.trim()) return transactions;
  const q = query.toLowerCase();
  return transactions.filter(
    (tx) =>
      tx.name.toLowerCase().includes(q) ||
      tx.description.toLowerCase().includes(q) ||
      tx.token.toLowerCase().includes(q),
  );
}

// ---------------------------------------------------------------------------
// Group transactions by date label (preserves existing sort order)
// ---------------------------------------------------------------------------
export function groupByDate(transactions: ActivityTransaction[]): TransactionGroup[] {
  const groups: Record<string, ActivityTransaction[]> = {};
  const order: string[] = [];

  for (const tx of transactions) {
    const label = getDateLabel(tx.date);
    if (!groups[label]) {
      groups[label] = [];
      order.push(label);
    }
    groups[label].push(tx);
  }

  return order.map((label) => ({ label, data: groups[label] }));
}

// ---------------------------------------------------------------------------
// Pipeline: filter → search → group (one call from the screen)
// ---------------------------------------------------------------------------
export function getFilteredGroups(
  transactions: ActivityTransaction[],
  filter: FilterType,
  query: string,
): TransactionGroup[] {
  const filtered = filterTransactions(transactions, filter);
  const searched = searchTransactions(filtered, query);
  return groupByDate(searched);
}
