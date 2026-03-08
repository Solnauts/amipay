// useContacts — contacts with optimistic adds, MMKV local cache, and API sync
//
// Flow on mount:
//   1. Read MMKV → show contacts immediately (zero loading flicker)
//   2. Fetch /wallet/get_user_recipients → merge into MMKV → update state
//
// Flow on addContact(name, alias):
//   1. Save to MMKV with a temp id → update state immediately
//   2. POST /wallet/add-recipient in background
//       ↓ success → replace temp entry with real one from API
//       ↓ failure → rollback MMKV + re-throw so modal can show the error

import { useCallback, useEffect, useState } from 'react';
import { getAvatarIndexForSeed } from '@/assets/avatars';
import { contactsStore, StoredContact } from '@/src/store/contactsStore';
import { authService } from '@/src/services/api/AuthService';

export function useContacts() {
  const [contacts, setContacts] = useState<StoredContact[]>(() =>
    contactsStore.getAll(),
  );
  const [syncing, setSyncing] = useState(false);

  // ── Sync from API ─────────────────────────────────────────────────────────
  const syncFromApi = useCallback(async () => {
    setSyncing(true);
    try {
      const resp = await authService.getUserRecipients();
      console.log('[Contacts] Raw API response:', JSON.stringify(resp, null, 2));

      // Handle both shapes:
      //   { status, recipients: [...] }  ← expected
      //   [...] directly                 ← some backends return raw array
      const rawList = Array.isArray(resp)
        ? (resp as any[])
        : Array.isArray((resp as any).recipients)
          ? (resp as any).recipients
          : Array.isArray((resp as any).data)
            ? (resp as any).data
            : [];

      console.log('[Contacts] Parsed recipients list:', JSON.stringify(rawList, null, 2));

      const apiContacts: StoredContact[] = rawList.map((r: any) => ({
        id: String(r.id),
        recipientUserId: r.recipient_user_id ?? 0,
        // recipient_name is the display name; alias_used is the @handle
        name: r.recipient_name ?? r.name ?? r.alias_used ?? 'Unknown',
        alias: r.alias_used ?? r.alias ?? '',
        avatar: `local:${getAvatarIndexForSeed(r.alias_used ?? r.alias ?? String(r.id))}`,
        savedAt: 0,
      }));
      console.log('[Contacts] Mapped contacts:', JSON.stringify(apiContacts, null, 2));

      // Clear stale MMKV entries that have no name (from old/broken cached data)
      const existing = contactsStore.getAll();
      const cleaned = existing.filter((c) => !!c.name && c.name !== 'Unknown');
      if (cleaned.length !== existing.length) {
        console.log('[Contacts] Cleared', existing.length - cleaned.length, 'stale MMKV entries');
        contactsStore.setAll(cleaned);
      }

      contactsStore.mergeFromApi(apiContacts);
      const final = contactsStore.getAll();
      console.log('[Contacts] Final contacts after merge:', JSON.stringify(final, null, 2));
      setContacts(final);
    } catch (err) {
      console.warn('[Contacts] API sync failed, using local cache:', err);
    } finally {
      setSyncing(false);
    }
  }, []);

  // Sync on mount
  useEffect(() => {
    syncFromApi();
  }, [syncFromApi]);

  // ── Optimistic add ────────────────────────────────────────────────────────
  const addContact = useCallback(async (name: string, alias: string): Promise<void> => {
    console.log('[Contacts] addContact called — name:', name, 'alias:', alias);

    // 1. Save immediately with a temp id so the user sees it right away
    const tempId = `temp_${Date.now()}`;
    contactsStore.add({ id: tempId, recipientUserId: 0, name, alias });
    setContacts(contactsStore.getAll());
    console.log('[Contacts] Optimistic save done, tempId:', tempId);

    try {
      // 2. Call API in background
      const result = await authService.addRecipient(alias, name);
      console.log('[Contacts] addRecipient API result:', JSON.stringify(result, null, 2));

      // 3. Replace temp entry with the real backend record
      contactsStore.rollback(tempId);
      contactsStore.add({
        id: String(result.recipient_id),
        recipientUserId: result.recipient_user_id,
        name: result.recipient_name,
        alias: result.alias_used,
      });
      console.log('[Contacts] Replaced temp with real contact id:', result.recipient_id);
      setContacts(contactsStore.getAll());
    } catch (err) {
      // 4. API failed → rollback the optimistic entry
      console.error('[Contacts] addRecipient API failed, rolling back:', err);
      contactsStore.rollback(tempId);
      setContacts(contactsStore.getAll());
      throw err; // re-throw so the modal can show the error message
    }
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    contactsStore.toggleFavorite(id);
    setContacts(contactsStore.getAll());
  }, []);

  return {
    contacts,
    syncing,
    addContact,
    toggleFavorite,
    refresh: syncFromApi,
  };
}
