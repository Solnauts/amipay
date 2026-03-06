/**
 * DepositModal
 *
 * Transfers tokens of mint USDCoctVLVnvTXBEuP9s8hntucdJokbo17RwHuNXemT
 * from the connected wallet → platform address from POST /wallet/address.
 *
 * Token has 6 decimals (confirmed). Zero extra installs — uses only:
 *   • @solana-mobile/mobile-wallet-adapter-protocol-web3js
 *   • @solana/web3.js@1.89.1
 *   • authService (already in project)
 *
 * Key fix: uses getParsedTokenAccountsByOwner to find the REAL token account
 * instead of deriving an ATA (which may not match if account was created manually).
 */

import React, { useCallback } from 'react';
import { Alert } from 'react-native';
import {
  transact,
  Web3MobileWallet,
} from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { TransactionModal } from '@/components/home/TransactionModal';
import { useWallet } from '@/context/WalletContext';
import { authService } from '@/src/services/api/AuthService';
import { transactionService } from '@/src/services/api/TransactionService';

// ─── Constants ────────────────────────────────────────────────────────────────

const TOKEN_MINT     = new PublicKey('USDCoctVLVnvTXBEuP9s8hntucdJokbo17RwHuNXemT');
const TOKEN_DECIMALS = 6;

const TOKEN_PROGRAM_ID            = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1bea');

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

const APP_IDENTITY = {
  name: 'AmyPay',
  uri: 'https://mysolanaapp.com',
  icon: 'favicon.png',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Find the real token account address for an owner + mint by querying the chain.
 * This works even if the account was NOT created via the ATA program.
 * Returns null if the owner has no account for that mint.
 */
async function findTokenAccount(
  owner: PublicKey,
  mint:  PublicKey,
): Promise<PublicKey | null> {
  const res = await connection.getParsedTokenAccountsByOwner(owner, { mint });
  if (res.value.length === 0) return null;
  // Pick the account with the largest balance if there are multiple
  const sorted = res.value.sort((a, b) => {
    const balA = Number(a.account.data.parsed.info.tokenAmount.amount);
    const balB = Number(b.account.data.parsed.info.tokenAmount.amount);
    return balB - balA;
  });
  return sorted[0].pubkey;
}

/**
 * Derive the standard ATA address (used as destination for the platform).
 * Falls back to this if the platform doesn't have a manually-created account.
 */
function deriveATA(owner: PublicKey, mint: PublicKey): PublicKey {
  const [ata] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  return ata;
}

/**
 * Build raw SPL Token Transfer instruction (opcode 3).
 * Data: [u8 opcode=3][u64 little-endian amount]
 */
function buildTransferInstruction(
  sourceATA: PublicKey,
  destATA:   PublicKey,
  owner:     PublicKey,
  rawAmount: bigint,
): TransactionInstruction {
  const data = Buffer.alloc(9);
  data.writeUInt8(3, 0);
  data.writeUInt32LE(Number(rawAmount & BigInt(0xffffffff)), 1);
  data.writeUInt32LE(Number(rawAmount >> BigInt(32)), 5);

  return new TransactionInstruction({
    programId: TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: sourceATA, isSigner: false, isWritable: true  },
      { pubkey: destATA,   isSigner: false, isWritable: true  },
      { pubkey: owner,     isSigner: true,  isWritable: false },
    ],
    data,
  });
}

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

      try {
        // ── 1. Fetch platform ATA from backend ──────────────────────────────
        const platformATAStr = await authService.getWalletAddress();
        const receiverTokenAccount = new PublicKey(platformATAStr);

        console.log('─────────────────────────────────────');
        console.log('[Deposit] User pubKey:            ', publicKey.toBase58());
        console.log('[Deposit] Platform ATA (from API):', platformATAStr);
        console.log('─────────────────────────────────────');

        // ── 2. Find sender's real token account on-chain ─────────────────
        const senderTokenAccount = await findTokenAccount(publicKey, TOKEN_MINT);
        console.log('[Deposit] Sender acct:', senderTokenAccount?.toBase58() ?? 'NOT FOUND');

        if (!senderTokenAccount) {
          Alert.alert(
            'No Token Account',
            `Your wallet has no account for this token.\n\nWallet: ${publicKey.toBase58().slice(0, 16)}…`,
          );
          return;
        }

        // ── 3. Receiver ATA comes from API ─────────────────────────────
        console.log('[Deposit] Receiver acct:', receiverTokenAccount.toBase58());
        console.log('[Deposit] Sender → Receiver same?', senderTokenAccount.toBase58() === receiverTokenAccount.toBase58());
        console.log('─────────────────────────────────────');

        // ── 4. Convert amount → raw units (6 decimals) ───────────────────
        const rawAmount = BigInt(Math.round(numericAmount * 10 ** TOKEN_DECIMALS));
        console.log('[Deposit] Amount:', numericAmount, '→ raw:', rawAmount.toString());

        // ── 5. Open MWA, sign, broadcast, confirm ─────────────────────────
        await transact(async (wallet: Web3MobileWallet) => {

          console.log('[Deposit] Step 5a: authorizing wallet...');
          await wallet.authorize({
            cluster: 'devnet',
            identity: APP_IDENTITY,
          });
          console.log('[Deposit] Step 5a: ✅ authorized');

          console.log('[Deposit] Step 5b: fetching blockhash...');
          const { blockhash, lastValidBlockHeight } =
            await connection.getLatestBlockhash();
          console.log('[Deposit] Step 5b: ✅ blockhash:', blockhash);

          console.log('[Deposit] Step 5c: building transaction...');
          const tx = new Transaction({
            recentBlockhash: blockhash,
            feePayer: publicKey,
          }).add(
            buildTransferInstruction(
              senderTokenAccount,
              receiverTokenAccount!,
              publicKey,
              rawAmount,
            ),
          );
          console.log('[Deposit] Step 5c: ✅ tx built');

          console.log('[Deposit] Step 5d: signing transaction...');
          const [signedTx] = await wallet.signTransactions({ transactions: [tx] });
          console.log('[Deposit] Step 5d: ✅ signed');

          console.log('[Deposit] Step 5e: broadcasting...');
          const sig = await connection.sendRawTransaction(
            signedTx.serialize(),
            { skipPreflight: false, preflightCommitment: 'confirmed' },
          );
          console.log('[Deposit] Step 5e: ✅ broadcast sig:', sig);

          console.log('[Deposit] Step 5f: confirming...');
          await connection.confirmTransaction(
            { signature: sig, blockhash, lastValidBlockHeight },
            'confirmed',
          );
          console.log('[Deposit] Step 5f: ✅ confirmed!');

          // ── 6. Record deposit in backend database ─────────────────────────
          console.log('[Deposit] Step 6: recording deposit in backend...');
          try {
            const record = await transactionService.recordDeposit({
              deposit_amount: numericAmount,
              from_account:   senderTokenAccount.toBase58(),
              to_account:     receiverTokenAccount.toBase58(),
            });
            console.log('[Deposit] Step 6: ✅ recorded:', record?.status, record?.message);
          } catch (apiErr: any) {
            // Don't block success — tx is already confirmed on-chain
            console.warn('[Deposit] Step 6: ⚠️ backend record failed:', apiErr?.message);
          }

          Alert.alert(
            '🎉 Deposit Confirmed!',
            [
              `Amount:  ${numericAmount.toLocaleString()} tokens`,
              `Status:  ✅ Confirmed on Solana devnet`,
              ``,
              `Tx ID:   ${sig.slice(0, 8)}…${sig.slice(-8)}`,
              ``,
              `Your balance will update shortly.`,
              `Balance update in the Database`
            ].join('\n'),
            [
              {
                text: 'View on Explorer',
                onPress: () => {
                  const { Linking } = require('react-native');
                  Linking.openURL(
                    `https://explorer.solana.com/tx/${sig}?cluster=devnet`,
                  );
                },
              },
              {
                text: 'Done  ✓',
                style: 'default',
                onPress: onClose,
              },
            ],
            { cancelable: false },
          );
        });

      } catch (err: any) {
        // Log everything so we can see the exact failure in console
        console.log('[Deposit] ❌ ─── DEPOSIT FAILED ───');
        console.log('[Deposit] Error type    :', typeof err);
        console.log('[Deposit] Error message :', err?.message ?? '(no message)');
        console.log('[Deposit] Error name    :', err?.name ?? '(no name)');
        console.log('[Deposit] Error code    :', err?.code ?? '(no code)');
        console.log('[Deposit] Error logs    :', JSON.stringify(err?.logs ?? []));
        console.log('[Deposit] Full error    :', JSON.stringify(err, Object.getOwnPropertyNames(err)));
        console.log('[Deposit] ❌ ─────────────────────');
        Alert.alert(
          'Deposit Failed',
          `${err?.message ?? 'An unexpected error occurred.'}

(See console for full details)`,
        );
      }
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
