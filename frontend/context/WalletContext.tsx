import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from 'react';
import { Alert } from 'react-native';
import {
  transact,
  Web3MobileWallet,
} from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { toPublicKey } from '@/utils/getPublicKey';
import { authService } from '@/src/services/api/AuthService';
import { BackendUser } from '@/src/types/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuthStep =
  | 'idle'         // Not connected
  | 'connecting'   // MWA handshake in progress
  | 'logging_in'   // Hitting /wallet/login
  | 'onboarding'   // New user → needs alias + PIN
  | 'ready';       // Fully authenticated

type WalletContextState = {
  publicKey: PublicKey | null;
  walletAddress: string | null;   // base58 — useful everywhere
  user: BackendUser | null;        // backend user profile
  authStep: AuthStep;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  setUser: (u: BackendUser) => void;
  completeOnboarding: () => void;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const WalletContext = createContext<WalletContextState>({
  publicKey: null,
  walletAddress: null,
  user: null,
  authStep: 'idle',
  isConnected: false,
  connect: async () => {},
  disconnect: () => {},
  setUser: () => {},
  completeOnboarding: () => {},
});

// ─── App Identity (shown inside the wallet popup) ─────────────────────────────

const APP_IDENTITY = {
  name: 'Remitly',
  uri: 'https://mysolanaapp.com',
  icon: 'favicon.png',
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [user, setUser] = useState<BackendUser | null>(null);
  const [authStep, setAuthStep] = useState<AuthStep>('idle');

  // ── Full connect + backend login flow ────────────────────────────────────
  const connect = useCallback(async () => {
    if (authStep === 'connecting' || authStep === 'logging_in') return;
    setAuthStep('connecting');

    try {
      // ── 1. MWA: Authorize + sign the nonce in a single session ────────────
      await transact(async (wallet: Web3MobileWallet) => {

        // 1a. Authorize wallet
        const authResult = await wallet.authorize({
          cluster: 'devnet',
          identity: APP_IDENTITY,
        });

        // MWA gives us the address as base64 bytes (Base64EncodedAddress)
        const addressBytes = authResult.accounts[0].address;
        const pk = toPublicKey(addressBytes as string | Uint8Array);
        const addressBase58 = pk.toBase58();

        console.log('[Auth] Wallet authorized:', addressBase58);
        setAuthStep('logging_in');

        // 1b. Fetch nonce from backend
        const { message: nonceMessage, nonce } = await authService.getNonce();
        console.log('[Auth] Got nonce:', nonce);

        // 1c. Sign the nonce message with the wallet
        // signMessages requires Base64EncodedAddress[] — pass the raw MWA address
        const encodedMessage = new TextEncoder().encode(nonceMessage);
        const signResult = await wallet.signMessages({
          addresses: [addressBytes as string],  // MWA Base64EncodedAddress
          payloads: [encodedMessage],
        });

        // signResult[0] is Uint8Array — encode to base58 for backend
        const signatureBase58 = bs58.encode(signResult[0]);

        // 1d. POST /wallet/login
        const loginResponse = await authService.login({
          address: addressBase58,
          signature: signatureBase58,
          nonce,
        });

        console.log('[Auth] Login response:', JSON.stringify(loginResponse));

        // Store the JWT so all future API calls send Authorization: Bearer <token>
        authService.setToken(loginResponse.token);

        // ── 2. Store state ────────────────────────────────────────────────────
        setPublicKey(pk);
        setWalletAddress(addressBase58);
        setUser(loginResponse.user);

        if (loginResponse.is_new_user || !loginResponse.user.has_pin) {
          // New user OR existing user who never completed setup → onboarding
          setAuthStep('onboarding');
        } else {
          setAuthStep('ready');
        }
      });
    } catch (error: any) {
      console.error('[Auth] error:', error);
      setAuthStep('idle');

      const msg = String(error?.message ?? error);
      if (
        msg.includes('User cancelled') ||
        msg.includes('User declined') ||
        msg.includes('declined')
      ) {
        // Silent — user chose not to connect
      } else if (msg.includes('No wallet') || msg.includes('no wallet')) {
        Alert.alert(
          'No Wallet Found',
          'Please install Phantom or Solflare from the Play Store.',
        );
      } else if (msg === 'SESSION_EXPIRED') {
        Alert.alert('Session Expired', 'Please reconnect your wallet.');
      } else {
        Alert.alert('Login Failed', msg);
      }
    }
  }, [authStep]);

  // ── Disconnect ────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    setPublicKey(null);
    setWalletAddress(null);
    setUser(null);
    setAuthStep('idle');
    authService.clearToken();
  }, []);

  // ── Called by OnboardingScreen once alias + PIN are saved ─────────────────
  const completeOnboarding = useCallback(() => {
    setAuthStep('ready');
  }, []);

  return (
    <WalletContext.Provider
      value={{
        publicKey,
        walletAddress,
        user,
        authStep,
        isConnected: authStep === 'ready' || authStep === 'onboarding',
        connect,
        disconnect,
        setUser,
        completeOnboarding,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWallet() {
  return useContext(WalletContext);
}
