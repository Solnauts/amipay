// contactsStore — MMKV-backed local contact cache
//
// Responsibilities:
//  • Persist contacts so the screen loads instantly (no API wait on open)
//  • Support optimistic adds with rollback on API failure
//  • Merge API contacts without losing optimistic ones still in-flight
//
// Key: 'contacts_v1'  (bump version if the shape changes)

import { createMMKV } from 'react-native-mmkv';
import { AVATARS } from '@/assets/avatars';
import { ImageSourcePropType } from 'react-native';

// ─── Storage instance ─────────────────────────────────────────────────────────

const storage = createMMKV({ id: 'contacts-store' });
const CONTACTS_KEY = 'contacts_v2';

// ─── Types ────────────────────────────────────────────────────────────────────

export type StoredContact = {
  id: string;             // String(recipient_id) from backend; 'temp_<ts>' for optimistic
  recipientUserId: number;
  name: string;           // Display / label name  (set by the user who added)
  alias: string;          // e.g. "Ridhi@amypay"
  avatar: string;         // 'local:N' for bundled avatars, or a dicebear URL as fallback
  savedAt: number;        // Unix ms — used to sort newest-first
  isFavorite?: boolean;   // Local-only flag for homescreen pinning
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns a local avatar reference ("local:N") if avatars are available,
 * otherwise falls back to DiceBear glass API.
 */
function avatarRef(seed: string): string {
  if (AVATARS.length > 0) {
    // Deterministic hash to pick from local list
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    return `local:${hash % AVATARS.length}`;
  }
  // Fallback: DiceBear glass style
  return `https://api.dicebear.com/7.x/glass/png?seed=${encodeURIComponent(seed)}&size=128`;
}

/**
 * Resolves an avatar string to an ImageSource.
 * - "local:N"  → returns the Nth bundled avatar (require(...))
 * - URL string → returns { uri: string }
 */
export function getAvatarSource(avatar: string): ImageSourcePropType {
  if (avatar.startsWith('local:')) {
    const idx = parseInt(avatar.split(':')[1], 10);
    if (idx >= 0 && idx < AVATARS.length) {
      return AVATARS[idx];
    }
  }
  return { uri: avatar };
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const contactsStore = {
  // ── Read all ──────────────────────────────────────────────────────────────
  getAll(): StoredContact[] {
    const raw = storage.getString(CONTACTS_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as StoredContact[];
    } catch {
      return [];
    }
  },

  // ── Overwrite all ─────────────────────────────────────────────────────────
  setAll(contacts: StoredContact[]): void {
    storage.set(CONTACTS_KEY, JSON.stringify(contacts));
  },

  // ── Optimistic add ────────────────────────────────────────────────────────
  // Saves immediately and returns the stored contact.
  // Use the returned contact's `id` to rollback if the API call fails.
  add(contact: Omit<StoredContact, 'avatar' | 'savedAt'>): StoredContact {
    const full: StoredContact = {
      ...contact,
      avatar: avatarRef(contact.alias),
      savedAt: Date.now(),
    };
    const current = this.getAll();
    // Deduplicate by id
    const without = current.filter((c) => c.id !== full.id);
    this.setAll([...without, full]);
    return full;
  },

  // ── Rollback a single contact ─────────────────────────────────────────────
  // Called when the API call for an optimistic add fails.
  rollback(id: string): void {
    const current = this.getAll();
    this.setAll(current.filter((c) => c.id !== id));
  },

  // ── Merge from API ────────────────────────────────────────────────────────
  // Replaces known contacts with API data and keeps any local-only contacts
  // (optimistic adds still awaiting API response) that aren't in the API list.
  mergeFromApi(apiContacts: StoredContact[]): void {
    const local = this.getAll();
    const merged: StoredContact[] = [...apiContacts];

    for (const lc of local) {
      // Keep local contact only if the API didn't return it (temp optimistic)
      if (!merged.some((ac) => ac.id === lc.id)) {
        merged.push(lc);
      }
    }
    this.setAll(merged);
  },

  // ── Toggle favorite (local only) ───────────────────────────────────────────
  toggleFavorite(id: string): void {
    const current = this.getAll();
    this.setAll(current.map((c) => (c.id === id ? { ...c, isFavorite: !c.isFavorite } : c)));
  },
};
