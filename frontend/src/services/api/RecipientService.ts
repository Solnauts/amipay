import { AddRecipientRequest, RecipientRecord } from '../../types/api';
import BaseService from './BaseService';
import { API_BASE_URL } from '../../config/api';

// ─────────────────────────────────────────────────────────────────────────────
// RecipientService — Singleton
// ─────────────────────────────────────────────────────────────────────────────

class RecipientService extends BaseService {
  private static instance: RecipientService;

  private constructor() {
    super(API_BASE_URL);
  }

  public static getInstance(): RecipientService {
    if (!RecipientService.instance) {
      RecipientService.instance = new RecipientService();
    }
    return RecipientService.instance;
  }

  // ── Get All ────────────────────────────────────────────────────────────────
  // GET /api/recipients
  async getAll(): Promise<RecipientRecord[]> {
    try {
      const response = await this.client.get<RecipientRecord[]>('/api/recipients');
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // ── Create ─────────────────────────────────────────────────────────────────
  // POST /api/recipients
  async create(data: AddRecipientRequest): Promise<RecipientRecord> {
    try {
      const response = await this.client.post<RecipientRecord>(
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
    data: Partial<AddRecipientRequest>,
  ): Promise<RecipientRecord> {
    try {
      const response = await this.client.put<RecipientRecord>(
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
