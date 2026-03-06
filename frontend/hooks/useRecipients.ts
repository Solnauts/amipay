import { useState, useEffect, useCallback } from 'react';
import { recipientService } from '../src/services';
import type { CreateRecipientRequest, Recipient } from '../src/types/api';

// ─────────────────────────────────────────────────────────────────────────────
// useRecipients — manages recipient list state
// Auto-fetches on mount; exposes create and delete
// ─────────────────────────────────────────────────────────────────────────────

interface UseRecipientsReturn {
  recipients: Recipient[];
  isLoading: boolean;
  error: string | null;
  createRecipient: (data: CreateRecipientRequest) => Promise<void>;
  deleteRecipient: (id: number) => Promise<void>;
}

export const useRecipients = (): UseRecipientsReturn => {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch All ──────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await recipientService.getAll();
      setRecipients(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch recipients';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Create ─────────────────────────────────────────────────────────────────
  const createRecipient = useCallback(
    async (data: CreateRecipientRequest): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        const newRecipient = await recipientService.create(data);
        // Optimistically append — no refetch needed
        setRecipients((prev) => [...prev, newRecipient]);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create recipient';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // ── Delete ─────────────────────────────────────────────────────────────────
  const deleteRecipient = useCallback(async (id: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await recipientService.remove(id);
      // Optimistically remove from local state — no refetch needed
      setRecipients((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete recipient';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  return { recipients, isLoading, error, createRecipient, deleteRecipient };
};
