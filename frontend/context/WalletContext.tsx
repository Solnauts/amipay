import React, { createContext, useCallback, useContext, useState } from 'react';
import { Alert } from 'react-native';
import {
  transact,
  Web3MobileWallet,
} from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { PublicKey } from '@solana/web3.js';
import { toPublicKey } from '@/utils/getPublicKey';

// ─── Types ───────────────────────────────────────────────────────────────────

type WalletContextState = {
  publicKey: PublicKey | null;
  isConnected: boolean;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
};

// ─── Context ─────────────────────────────────────────────────────────────────

const WalletContext = createContext<WalletContextState>({
  publicKey: null,
  isConnected: false,
  connecting: false,
  connect: async () => {},
  disconnect: () => {},
});

// ─── App Identity (shown in the wallet popup) ────────────────────────────────

const APP_IDENTITY = {
  name: 'Remitly',
  uri: 'https://mysolanaapp.com',
  icon: 'favicon.png',
};


// ─── Provider ────────────────────────────────────────────────────────────────

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [connecting, setConnecting] = useState(false);

  const connect = useCallback(async () => {
    if (connecting) return;
    setConnecting(true);
    try {
      await transact(async (wallet: Web3MobileWallet) => {
        const authResult = await wallet.authorize({
          cluster: 'devnet',
          identity: APP_IDENTITY,
        });

        console.log('[WalletConnect] authResult:', JSON.stringify(authResult));

        const address = authResult.accounts[0].address;
        console.log('[WalletConnect] address:', address, typeof address);

        const pk = toPublicKey(address as string | Uint8Array);
        console.log('[WalletConnect] publicKey:', pk.toBase58());

        setPublicKey(pk);
      });
    } catch (error: any) {
      console.error('[WalletConnect] error:', error);
      const msg = String(error?.message ?? error);
      if (msg.includes('User cancelled') || msg.includes('User declined') || msg.includes('declined')) {
        // Silent — user chose not to connect
      } else if (msg.includes('No wallet')) {
        Alert.alert(
          'No Wallet Found',
          'Please install Phantom or Solflare from the Play Store.',
        );
      } else {
        Alert.alert('Connection Error', msg);
      }
    } finally {
      setConnecting(false);
    }
  }, [connecting]);

  const disconnect = useCallback(() => {
    setPublicKey(null);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        publicKey,
        isConnected: publicKey !== null,
        connecting,
        connect,
        disconnect,
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
