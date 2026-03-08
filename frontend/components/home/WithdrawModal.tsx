/**
 * WithdrawModal
 *
 * Calls POST /claimamount (Manual-Claim) to withdraw USDC from the user's
 * ledger balance back to their on-chain USDC token account (ATA).
 *
 * API contract (from API_README §3.1):
 *   POST /claimamount
 *   {
 *     amount:           number   ← USDC smallest unit (6 dec): 10 USDC = 10_000_000
 *     method:           "Manual-Claim"
 *     recipient_pubkey: string   ← user's USDC ATA address (base58), NOT the wallet key
 *     recipient_id:     number   ← user's DB id
 *   }
 *
 * The Solana contract (claim_transfer.rs) transfers:
 *   main_usdc_vault → user_usdc_ata
 * so recipient_pubkey must be the USDC Associated Token Account, not the wallet address.
 * We look it up on-chain (same approach as DepositModal) using getParsedTokenAccountsByOwner.
 */

import React, { useCallback } from 'react';
import { Alert } from 'react-native';
import { Connection, PublicKey } from '@solana/web3.js';
import { TransactionModal } from '@/components/home/TransactionModal';
import { useWallet } from '@/context/WalletContext';
import { transactionService } from '@/src/services/api/TransactionService';

// ─── Constants (same mint/network as DepositModal) ───────────────────────────
const TOKEN_MINT = new PublicKey('USDCoctVLVnvTXBEuP9s8hntucdJokbo17RwHuNXemT');
const USDC_DECIMALS = 1_000_000; // 6 decimal places
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Find the user's real USDC token account (ATA) on-chain.
 * Same logic as DepositModal — queries chain instead of deriving,
 * because the account may not be the standard derived ATA.
 * Returns null if the wallet has no USDC account at all.
 */
async function findUserUsdcAta(owner: PublicKey): Promise<PublicKey | null> {
  const res = await connection.getParsedTokenAccountsByOwner(owner, { mint: TOKEN_MINT });
  if (res.value.length === 0) return null;
  // Pick the one with the largest balance if multiple exist
  const sorted = res.value.sort((a, b) => {
    const balA = Number(a.account.data.parsed.info.tokenAmount.amount);
    const balB = Number(b.account.data.parsed.info.tokenAmount.amount);
    return balB - balA;
  });
  return sorted[0].pubkey;
}

// ─── Props ────────────────────────────────────────────────────────────────────
type Props = {
  visible: boolean;
  onClose: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────
export function WithdrawModal({ visible, onClose }: Props) {
  const { user, publicKey } = useWallet();

  const handleConfirm = useCallback(
    async (numericAmount: number) => {
      if (!user?.id) {
        Alert.alert('Not authenticated', 'Please connect your wallet first.');
        return;
      }

      if (!publicKey) {
        Alert.alert('Wallet not connected', 'No wallet public key found. Please reconnect.');
        return;
      }

      if (numericAmount <= 0) {
        Alert.alert('Invalid amount', 'Please enter a valid amount to withdraw.');
        return;
      }

      try {
        // ── 1. Find user's USDC ATA on-chain ─────────────────────────────────
        console.log('[Withdraw] Looking up USDC ATA for wallet:', publicKey.toBase58());
        const userUsdcAta = await findUserUsdcAta(publicKey);

        if (!userUsdcAta) {
          Alert.alert(
            'No USDC Token Account',
            [
              'Your wallet does not have a USDC token account on devnet.',
              '',
              'You need to create a USDC token account first.',
              `Mint: ${TOKEN_MINT.toBase58().slice(0, 20)}…`,
            ].join('\n'),
          );
          return;
        }

        console.log('[Withdraw] User USDC ATA:', userUsdcAta.toBase58());

        // ── 2. Convert to smallest unit ───────────────────────────────────────
        const amountInSmallestUnit = Math.floor(numericAmount * USDC_DECIMALS);
        console.log('[Withdraw] Manual-Claim:', numericAmount, 'USDC =', amountInSmallestUnit, 'units');
        console.log('[Withdraw] recipient_pubkey (USDC ATA):', userUsdcAta.toBase58());
        console.log('[Withdraw] recipient_id (user.id):', user.id);

        // ── 3. POST /claimamount ───────────────────────────────────────────────
        const result = await transactionService.claimAmount({
          amount: amountInSmallestUnit,
          method: 'Manual-Claim',
          destination_usdc_ata: userUsdcAta.toBase58(),  // USDC ATA — matches Rust struct field
          recipient_id: user.id,
        });

        console.log('[Withdraw] Result:', JSON.stringify(result, null, 2));

        if (result.status === 'success') {
          const newBal = result.new_balance != null
            ? (result.new_balance / USDC_DECIMALS).toFixed(2)
            : '—';
          Alert.alert(
            '✅ Withdraw Successful',
            [
              `Amount:       ${numericAmount.toFixed(2)} USDC`,
              `New balance:  ${newBal} USDC`,
              result.tx_signature
                ? `Tx: ${result.tx_signature.slice(0, 12)}…`
                : '',
            ].filter(Boolean).join('\n'),
            [{ text: 'Done', onPress: onClose }],
          );
        } else {
          Alert.alert('Withdraw Failed', result.message ?? 'Something went wrong.');
        }
      } catch (err: any) {
        console.error('[Withdraw] Error:', err?.message);

        // "Network Error" with no HTTP status = the connection dropped AFTER
        // the backend received and processed the request (Solana TX confirmation
        // can take 10-30s and ngrok may drop the conn before the response arrives).
        // The withdraw likely SUCCEEDED on-chain — show a soft warning, not a failure.
        const isNetworkError = !err?.response && err?.message === 'Network Error';

        if (isNetworkError) {
          Alert.alert(
            '⚠️ Connection Dropped',
            [
              'Your withdraw was submitted to the server.',
              '',
              'The network dropped before we received confirmation,',
              'but the transaction likely went through.',
              '',
              'Please check your balance in a few seconds.',
            ].join('\n'),
            [{ text: 'OK', onPress: onClose }],
          );
        } else {
          Alert.alert('Withdraw Failed', err?.message ?? 'Network error. Please try again.');
        }
      }
    },
    [user, publicKey, onClose],
  );

  return (
    <TransactionModal
      mode="withdraw"
      visible={visible}
      onClose={onClose}
      onConfirm={handleConfirm}
    />
  );
}
