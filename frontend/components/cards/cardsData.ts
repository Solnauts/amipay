// Mock data and types for the Contacts + Group Payment (Cards) screen

export type Contact = {
  id: string;
  name: string;
  emoji: string;            // fallback avatar text
  avatar: string;           // image URI (placeholder for mock)
  username: string;         // e.g. "Ridhi@amypay"
  shortAddress: string;     // e.g. "0xsdde...De"
};

export type Group = {
  id: string;
  name: string;
  memberCount: number;
  lastUsedLabel: string;
};

// Helper — generates a consistent placeholder avatar
function av(seed: string) {
  return `https://api.dicebear.com/7.x/adventurer/png?seed=${seed}&size=128`;
}

export const CONTACTS: Contact[] = [
  { id: 'c1', name: 'Mom',     emoji: '❤️', avatar: av('mom'),     username: 'Ridhi@amypay',   shortAddress: '0xsdde...De' },
  { id: 'c2', name: 'Dad',     emoji: '🧔', avatar: av('dad'),     username: 'Dad@amypay',     shortAddress: '0xbcde...Fa' },
  { id: 'c3', name: 'Sister',  emoji: '👧', avatar: av('sister'),  username: 'Sis@amypay',     shortAddress: '0x1234...Ab' },
  { id: 'c4', name: 'Asish',   emoji: '🧑', avatar: av('asish'),   username: 'Asish@amypay',   shortAddress: '0xdead...99' },
  { id: 'c5', name: 'Sarah',   emoji: '👩', avatar: av('sarah'),   username: 'Sarah@amypay',   shortAddress: '0xcafe...12' },
  { id: 'c6', name: 'Brother', emoji: '🧒', avatar: av('brother'), username: 'Bro@amypay',     shortAddress: '0xfade...34' },
  { id: 'c7', name: 'Alex',    emoji: '😎', avatar: av('alex'),    username: 'Alex@amypay',    shortAddress: '0xaaaa...56' },
  { id: 'c8', name: 'Priya',   emoji: '🌸', avatar: av('priya'),   username: 'Priya@amypay',   shortAddress: '0xbbbb...78' },
];

export const GROUPS: Group[] = [
  { id: 'g1', name: 'Family',  memberCount: 3, lastUsedLabel: '2 days ago' },
  { id: 'g2', name: 'Friends', memberCount: 3, lastUsedLabel: '1 week ago' },
];
