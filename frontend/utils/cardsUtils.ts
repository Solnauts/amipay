// Pure utility functions for the Group Payment screen
// No UI — keeps components clean and logic testable

import { Contact } from '@/components/cards/cardsData';

// ---------------------------------------------------------------------------
// Split amount equally among selected members
// Returns per-person amount as a number (rounded to 2dp)
// ---------------------------------------------------------------------------
export function splitEqually(total: number, memberCount: number): number {
  if (memberCount === 0) return 0;
  return Math.floor((total / memberCount) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Format a number as a clean display amount string
// e.g. 0.33 → "0.33", 100 → "100.00"
// ---------------------------------------------------------------------------
export function formatSplitAmount(amount: number): string {
  if (amount === 0) return '0.00';
  return amount.toFixed(2);
}

// ---------------------------------------------------------------------------
// Toggle a contact in/out of the selected set
// Returns a new array (pure — does not mutate input)
// ---------------------------------------------------------------------------
export function toggleMember(selected: Contact[], contact: Contact): Contact[] {
  const exists = selected.find((c) => c.id === contact.id);
  if (exists) return selected.filter((c) => c.id !== contact.id);
  return [...selected, contact];
}

// ---------------------------------------------------------------------------
// Check if a contact is selected
// ---------------------------------------------------------------------------
export function isMemberSelected(selected: Contact[], contact: Contact): boolean {
  return selected.some((c) => c.id === contact.id);
}

// ---------------------------------------------------------------------------
// Compute the total from a custom amount string (safe parse)
// ---------------------------------------------------------------------------
export function parseAmount(raw: string): number {
  const parsed = parseFloat(raw);
  return isNaN(parsed) ? 0 : parsed;
}
