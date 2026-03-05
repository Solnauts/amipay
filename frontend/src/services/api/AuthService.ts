import BaseService from './BaseService';
import {
  NonceResponse,
  WalletLoginRequest,
  WalletLoginResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
  UniqueAliasResponse,
  CreateAliasRequest,
  CreateAliasResponse,
  GetUserAliasResponse,
  WalletAddressResponse,
  AddRecipientRequest,
  AddRecipientResponse,
} from '../../types/api';

// ─────────────────────────────────────────────────────────────────────────────
// AuthService — Singleton
// Handles all wallet-based authentication and profile management.
//
// Flow:
//  1. getNonce()             → GET  /wallet/nonce
//  2. login()                → POST /wallet/login   (sets session_token cookie)
//  3. [new user] getAliasSuggestions() → GET  /wallet/unique-alias
//  4. [new user] createAlias()         → POST /wallet/create-alias
//  5. [new user] updateProfile()       → POST /wallet/update-profile
// ─────────────────────────────────────────────────────────────────────────────

class AuthService extends BaseService {
  private static instance: AuthService;

  private constructor() {
    // 10.0.2.2 = Android emulator alias for host machine localhost
    // For a physical device on same WiFi, use your Mac's local IP (e.g. 192.168.x.x)
    super(process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:4000');
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // ── Store JWT returned from /wallet/login ─────────────────────────────────
  // Call this immediately after a successful login so all subsequent
  // protected requests carry `Authorization: Bearer <token>`.
  setToken(token: string): void {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  clearToken(): void {
    delete this.client.defaults.headers.common['Authorization'];
  }

  // ── Step 1: Fetch a one-time nonce to sign ────────────────────────────────
  async getNonce(): Promise<NonceResponse> {
    try {
      const res = await this.client.get<NonceResponse>('/wallet/nonce');
      return res.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // ── Step 2: Submit signed nonce → receive session_token cookie ────────────
  async login(payload: WalletLoginRequest): Promise<WalletLoginResponse> {
    try {
      const res = await this.client.post<WalletLoginResponse>(
        '/wallet/login',
        payload,
      );
      return res.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // ── Step 3 (new users): Get alias suggestions ────────────────────────────
  async getAliasSuggestions(): Promise<string[]> {
    try {
      const res = await this.client.get<UniqueAliasResponse>(
        '/wallet/unique-alias',
      );
      return res.data.alias;
    } catch (error) {
      this.handleError(error);
    }
  }

  // ── Step 4 (new users): Save the chosen alias ─────────────────────────────
  async createAlias(alias: string): Promise<CreateAliasResponse> {
    try {
      const payload: CreateAliasRequest = { alias };
      const res = await this.client.post<CreateAliasResponse>(
        '/wallet/create-alias',
        payload,
      );
      return res.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // ── Step 5 (new users): Set display name & PIN ────────────────────────────
  async updateProfile(
    data: UpdateProfileRequest,
  ): Promise<UpdateProfileResponse> {
    try {
      const res = await this.client.post<UpdateProfileResponse>(
        '/wallet/update-profile',
        data,
      );
      return res.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // ── Get all aliases for the logged-in user ───────────────────────────────
  async getUserAliases(): Promise<GetUserAliasResponse> {
    try {
      const res = await this.client.post<GetUserAliasResponse>(
        '/wallet/get_user_alias',
      );
      return res.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // ── Get wallet address of logged-in user ─────────────────────────────────
  async getWalletAddress(): Promise<string> {
    try {
      const res = await this.client.post<WalletAddressResponse>(
        '/wallet/address',
        { user_id: null },
      );
      return res.data.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // ── Add a recipient by alias ──────────────────────────────────────────────
  async addRecipient(
    recipientAlias: string,
  ): Promise<AddRecipientResponse> {
    try {
      const payload: AddRecipientRequest = { recipient_alias: recipientAlias };
      const res = await this.client.post<AddRecipientResponse>(
        '/wallet/add-recipient',
        payload,
      );
      return res.data;
    } catch (error) {
      this.handleError(error);
    }
  }
}

export const authService = AuthService.getInstance();
