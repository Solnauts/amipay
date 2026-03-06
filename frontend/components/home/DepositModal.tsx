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

// ─── Constants ────────────────────────────────────────────────────────────────

// Your project token mint + its decimals (confirmed: 6)
const TOKEN_MINT     = new PublicKey('USDCoctVLVnvTXBEuP9s8hntucdJokbo17RwHuNXemT');
const TOKEN_DECIMALS = 6;

const TOKEN_PROGRAM_ID             = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID  = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1bea');

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

const APP_IDENTITY = {
  name: 'AmyPay',
  uri: 'https://mysolanaapp.com',
  icon: 'favicon.png',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Derive Associated Token Account without @solana/spl-token */
function deriveATA(owner: PublicKey, mint: PublicKey): PublicKey {
  const [ata] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  return ata;
}

/**
 * Build a raw SPL Token Transfer instruction (opcode 3).
 * Data layout: [u8 opcode=3][u64 amount little-endian]
 */
function buildTransferInstruction(
  sourceATA: PublicKey,
  destATA:   PublicKey,
  owner:     PublicKey,
  rawAmount: bigint,
): TransactionInstruction {
  const data = Buffer.alloc(9);
  data.writeUInt8(3, 0);                                    // Transfer opcode
  data.writeUInt32LE(Number(rawAmount & BigInt(0xffffffff)), 1); // lo 32 bits
  data.writeUInt32LE(Number(rawAmount >> BigInt(32)), 5);   // hi 32 bits

  return new TransactionInstruction({
    programId: TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: sourceATA, isSigner: false, isWritable: true  }, // source
      { pubkey: destATA,   isSigner: false, isWritable: true  }, // destination
      { pubkey: owner,     isSigner: true,  isWritable: false }, // authority
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
        // ── 1. Fetch platform deposit address from backend ─────────────────
        const depositAddressStr = await authService.getWalletAddress();
        const depositAddress    = new PublicKey(depositAddressStr);

        console.log('[Deposit] Platform address:', depositAddressStr);

        // ── 2. Token has 6 decimals (confirmed) ────────────────────────────
        const decimals = TOKEN_DECIMALS;

        // ── 3. DEBUG: log both keys clearly before deriving ATAs ───────────
        console.log('─────────────────────────────────────────');
        console.log('[Deposit] USER publicKey (from wallet):  ', publicKey.toBase58());
        console.log('[Deposit] PLATFORM addr (from API):      ', depositAddressStr);
        console.log('[Deposit] Are they same?', publicKey.toBase58() === depositAddressStr);
        console.log('─────────────────────────────────────────');

        // ── 4. Derive token accounts (ATAs) for sender and receiver ────────
        const senderATA   = deriveATA(publicKey,      TOKEN_MINT);
        const receiverATA = deriveATA(depositAddress, TOKEN_MINT);

        console.log('[Deposit] Sender   ATA (user pubKey + mint):', senderATA.toBase58());
        console.log('[Deposit] Receiver ATA (api addr  + mint):', receiverATA.toBase58());
        console.log('[Deposit] ATAs same?', senderATA.toBase58() === receiverATA.toBase58());
        console.log('─────────────────────────────────────────');

        // ── 5. Make sure sender actually has a token account ───────────────
        const senderInfo = await connection.getAccountInfo(senderATA);
        if (!senderInfo) {
          Alert.alert(
            'No Token Account',
            `Your wallet has no account for this token on devnet.\nATA: ${senderATA.toBase58().slice(0, 16)}…`,
          );
          return;
        }

        // ── 6. Convert human amount → raw units (6 decimals) ───────────────
        // e.g. 10 tokens → 10_000_000 raw
        const rawAmount = BigInt(Math.round(numericAmount * 10 ** decimals));
        console.log('[Deposit] Numeric amount:', numericAmount, '→ Raw:', rawAmount.toString());

        // ── 6. Open MWA, sign, broadcast, confirm ─────────────────────────
        await transact(async (wallet: Web3MobileWallet) => {

          // Re-authorize
          await wallet.authorize({
            cluster: 'devnet',
            identity: APP_IDENTITY,
          });

          // Get latest blockhash
          const { blockhash, lastValidBlockHeight } =
            await connection.getLatestBlockhash();

          // Build transaction
          const tx = new Transaction({
            recentBlockhash: blockhash,
            feePayer: publicKey,
          }).add(
            buildTransferInstruction(senderATA, receiverATA, publicKey, rawAmount),
          );

          // Sign in wallet (user approves in Phantom / Solflare)
          const [signedTx] = await wallet.signTransactions({ transactions: [tx] });

          // Broadcast to devnet
          const sig = await connection.sendRawTransaction(
            signedTx.serialize(),
            { skipPreflight: false, preflightCommitment: 'confirmed' },
          );

          // Wait for confirmation
          await connection.confirmTransaction(
            { signature: sig, blockhash, lastValidBlockHeight },
            'confirmed',
          );

          console.log('[Deposit] ✅ Confirmed tx:', sig);

          Alert.alert(
            '✅ Deposit Successful',
            `${numericAmount.toLocaleString()} tokens deposited.\n\nTx: ${sig.slice(0, 16)}…`,
            [{ text: 'Done', onPress: onClose }],
          );
        });

      } catch (err: any) {
        console.error('[Deposit] ❌ Error:', err);
        Alert.alert(
          'Deposit Failed',
          err?.message ?? 'An unexpected error occurred.',
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
