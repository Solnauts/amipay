// Shared types and mock data for the home screen

export type Contact = {
  id: string;
  initials: string;
  name: string;
  color: string;
  imageUri?: string;
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

// "People" grid — all contacts the user has interacted with recently
export const PEOPLE: Contact[] = [
  { id: 'c4', initials: 'S',  name: 'Sarah',  color: '#9333EA' },
  { id: 'c2', initials: 'D',  name: 'Dad',    color: '#EF4444' },
  { id: 'c3', initials: 'B',  name: 'Brother', color: '#22c55e' },
  { id: 'c1', initials: 'M',  name: 'Mom',    color: '#F97316' },
  { id: 'c5', initials: 'R',  name: 'Raima',  color: '#7C3AED' },
  { id: 'c6', initials: 'A',  name: 'Asish',  color: '#6B7280' },
  { id: 'c7', initials: 'D',  name: 'Disha',  color: '#3B82F6' },
];

// "Favourite" section — pinned contacts
export const FAVOURITES: Contact[] = [
  { id: 'c1', initials: 'M', name: 'Mom',    color: '#7C3AED' },
  { id: 'c2', initials: 'D', name: 'Dad',    color: '#22c55e' },
  { id: 'c3', initials: 'S', name: 'Sister', color: '#3B82F6' },
];

// Legacy — still used by existing RecentTransactions
export const CONTACTS: Contact[] = PEOPLE;

export const TRANSACTIONS: Transaction[] = [
  { initials: 'GE', name: 'Gemini',       subtitle: 'Subscription', time: '2h ago',  amount: '-$5.00',  color: '#111827', isDebit: true  },
  { initials: 'SJ', name: 'Sarah Johnson',subtitle: 'Sent',         time: '5h ago',  amount: '-$12.00', color: '#6366f1', isDebit: true  },
  { initials: 'RE', name: 'Rewards',      subtitle: 'Cashback',     time: '1d ago',  amount: '+$2.50',  color: '#22c55e', isDebit: false },
  { initials: 'MO', name: 'Mom',          subtitle: 'Received',     time: '2d ago',  amount: '+$25.00', color: '#3b82f6', isDebit: false },
];
