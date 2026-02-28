// Shared types and mock data for the home screen
export type Contact = {
  initials: string;
  name: string;
  color: string;
};

export type Transaction = {
  initials: string;
  name: string;
  subtitle: string;
  time: string;
  amount: string;
  color: string;
  isDebit: boolean;
};

export const CONTACTS: Contact[] = [
  { initials: 'SJ', name: 'Sarah J.', color: '#6366f1' },
  { initials: 'MO', name: 'Mom', color: '#3b82f6' },
  { initials: 'AC', name: 'Alex C.', color: '#9ca3af' },
  { initials: 'BR', name: 'Brother', color: '#111827' },
];

export const TRANSACTIONS: Transaction[] = [
  { initials: 'GE', name: 'Gemini', subtitle: 'Subscription', time: '2h ago', amount: '-0.05 SOL', color: '#111827', isDebit: true },
  { initials: 'SJ', name: 'Sarah Johnson', subtitle: 'Sent', time: '5h ago', amount: '-0.10 SOL', color: '#6366f1', isDebit: true },
  { initials: 'RE', name: 'Rewards', subtitle: 'Cashback', time: '1d ago', amount: '+0.02 SOL', color: '#22c55e', isDebit: false },
  { initials: 'MO', name: 'Mom', subtitle: 'Received', time: '2d ago', amount: '+0.25 SOL', color: '#3b82f6', isDebit: false },
];
