import React, { createContext, useCallback, useContext, useState } from 'react';
import { Alert } from 'react-native';
import {
  transact,
  Web3MobileWallet,
} from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { PublicKey } from '@solana/web3.js';

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
        const pk = new PublicKey(authResult.accounts[0].address);
        setPublicKey(pk);
      });
    } catch (error: any) {
      if (error?.message?.includes('User declined')) {
        Alert.alert('Wallet connection cancelled', 'You rejected the connection request.');
      } else if (error?.message?.includes('No wallet found')) {
        Alert.alert(
          'No Wallet Found',
          'Please install Phantom or another Solana wallet from the Play Store.',
        );
      } else {
        Alert.alert('Connection Error', String(error?.message ?? error));
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
