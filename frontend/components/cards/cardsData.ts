// Mock data and types for the Group Payment (Cards) screen
// Contacts are the selectable recipients; Groups are pre-saved sets of contacts

export type Contact = {
  id: string;
  name: string;
  emoji: string;           // displayed as avatar
  shortAddress: string;    // e.g. "8yL...nQ1"
};

export type Group = {
  id: string;
  name: string;
  memberCount: number;
  lastUsedLabel: string;   // e.g. "2 days ago"
};

export const CONTACTS: Contact[] = [
  { id: 'c1', name: 'Mom',     emoji: '❤️',  shortAddress: '8yL...nQ1' },
  { id: 'c2', name: 'Dad',     emoji: '🧔',  shortAddress: '7xK...mP9' },
  { id: 'c3', name: 'Brother', emoji: '🧒',  shortAddress: '9zM...oR2' },
  { id: 'c4', name: 'Sarah',   emoji: '👧',  shortAddress: '5wH...kS3' },
];

export const GROUPS: Group[] = [
  { id: 'g1', name: 'Family',  memberCount: 3, lastUsedLabel: '2 days ago' },
  { id: 'g2', name: 'Friends', memberCount: 3, lastUsedLabel: '1 week ago' },
];
