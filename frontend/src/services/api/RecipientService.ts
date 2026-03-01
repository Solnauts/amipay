import { CreateRecipientRequest, Recipient } from '../../types/api';
import BaseService from './BaseService';

// ─────────────────────────────────────────────────────────────────────────────
// RecipientService — Singleton
// ─────────────────────────────────────────────────────────────────────────────

class RecipientService extends BaseService {
  private static instance: RecipientService;

  private constructor() {
    super(process.env.EXPO_PUBLIC_API_URL!);
  }

  public static getInstance(): RecipientService {
    if (!RecipientService.instance) {
      RecipientService.instance = new RecipientService();
    }
    return RecipientService.instance;
  }

  // ── Get All ────────────────────────────────────────────────────────────────
  // GET /api/recipients
  async getAll(): Promise<Recipient[]> {
    try {
      const response = await this.client.get<Recipient[]>('/api/recipients');
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // ── Create ─────────────────────────────────────────────────────────────────
  // POST /api/recipients
  async create(data: CreateRecipientRequest): Promise<Recipient> {
    try {
      const response = await this.client.post<Recipient>(
        '/api/recipients',
        data,
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // ── Update ─────────────────────────────────────────────────────────────────
  // PUT /api/recipients/:id
  async update(
    id: number,
    data: Partial<CreateRecipientRequest>,
  ): Promise<Recipient> {
    try {
      const response = await this.client.put<Recipient>(
        `/api/recipients/${id}`,
        data,
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // ── Remove ─────────────────────────────────────────────────────────────────
  // DELETE /api/recipients/:id
  async remove(id: number): Promise<void> {
    try {
      await this.client.delete(`/api/recipients/${id}`);
    } catch (error) {
      this.handleError(error);
    }
  }
}

export const recipientService = RecipientService.getInstance();
