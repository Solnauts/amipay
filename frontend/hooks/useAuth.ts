import { useState, useCallback } from 'react';
import { authService } from '../src/services';
import type { LoginRequest, RegisterRequest, UserProfile } from '../src/types/api';

// ─────────────────────────────────────────────────────────────────────────────
// useAuth — wraps AuthService, manages React state
// Components import this hook, never the service directly
// ─────────────────────────────────────────────────────────────────────────────

interface UseAuthReturn {
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ── Login ────────────────────────────────────────────────────────────────
  const login = useCallback(async (data: LoginRequest): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.login(data);
      setUser(response.user);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Register ─────────────────────────────────────────────────────────────
  const register = useCallback(async (data: RegisterRequest): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const profile = await authService.register(data);
      setUser(profile);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.logout();
      setUser(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { user, isLoading, error, login, register, logout };
};
