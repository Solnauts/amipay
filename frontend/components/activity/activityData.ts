// Shared types and mock data for the Activity screen
// Add new transactions here — the utils will auto-group by date

export type TxType = 'sent' | 'received';

export type ActivityTransaction = {
  id: string;
  initials: string;
  name: string;
  description: string;
  token: string;
  amount: number;    // positive for received, negative for sent
  type: TxType;
  color: string;    // avatar background
  date: string;     // ISO date string: '2026-03-01T12:35:00Z'
};

export const ACTIVITY_TRANSACTIONS: ActivityTransaction[] = [
  // ── TODAY (2026-03-01) ──────────────────────────────────────────────
  {
    id: '1',
    initials: 'GE',
    name: 'Gemini',
    description: 'Monthly subscription',
    token: 'USDC',
    amount: -100,
    type: 'sent',
    color: '#111827',
    date: '2026-03-01T12:35:00Z',
  },
  {
    id: '2',
    initials: 'SJ',
    name: 'Sarah Johnson',
    description: 'Payment sent',
    token: 'USDC',
    amount: -250,
    type: 'sent',
    color: '#6366f1',
    date: '2026-03-01T09:35:00Z',
  },
  // ── YESTERDAY (2026-02-28) ──────────────────────────────────────────
  {
    id: '3',
    initials: 'RE',
    name: 'Rewards',
    description: 'Cashback earned',
    token: 'USDC',
    amount: 50,
    type: 'received',
    color: '#22c55e',
    date: '2026-02-28T02:35:00Z',
  },
  // ── FEB 27, 2026 ────────────────────────────────────────────────────
  {
    id: '4',
    initials: 'AC',
    name: 'Alex Chen',
    description: 'Payment received',
    token: 'USDC',
    amount: 500,
    type: 'received',
    color: '#9ca3af',
    date: '2026-02-27T02:35:00Z',
  },
  // ── FEB 26, 2026 ────────────────────────────────────────────────────
  {
    id: '5',
    initials: 'MO',
    name: 'Mom',
    description: 'Family payment',
    token: 'USDC',
    amount: -1000,
    type: 'sent',
    color: '#3b82f6',
    date: '2026-02-26T02:35:00Z',
  },
  // ── FEB 25, 2026 ────────────────────────────────────────────────────
  {
    id: '6',
    initials: 'BR',
    name: 'Brother',
    description: 'Payment sent',
    token: 'SOL',
    amount: -150,
    type: 'sent',
    color: '#111827',
    date: '2026-02-25T02:35:00Z',
  },
  // ── FEB 24, 2026 ────────────────────────────────────────────────────
  {
    id: '7',
    initials: 'RP',
    name: 'Rewards Program',
    description: 'Staking rewards',
    token: 'SEEKER',
    amount: 25.5,
    type: 'received',
    color: '#8b5cf6',
    date: '2026-02-24T02:35:00Z',
  },
];
