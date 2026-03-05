// Shared mock data for the Contacts screen

export type MockTx = {
  type: 'Sent' | 'Received';
  time: string;
  amount: string;
  received: boolean;
};

export const RECENT_CONTACT_IDS = ['c2', 'c1', 'c3', 'c4'];

export const MOCK_TXS: MockTx[] = [
  { type: 'Sent',     time: '2 Days Ago', amount: '-50 USDC',  received: false },
  { type: 'Received', time: '5 Days Ago', amount: '+50 USDC',  received: true  },
  { type: 'Sent',     time: '2 Days Ago', amount: '-200 USDC', received: false },
];
