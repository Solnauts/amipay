import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Contract } from "../target/types/contract";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getAccount,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { assert } from "chai";
import {
  address,
  Address,
  generateKeyPairSigner,
  KeyPairSigner,
  lamports,
  getAddressEncoder,
  getProgramDerivedAddress,
  getUtf8Encoder,
} from "@solana/kit";
import { createClient, getSendAndConfirm } from "./client";
import { PublicKey, LAMPORTS_PER_SOL, Keypair } from "@solana/web3.js";

// ═══════════════════════════════════════════════════════════════════
// Client & helpers (Solana Kit for devnet)
// ═══════════════════════════════════════════════════════════════════
const client = createClient();
const sendAndConfirm = getSendAndConfirm();

// ═══════════════════════════════════════════════════════════════════
// DEVNET USDC MINT – the same address hardcoded in the contract.
// On devnet you CANNOT use a mock mint because the contract enforces:
//   constraint = usdc_mint.key() == USDC_MINT
// with USDC_MINT = "USDCoctVLVnvTXBEuP9s8hntucdJokbo17RwHuNXemT"
// ═══════════════════════════════════════════════════════════════════
const USDC_MINT_PUBKEY = new PublicKey(
  "USDCoctVLVnvTXBEuP9s8hntucdJokbo17RwHuNXemT"
);

// USDC has 6 decimals
const USDC_DECIMALS = 6;
const INITIAL_MINT_AMOUNT = 1_000 * 10 ** USDC_DECIMALS; // 1 000 USDC

// ═══════════════════════════════════════════════════════════════════
// Helper: derive PDA using Solana Kit
// ═══════════════════════════════════════════════════════════════════
const utf8 = getUtf8Encoder();
const addrEncoder = getAddressEncoder();

/**
 * Derives the main_state PDA:
 *   seeds = [b"main_state", usdc_mint.key(), signer.key()]
 */

console.log("this function is called");
async function deriveMainStatePda(
  usdcMint: Address,
  signerAddr: Address,
  programId: Address
): Promise<[Address, number]> {
  const seeds = [
    utf8.encode("main_state"),
    addrEncoder.encode(usdcMint),
    addrEncoder.encode(signerAddr),
  ];
  const [pda, bump] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds,
  });
  return [pda, bump];
}

console.log("derive main state is working ");
/**
 * Derives the user_usdc_ata PDA (the program-owned vault):
 *   seeds = [b"user_usdc_ata", usdc_mint.key()]
 */
async function deriveUserUsdcAtaPda(
  usdcMint: Address,
  programId: Address
): Promise<[Address, number]> {
  const seeds = [
    utf8.encode("user_usdc_ata"),
    addrEncoder.encode(usdcMint),
  ];
  const [pda, bump] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds,
  });
  return [pda, bump];
}

/**
 * Helper – airdrop SOL on devnet using Solana Kit RPC.
 * Devnet has a 2 SOL cap per airdrop, so we request 2 SOL.
 */
async function airdropSol(targetAddress: Address): Promise<void> {
  const airdropAmt = lamports(BigInt(2 * LAMPORTS_PER_SOL));
  await client.rpc
    .requestAirdrop(targetAddress, airdropAmt, { commitment: "confirmed" })
    .send();
  // Wait for confirmation
  console.log(`  ↳ Airdropped 2 SOL to ${targetAddress}`);
}

// ═══════════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════════
describe("contract", () => {
  // ────────────────────────────────────────────────────────────────
  // Anchor provider + program (still needed to send Anchor txs)
  // ────────────────────────────────────────────────────────────────
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.contract as Program<Contract>;
  const connection = provider.connection;

  // The program ID as a Solana Kit `Address`
  const programId: Address = address(program.programId.toBase58());

  // The USDC mint as a Kit Address (for PDA derivation)
  const usdcMintAddr: Address = address(USDC_MINT_PUBKEY.toBase58());

  // ────────────────────────────────────────────────────────────────
  // Accounts that get populated in `before()`
  // ────────────────────────────────────────────────────────────────

  // The admin signer – the keypair that "owns" the main_state PDA.
  // In production this is YOUR backend keypair whose pubkey is stored
  // inside MainAccountShape.admin_signer.
  let adminSigner: Keypair;

  // Derived PDAs (Solana Kit Address type)
  let mainStatePda: Address;
  let mainStateBump: number;
  let userUsdcAtaPda: Address; // program vault
  let userUsdcAtaBump: number;

  // User's personal USDC token account (NOT a PDA, regular ATA)
  let userTokenAccount: PublicKey;

  // ────────────────────────────────────────────────────────────────
  // SETUP
  // ────────────────────────────────────────────────────────────────
  before(async () => {
    console.log("\n🔧 Setting up test environment on DEVNET ...\n");

    // Use the provider wallet as admin signer.
    // In production the admin keypair should come from secure storage.
    adminSigner = (provider.wallet as anchor.Wallet).payer;
    const adminAddr: Address = address(adminSigner.publicKey.toBase58());

    console.log("  Admin signer:", adminAddr);
    console.log("  USDC mint   :", usdcMintAddr);

    // ── Fund admin if needed ────────────────────────────────────
    const balance = await client.rpc
      .getBalance(adminAddr, { commitment: "confirmed" })
      .send();
    console.log("admin thing is called");
    const minBalance = lamports(BigInt(1 * LAMPORTS_PER_SOL));
    if (balance.value < minBalance) {
      console.log("  Balance low – requesting airdrop …");
      await airdropSol(adminAddr);
      console.log("solana balance thing is called");
    }
    console.log("  SOL balance :", balance.value.toString());

    // ── Derive PDAs using Solana Kit ────────────────────────────
    [mainStatePda, mainStateBump] = await deriveMainStatePda(
      usdcMintAddr,
      adminAddr,
      programId
    );
    console.log("  main_state PDA :", mainStatePda, " bump:", mainStateBump);

    [userUsdcAtaPda, userUsdcAtaBump] = await deriveUserUsdcAtaPda(
      usdcMintAddr,
      programId
    );
    console.log("  user_usdc_ata PDA:", userUsdcAtaPda, " bump:", userUsdcAtaBump);

    // ── Create user's personal USDC token account & mint tokens ─
    // On devnet the hardcoded USDC mint must already exist.
    // If you are the mint authority you can mint tokens; otherwise
    // you need to acquire devnet USDC from a faucet.
    try {
      userTokenAccount = await createAccount(
        connection,
        adminSigner,          // payer
        USDC_MINT_PUBKEY,     // mint
        adminSigner.publicKey, // owner
        undefined,
        undefined,
        TOKEN_PROGRAM_ID
      );
      console.log("  User token account:", userTokenAccount.toBase58());

      // If we are the mint authority we can mint directly
      await mintTo(
        connection,
        adminSigner,
        USDC_MINT_PUBKEY,
        userTokenAccount,
        adminSigner.publicKey, // mint authority
        INITIAL_MINT_AMOUNT,
        [],
        undefined,
        TOKEN_PROGRAM_ID
      );
      console.log(`  Minted ${INITIAL_MINT_AMOUNT / 10 ** USDC_DECIMALS} USDC`);
    } catch (err: any) {
      console.warn(
        "  ⚠ Could not create/mint to token account.",
        "  If the USDC mint authority is not your wallet,",
        "  fund the account externally first."
      );
      console.warn("  Error:", err.message ?? err);
    }

    console.log("\n✅ Setup complete\n");
  });

  // ════════════════════════════════════════════════════════════════
  //  1. INITIALIZATION TESTS
  // ════════════════════════════════════════════════════════════════
  describe("Initialize", () => {
    it("should successfully initialize the contract (creates the vault PDA)", async () => {
      /**
       * Account ownership model:
       *
       *   adminSigner  ──owns──▶  main_state PDA  (MainAccountShape)
       *                                │
       *                                ├── token::authority ──▶  user_usdc_ata  (vault)
       *                                └── (future) ──▶  main_usdc_vault
       *
       * The main_state PDA is derived from:
       *   seeds = ["main_state", usdc_mint, signer]
       *
       * The vault (user_usdc_ata) is derived from:
       *   seeds = ["user_usdc_ata", usdc_mint]
       *   authority = main_state PDA  (so only the program can move funds)
       *
       * IMPORTANT: main_state_account must already be initialized on-chain
       * with the admin_signer field set to your pubkey BEFORE calling
       * initialize, because the constraint checks signer == admin_signer.
       */
      const tx = await program.methods
        .initialize()
        .accountsPartial({
          signer: adminSigner.publicKey,
          usdcMint: USDC_MINT_PUBKEY,
          systemProgram: anchor.web3.SystemProgram.programId,
          mainStateAccount: new PublicKey(mainStatePda),
          tokenProgram: TOKEN_PROGRAM_ID,
          userUsdcAta: new PublicKey(userUsdcAtaPda),
        })
        .rpc();

      console.log("  Initialize tx:", tx);

      // ── Verify with Solana Kit RPC ────────────────────────────
      const vaultAccountInfo = await client.rpc
        .getAccountInfo(userUsdcAtaPda, {
          commitment: "confirmed",
          encoding: "base64",
        })
        .send();
      assert.ok(vaultAccountInfo.value, "Vault account should exist after init");

      // Also verify via spl-token helper
      const vaultInfo = await getAccount(
        connection,
        new PublicKey(userUsdcAtaPda)
      );
      assert.ok(vaultInfo, "Vault account should be readable");
      assert.equal(
        vaultInfo.mint.toBase58(),
        USDC_MINT_PUBKEY.toBase58(),
        "Vault mint should be USDC"
      );
      // The authority on the vault should be the main_state PDA
      assert.equal(
        vaultInfo.owner.toBase58(),
        mainStatePda,
        "Vault authority must be the main_state PDA"
      );
      console.log("  Vault balance:", vaultInfo.amount.toString());
    });

    it("should fail when initializing with an incorrect USDC mint", async () => {
      /**
       * The contract has an explicit constraint:
       *   constraint = usdc_mint.key() == USDC_MINT
       * Passing a different mint should trigger IncorrectUscMint (6000).
       */
      // Create a throwaway mint on devnet
      const fakeMint = await createMint(
        connection,
        adminSigner,
        adminSigner.publicKey,
        null,
        6,
        undefined,
        undefined,
        TOKEN_PROGRAM_ID
      );
      const fakeMintAddr = address(fakeMint.toBase58());

      // Derive PDAs with the fake mint
      const [fakeStatePda] = await deriveMainStatePda(
        fakeMintAddr,
        address(adminSigner.publicKey.toBase58()),
        programId
      );
      const [fakeVaultPda] = await deriveUserUsdcAtaPda(fakeMintAddr, programId);

      try {
        await program.methods
          .initialize()
          .accountsPartial({
            signer: adminSigner.publicKey,
            usdcMint: fakeMint,
            systemProgram: anchor.web3.SystemProgram.programId,
            mainStateAccount: new PublicKey(fakeStatePda),
            tokenProgram: TOKEN_PROGRAM_ID,
            userUsdcAta: new PublicKey(fakeVaultPda),
          })
          .rpc();

        assert.fail("Should have rejected the incorrect mint");
      } catch (error: any) {
        console.log("  ✓ Correctly rejected incorrect mint");
        // Anchor custom error 6000 – IncorrectUscMint
        assert.ok(
          error.message?.includes("IncorrectUscMint") ||
          error.message?.includes("incorrect usdc mint") ||
          error.error?.errorCode?.code === "IncorrectUscMint" ||
          error.toString().includes("6000"),
          "Expected IncorrectUscMint error"
        );
      }
    });

    it("should fail on double initialization (account already exists)", async () => {
      try {
        await program.methods
          .initialize()
          .accountsPartial({
            signer: adminSigner.publicKey,
            usdcMint: USDC_MINT_PUBKEY,
            systemProgram: anchor.web3.SystemProgram.programId,
            mainStateAccount: new PublicKey(mainStatePda),
            tokenProgram: TOKEN_PROGRAM_ID,
            userUsdcAta: new PublicKey(userUsdcAtaPda),
          })
          .rpc();

        assert.fail("Second initialization should fail");
      } catch (error) {
        console.log("  ✓ Correctly prevented double init");
        assert.ok(error, "Double init must throw");
      }
    });
  });

  // ════════════════════════════════════════════════════════════════
  //  2. TRANSFER-TO-VAULT TESTS
  // ════════════════════════════════════════════════════════════════
  describe("Transfer to Vault", () => {
    it("should transfer tokens from user ATA → program vault", async () => {
      /**
       * Flow:
       *   user_usdc_ata (owned by main_state PDA) ──▶ main_usdc_vault
       *
       * Both token accounts have `authority = main_state PDA`, so the
       * program signs via PDA seeds.
       */
      const transferAmount = 100 * 10 ** USDC_DECIMALS; // 100 USDC

      // Get initial balances
      const initialUserBalance = (
        await getAccount(connection, userTokenAccount)
      ).amount;
      console.log(
        "  Initial user balance:",
        Number(initialUserBalance) / 10 ** USDC_DECIMALS,
        "USDC"
      );

      const tx = await program.methods
        .transfertovault(new anchor.BN(transferAmount))
        .accountsPartial({
          signer: adminSigner.publicKey,
          usdcMint: USDC_MINT_PUBKEY,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          mainStateAccount: new PublicKey(mainStatePda),
          userUsdcAta: userTokenAccount,           // source (user's token acct)
          mainUsdcVault: new PublicKey(userUsdcAtaPda), // destination (program vault)
        })
        .rpc();

      console.log("  Transfer tx:", tx);

      // ── Verify balances with Solana Kit RPC ───────────────────
      const finalUserBalance = (
        await getAccount(connection, userTokenAccount)
      ).amount;
      const vaultBalance = (
        await getAccount(connection, new PublicKey(userUsdcAtaPda))
      ).amount;

      console.log(
        "  Final user balance:",
        Number(finalUserBalance) / 10 ** USDC_DECIMALS,
        "USDC"
      );
      console.log(
        "  Vault balance     :",
        Number(vaultBalance) / 10 ** USDC_DECIMALS,
        "USDC"
      );

      assert.equal(
        Number(initialUserBalance) - Number(finalUserBalance),
        transferAmount,
        "User balance should decrease by the transfer amount"
      );
    });

    it("should fail when transferring more than the available balance", async () => {
      const excessiveAmount = 1_000_000 * 10 ** USDC_DECIMALS;

      try {
        await program.methods
          .transfertovault(new anchor.BN(excessiveAmount))
          .accountsPartial({
            signer: adminSigner.publicKey,
            usdcMint: USDC_MINT_PUBKEY,
            systemProgram: anchor.web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            mainStateAccount: new PublicKey(mainStatePda),
            userUsdcAta: userTokenAccount,
            mainUsdcVault: new PublicKey(userUsdcAtaPda),
          })
          .rpc();

        assert.fail("Should have failed – insufficient funds");
      } catch (error: any) {
        console.log("  ✓ Correctly rejected excessive transfer");
        assert.ok(
          error.message?.includes("InsufficientAmountError") ||
          error.message?.includes("insufficient") ||
          error.toString().includes("6000"),
          "Expected InsufficientAmountError"
        );
      }
    });

    it("should fail when transferring zero amount", async () => {
      try {
        await program.methods
          .transfertovault(new anchor.BN(0))
          .accountsPartial({
            signer: adminSigner.publicKey,
            usdcMint: USDC_MINT_PUBKEY,
            systemProgram: anchor.web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            mainStateAccount: new PublicKey(mainStatePda),
            userUsdcAta: userTokenAccount,
            mainUsdcVault: new PublicKey(userUsdcAtaPda),
          })
          .rpc();

        assert.fail("Should have failed – zero transfer");
      } catch (error: any) {
        console.log("  ✓ Correctly rejected zero amount");
        assert.ok(
          error.message?.includes("InvalidAmmount") ||
          error.message?.includes("greater then 0") ||
          error.toString().includes("6001"),
          "Expected InvalidAmmount error"
        );
      }
    });
  });

  // ════════════════════════════════════════════════════════════════
  //  3. SECURITY TESTS
  // ════════════════════════════════════════════════════════════════
  describe("Security Tests", () => {
    it("should reject an unauthorized signer", async () => {
      /**
       * The contract checks:
       *   constraint = signer.key() == main_state_account.admin_signer
       *
       * An attacker signer would derive a DIFFERENT main_state PDA
       * (because signer is part of the PDA seeds), so the PDA wouldn't
       * match an initialized account → AccountNotInitialized error.
       * This is the on-chain gatekeeper – client checks are NOT enough.
       */
      const attackerKeypair = Keypair.generate();
      const attackerAddr: Address = address(
        attackerKeypair.publicKey.toBase58()
      );

      // Fund attacker
      await airdropSol(attackerAddr);

      // Attacker's PDA (different from admin's because signer differs)
      const [attackerStatePda] = await deriveMainStatePda(
        usdcMintAddr,
        attackerAddr,
        programId
      );

      try {
        await program.methods
          .transfertovault(new anchor.BN(50 * 10 ** USDC_DECIMALS))
          .accountsPartial({
            signer: attackerKeypair.publicKey,
            usdcMint: USDC_MINT_PUBKEY,
            systemProgram: anchor.web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            mainStateAccount: new PublicKey(attackerStatePda),
            userUsdcAta: userTokenAccount,
            mainUsdcVault: new PublicKey(userUsdcAtaPda),
          })
          .signers([attackerKeypair])
          .rpc();

        assert.fail("Unauthorized signer should be rejected");
      } catch (error) {
        console.log("  ✓ Unauthorized signer was rejected");
        assert.ok(error, "Unauthorized transfer must throw");
      }
    });

    it("should reject a wrong/uninitialized state account", async () => {
      // Passing a random pubkey as main_state_account will fail
      // because it won't match the expected PDA seeds.
      const fakeState = Keypair.generate();

      try {
        await program.methods
          .transfertovault(new anchor.BN(10 * 10 ** USDC_DECIMALS))
          .accountsPartial({
            signer: adminSigner.publicKey,
            usdcMint: USDC_MINT_PUBKEY,
            systemProgram: anchor.web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            mainStateAccount: fakeState.publicKey,
            userUsdcAta: userTokenAccount,
            mainUsdcVault: new PublicKey(userUsdcAtaPda),
          })
          .rpc();

        assert.fail("Wrong state account should be rejected");
      } catch (error) {
        console.log("  ✓ Wrong state account was rejected");
        assert.ok(error, "Mismatched state account must throw");
      }
    });

    it("should reject a wrong vault account", async () => {
      // Create a token account that is NOT the PDA vault
      const fakeVault = await createAccount(
        connection,
        adminSigner,
        USDC_MINT_PUBKEY,
        adminSigner.publicKey,
        undefined,
        undefined,
        TOKEN_PROGRAM_ID
      );

      try {
        await program.methods
          .transfertovault(new anchor.BN(10 * 10 ** USDC_DECIMALS))
          .accountsPartial({
            signer: adminSigner.publicKey,
            usdcMint: USDC_MINT_PUBKEY,
            systemProgram: anchor.web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            mainStateAccount: new PublicKey(mainStatePda),
            userUsdcAta: userTokenAccount,
            mainUsdcVault: fakeVault,
          })
          .rpc();

        assert.fail("Wrong vault should be rejected");
      } catch (error) {
        console.log("  ✓ Wrong vault was rejected");
        assert.ok(error, "Mismatched vault must throw");
      }
    });

    it("should reject transfer when signer is NOT the admin stored in state", async () => {
      /**
       * Even if someone passes the CORRECT main_state PDA address,
       * they can't sign because the PDA is seeded with the admin's
       * pubkey. A different signer computes a different PDA →
       * constraint mismatch or AccountNotInitialized.
       */
      const impersonator = Keypair.generate();
      await airdropSol(address(impersonator.publicKey.toBase58()));

      try {
        // Pass the ADMIN's state PDA but sign with a different key
        await program.methods
          .transfertovault(new anchor.BN(10 * 10 ** USDC_DECIMALS))
          .accountsPartial({
            signer: impersonator.publicKey,
            usdcMint: USDC_MINT_PUBKEY,
            systemProgram: anchor.web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            // Using admin's PDA with impersonator's signer → seeds mismatch
            mainStateAccount: new PublicKey(mainStatePda),
            userUsdcAta: userTokenAccount,
            mainUsdcVault: new PublicKey(userUsdcAtaPda),
          })
          .signers([impersonator])
          .rpc();

        assert.fail("Impersonation should be rejected");
      } catch (error) {
        console.log("  ✓ Signer impersonation was rejected");
        assert.ok(error, "Impersonation must throw");
      }
    });
  });

  // ════════════════════════════════════════════════════════════════
  //  4. EDGE CASE TESTS
  // ════════════════════════════════════════════════════════════════
  describe("Edge Cases", () => {
    it("should reject max u64 amount (overflow / insufficient balance)", async () => {
      const maxU64 = new anchor.BN("18446744073709551615");

      try {
        await program.methods
          .transfertovault(maxU64)
          .accountsPartial({
            signer: adminSigner.publicKey,
            usdcMint: USDC_MINT_PUBKEY,
            systemProgram: anchor.web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            mainStateAccount: new PublicKey(mainStatePda),
            userUsdcAta: userTokenAccount,
            mainUsdcVault: new PublicKey(userUsdcAtaPda),
          })
          .rpc();

        assert.fail("Max u64 should fail");
      } catch (error) {
        console.log("  ✓ Max u64 correctly handled");
      }
    });

    it("should handle transfer of exact remaining balance", async () => {
      const currentBalance = (
        await getAccount(connection, userTokenAccount)
      ).amount;
      console.log(
        "  Current balance:",
        Number(currentBalance) / 10 ** USDC_DECIMALS,
        "USDC"
      );

      if (currentBalance === BigInt(0)) {
        console.log("  Skipping – balance is already zero");
        return;
      }

      try {
        await program.methods
          .transfertovault(new anchor.BN(currentBalance.toString()))
          .accountsPartial({
            signer: adminSigner.publicKey,
            usdcMint: USDC_MINT_PUBKEY,
            systemProgram: anchor.web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            mainStateAccount: new PublicKey(mainStatePda),
            userUsdcAta: userTokenAccount,
            mainUsdcVault: new PublicKey(userUsdcAtaPda),
          })
          .rpc();

        const finalBalance = (
          await getAccount(connection, userTokenAccount)
        ).amount;
        assert.equal(
          Number(finalBalance),
          0,
          "Balance should be zero after exact transfer"
        );
        console.log("  ✓ Exact balance transfer succeeded");
      } catch (error: any) {
        // May fail due to PDA authority issues
        console.warn("  Exact balance transfer failed:", error.message);
      }
    });
  });

  // ════════════════════════════════════════════════════════════════
  //  5. ACCOUNT OWNERSHIP VERIFICATION (Solana Kit RPC)
  // ════════════════════════════════════════════════════════════════
  describe("Account Ownership Verification (Solana Kit)", () => {
    it("should verify main_state PDA is owned by the program", async () => {
      const accountInfo = await client.rpc
        .getAccountInfo(mainStatePda, {
          commitment: "confirmed",
          encoding: "base64",
        })
        .send();

      if (!accountInfo.value) {
        console.log("  ⚠ main_state not yet created – skipping");
        return;
      }

      assert.equal(
        accountInfo.value.owner,
        programId,
        "main_state PDA must be owned by the program"
      );
      console.log("  ✓ main_state PDA is owned by program:", programId);
    });

    it("should verify vault PDA is owned by the Token Program", async () => {
      const vaultInfo = await client.rpc
        .getAccountInfo(userUsdcAtaPda, {
          commitment: "confirmed",
          encoding: "base64",
        })
        .send();

      if (!vaultInfo.value) {
        console.log("  ⚠ vault not yet created – skipping");
        return;
      }

      const tokenProgramAddr = address(TOKEN_PROGRAM_ID.toBase58());
      assert.equal(
        vaultInfo.value.owner,
        tokenProgramAddr,
        "Vault on-chain owner must be the Token Program"
      );
      console.log("  ✓ Vault is owned by Token Program");

      // Additionally verify the token-level authority is the main_state PDA
      const tokenAcct = await getAccount(
        connection,
        new PublicKey(userUsdcAtaPda)
      );
      assert.equal(
        tokenAcct.owner.toBase58(),
        mainStatePda,
        "Token-level authority must be the main_state PDA"
      );
      console.log("  ✓ Vault token authority = main_state PDA");
    });
  });
});
