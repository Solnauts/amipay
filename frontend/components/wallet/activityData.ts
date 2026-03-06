// Shared types and mock data for the Activity screen
// Dates are adjusted to always be relative — use Date.now() offsets

export type TxType = 'sent' | 'received';

export type ActivityTransaction = {
  id: string;
  initials: string;
  name: string;
  description: string;
  token: string;
  amount: number;    // positive = received, negative = sent
  type: TxType;
  color: string;    // avatar background
  date: string;     // ISO date string
};

// Helper — N hours ago from now
function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
}
// Helper — N days ago from now
function daysAgo(d: number): string {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString();
}

export const ACTIVITY_TRANSACTIONS: ActivityTransaction[] = [
  // ── TODAY ──────────────────────────────────────────────────────────────
  {
    id: '1',
    initials: 'M',
    name: 'Send To Mom',
    description: 'Payment sent',
    token: 'USDC',
    amount: -50,
    type: 'sent',
    color: '#F97316',
    date: hoursAgo(2),
  },
  {
    id: '2',
    initials: 'T',
    name: 'Received From Tolly',
    description: 'Payment received',
    token: 'USDC',
    amount: 100,
    type: 'received',
    color: '#1e293b',
    date: hoursAgo(5),
  },
  {
    id: '3',
    initials: 'C',
    name: 'Sent To Crusty',
    description: 'Payment sent',
    token: 'USDC',
    amount: -500,
    type: 'sent',
    color: '#1e3a5f',
    date: hoursAgo(5),
  },
  // ── YESTERDAY ──────────────────────────────────────────────────────────
  {
    id: '4',
    initials: 'M',
    name: 'Send To Mom',
    description: 'Payment sent',
    token: 'USDC',
    amount: -50,
    type: 'sent',
    color: '#F97316',
    date: daysAgo(1),
  },
  {
    id: '5',
    initials: 'SJ',
    name: 'Sarah Johnson',
    description: 'Payment sent',
    token: 'USDC',
    amount: -250,
    type: 'sent',
    color: '#6366f1',
    date: daysAgo(1),
  },
  {
    id: '6',
    initials: 'RE',
    name: 'Rewards',
    description: 'Cashback earned',
    token: 'USDC',
    amount: 50,
    type: 'received',
    color: '#22c55e',
    date: daysAgo(1),
  },
  // ── 2 DAYS AGO ─────────────────────────────────────────────────────────
  {
    id: '7',
    initials: 'AC',
    name: 'Alex Chen',
    description: 'Payment received',
    token: 'USDC',
    amount: 500,
    type: 'received',
    color: '#9ca3af',
    date: daysAgo(2),
  },
  {
    id: '8',
    initials: 'B',
    name: 'Brother',
    description: 'Payment sent',
    token: 'SOL',
    amount: -150,
    type: 'sent',
    color: '#111827',
    date: daysAgo(2),
  },
  // ── 3 DAYS AGO ─────────────────────────────────────────────────────────
  {
    id: '9',
    initials: 'RP',
    name: 'Rewards Program',
    description: 'Staking rewards',
    token: 'SEEKER',
    amount: 25.5,
    type: 'received',
    color: '#8b5cf6',
    date: daysAgo(3),
  },
];
