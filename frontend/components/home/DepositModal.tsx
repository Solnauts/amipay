/**
 * DepositModal
 *
 * Thin wrapper around the shared TransactionModal component.
 * Handles the Solana deposit transaction logic and delegates all UI to
 * TransactionModal with mode="deposit".
 */

import React, { useCallback } from 'react';
import { Alert } from 'react-native';
import {
  transact,
  Web3MobileWallet,
} from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import {
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Connection,
} from '@solana/web3.js';
import { TransactionModal } from '@/components/home/TransactionModal';
import { useWallet } from '@/context/WalletContext';

// ─── Solana devnet connection ─────────────────────────────────────────────────
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// ─── App identity (shown inside the wallet popup) ────────────────────────────
const APP_IDENTITY = {
  name: 'AmyPay',
  uri: 'https://mysolanaapp.com',
  icon: 'favicon.png',
};

// ─── Props ────────────────────────────────────────────────────────────────────
type Props = {
  visible: boolean;
  onClose: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────
export function DepositModal({ visible, onClose }: Props) {
  const { publicKey } = useWallet();

  const handleConfirm = useCallback(
    async (numericAmount: number) => {
      if (!publicKey) {
        Alert.alert('Wallet not connected', 'Please connect your wallet first.');
        return;
      }

      await transact(async (wallet: Web3MobileWallet) => {
        // 1. Re-authorize the wallet
        await wallet.authorize({
          cluster: 'devnet',
          identity: APP_IDENTITY,
        });

        const fromPubkey = publicKey;

        // 2. Build a devnet demo transaction (SOL self-transfer as placeholder)
        //    In production, replace with a USDC SPL token transfer instruction.
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash();

        const tx = new Transaction({
          recentBlockhash: blockhash,
          feePayer: fromPubkey,
        }).add(
          SystemProgram.transfer({
            fromPubkey,
            toPubkey: fromPubkey, // self-transfer demo
            lamports: Math.floor(numericAmount * LAMPORTS_PER_SOL * 0.001),
          }),
        );

        // 3. Sign via MWA
        const signedTxs = await wallet.signTransactions({ transactions: [tx] });

        // 4. Send
        const sig = await connection.sendRawTransaction(
          signedTxs[0].serialize(),
          { skipPreflight: false, preflightCommitment: 'confirmed' },
        );

        // 5. Confirm
        await connection.confirmTransaction(
          { signature: sig, blockhash, lastValidBlockHeight },
          'confirmed',
        );

        console.log('[Deposit] tx confirmed:', sig);

        Alert.alert(
          '✅ Deposit Successful',
          `$${numericAmount.toFixed(2)} USDC deposited.\nTx: ${sig.slice(0, 12)}…`,
          [{ text: 'Done', onPress: onClose }],
        );
      });
    },
    [publicKey, onClose],
  );

  return (
    <TransactionModal
      mode="deposit"
      visible={visible}
      onClose={onClose}
      onConfirm={handleConfirm}
    />
  );
}
