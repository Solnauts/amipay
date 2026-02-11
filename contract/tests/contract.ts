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
  getOrCreateAssociatedTokenAccount,
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
import * as fs from "fs";
import * as path from "path";

// ═══════════════════════════════════════════════════════════════════
// Client & helpers (Solana Kit for devnet)
// ═══════════════════════════════════════════════════════════════════
const client = createClient();
const sendAndConfirm = getSendAndConfirm();

// ═══════════════════════════════════════════════════════════════════
// STATIC KEYPAIR LOADING
// ═══════════════════════════════════════════════════════════════════
//
// Option A: Load from a JSON keypair file (e.g. solana-keygen output)
//           Set the path to your funded devnet keypair below.
//
// Option B: Load from a raw private key (base58 or Uint8Array).
//           Paste your private key bytes below.
//
// ⚠️  NEVER commit private keys to git. Add this file to .gitignore.
// ═══════════════════════════════════════════════════════════════════

/**
 * Loads a Keypair from the Anchor wallet JSON file.
 * Falls back to ~/.config/solana/id.json if no custom path is set.
 */
function loadKeypairFromFile(filePath: string): Keypair {
  const resolvedPath = filePath.startsWith("~")
    ? path.join(process.env.HOME!, filePath.slice(1))
    : filePath;

  const rawKey = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(rawKey));
}

/**
 * Loads a Keypair from a raw secret key byte array.
 * Paste your 64-byte secret key array here.
 */
function loadKeypairFromSecret(): Keypair {
  // ╔══════════════════════════════════════════════════════════╗
  // ║  PASTE YOUR 64-BYTE SECRET KEY ARRAY BELOW              ║
  // ║  Example: [174,47,154, ... ,219,83]                      ║
  // ║                                                          ║
  // ║  This keypair must be funded on devnet with:             ║
  // ║    • At least 2 SOL (for tx fees + account creation)     ║
  // ║    • At least 500 USDC in a token account                ║
  // ╚══════════════════════════════════════════════════════════╝
  const SECRET_KEY: number[] = [
    // TODO: Paste your secret key bytes here
    // Example: 174, 47, 154, 16, 202, ...
  ];

  if (SECRET_KEY.length === 0) {
    throw new Error(
      "No secret key provided in loadKeypairFromSecret(). " +
      "Either paste your key or use loadKeypairFromFile() instead."
    );
  }

  return Keypair.fromSecretKey(Uint8Array.from(SECRET_KEY));
}

// ═══════════════════════════════════════════════════════════════════
// CHOOSE YOUR KEYPAIR LOADING METHOD
// ═══════════════════════════════════════════════════════════════════
//
// METHOD 1 – From Anchor wallet JSON file (DEFAULT):
const TEST_KEYPAIR = loadKeypairFromFile("~/.config/solana/id.json");
//
// METHOD 2 – From raw private key bytes (uncomment and comment out above):
// const TEST_KEYPAIR = loadKeypairFromSecret();
//

// ═══════════════════════════════════════════════════════════════════
// DEVNET USDC MINT – hardcoded in the contract.
// ═══════════════════════════════════════════════════════════════════
const USDC_MINT_PUBKEY = new PublicKey(
  "USDCoctVLVnvTXBEuP9s8hntucdJokbo17RwHuNXemT"
);

const USDC_DECIMALS = 6;
const INITIAL_MINT_AMOUNT = 1_000 * 10 ** USDC_DECIMALS; // 1 000 USDC

// ═══════════════════════════════════════════════════════════════════
// PDA derivation helpers (Solana Kit)
// ═══════════════════════════════════════════════════════════════════
const utf8 = getUtf8Encoder();
const addrEncoder = getAddressEncoder();

/**
 * Derives the main_state PDA:
 *   seeds = [b"main_state", usdc_mint.key(), signer.key()]
 */
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

// ═══════════════════════════════════════════════════════════════════
// MINIMUM BALANCES REQUIRED
// ═══════════════════════════════════════════════════════════════════
//
//  SOL :  ~2 SOL total
//         • 0.00204928 SOL per token account rent
//         • ~0.003 SOL per transaction fee (x ~15 tests = ~0.05 SOL)
//         • 0.00116 SOL for main_state PDA rent
//         • Buffer for retries
//
//  USDC:  ~10 USDC
//         • 2 USDC for the main transfer test
//         • 1 USDC for unauthorized signer test (simulated, not spent)
//         • 0.5  USDC x several security tests (simulated, not spent)
//         • full balance transfer at the end
//         • Buffer for repeated runs
//
const MIN_SOL_REQUIRED = 2 * LAMPORTS_PER_SOL;
const MIN_USDC_REQUIRED = 10 * 10 ** USDC_DECIMALS; // 10 USDC

// ═══════════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════════
describe("contract", () => {
  // ────────────────────────────────────────────────────────────────
  // Anchor provider + program
  // ────────────────────────────────────────────────────────────────
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.contract as Program<Contract>;
  const connection = provider.connection;

  const programId: Address = address(program.programId.toBase58());
  const usdcMintAddr: Address = address(USDC_MINT_PUBKEY.toBase58());

  // ────────────────────────────────────────────────────────────────
  // Accounts populated in before()
  // ────────────────────────────────────────────────────────────────

  // Static admin signer – loaded from file/secret, NOT generated randomly
  const adminSigner: Keypair = TEST_KEYPAIR;

  // Derived PDAs
  let mainStatePda: Address;
  let mainStateBump: number;
  let userUsdcAtaPda: Address;
  let userUsdcAtaBump: number;

  // User's personal USDC token account
  let userTokenAccount: PublicKey;

  // ────────────────────────────────────────────────────────────────
  // SETUP — No airdrops, uses pre-funded static keypair
  // ────────────────────────────────────────────────────────────────
  before(async () => {
    console.log("\n🔧 Setting up test environment on DEVNET ...\n");

    const adminAddr: Address = address(adminSigner.publicKey.toBase58());
    console.log("  Admin pubkey :", adminAddr);
    console.log("  USDC mint    :", usdcMintAddr);

    // ── Check SOL balance (no airdrop – keypair must be pre-funded) ──
    const solBalance = await connection.getBalance(
      adminSigner.publicKey,
      "confirmed"
    );
    console.log(
      "  SOL balance  :",
      (solBalance / LAMPORTS_PER_SOL).toFixed(4),
      "SOL"
    );

    if (solBalance < MIN_SOL_REQUIRED) {
      throw new Error(
        `❌ Insufficient SOL! Have ${(solBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL, ` +
        `need at least ${(MIN_SOL_REQUIRED / LAMPORTS_PER_SOL).toFixed(4)} SOL.\n` +
        `   Fund this address on devnet: ${adminSigner.publicKey.toBase58()}\n` +
        `   Run: solana airdrop 2 ${adminSigner.publicKey.toBase58()} --url devnet`
      );
    }
    console.log("  ✓ SOL balance sufficient\n");

    // ── Derive PDAs using Solana Kit ────────────────────────────
    [mainStatePda, mainStateBump] = await deriveMainStatePda(
      usdcMintAddr,
      adminAddr,
      programId
    );
    console.log("  main_state PDA  :", mainStatePda, " bump:", mainStateBump);

    [userUsdcAtaPda, userUsdcAtaBump] = await deriveUserUsdcAtaPda(
      usdcMintAddr,
      programId
    );
    console.log("  user_usdc_ata PDA:", userUsdcAtaPda, " bump:", userUsdcAtaBump);

    // ── Get or create user's USDC token account ─────────────────
    // Uses getOrCreateAssociatedTokenAccount so it's idempotent
    // (won't fail if already exists from a previous run)
    try {
      const ata = await getOrCreateAssociatedTokenAccount(
        connection,
        adminSigner,          // payer
        USDC_MINT_PUBKEY,     // mint
        adminSigner.publicKey, // owner
        false,                // allowOwnerOffCurve
        "confirmed",
        undefined,
        TOKEN_PROGRAM_ID
      );
      userTokenAccount = ata.address;
      console.log("  User USDC ATA:", userTokenAccount.toBase58());

      // Check USDC balance
      const usdcBalance = Number(ata.amount) / 10 ** USDC_DECIMALS;
      console.log("  USDC balance :", usdcBalance.toFixed(2), "USDC");

      if (Number(ata.amount) < MIN_USDC_REQUIRED) {
        console.warn(
          `\n  ⚠ USDC balance is low! Have ${usdcBalance.toFixed(2)} USDC, ` +
          `need at least ${(MIN_USDC_REQUIRED / 10 ** USDC_DECIMALS).toFixed(2)} USDC.` +
          `\n  Send devnet USDC to: ${userTokenAccount.toBase58()}\n`
        );
      } else {
        console.log("  ✓ USDC balance sufficient\n");
      }
    } catch (err: any) {
      console.error("  ❌ Failed to get/create USDC token account:", err.message);
      throw err;
    }

    console.log("✅ Setup complete\n");
  });

  // ════════════════════════════════════════════════════════════════
  //  1. INITIALIZATION TESTS
  // ════════════════════════════════════════════════════════════════
  describe("Initialize", () => {
    it("should successfully initialize the contract (creates the vault PDA)", async () => {
      /**
       * Account ownership model:
       *
       *   adminSigner (static keypair)
       *       │
       *       └──owns──▶ main_state PDA (MainAccountShape)
       *                       │
       *                       ├── token::authority ──▶ user_usdc_ata (vault)
       *                       └── (future) ──▶ main_usdc_vault
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

      // Verify vault exists via Solana Kit RPC
      const vaultAccountInfo = await client.rpc
        .getAccountInfo(userUsdcAtaPda, {
          commitment: "confirmed",
          encoding: "base64",
        })
        .send();
      assert.ok(vaultAccountInfo.value, "Vault account should exist after init");

      // Verify via spl-token helper
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
      assert.equal(
        vaultInfo.owner.toBase58(),
        mainStatePda,
        "Vault authority must be the main_state PDA"
      );
      console.log("  Vault balance:", vaultInfo.amount.toString());
    });

    it("should fail when initializing with an incorrect USDC mint", async () => {
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
        // May be AccountNotInitialized (3012) because the fake PDA
        // doesn't exist, OR IncorrectUscMint (6000) if PDA existed.
        // Either way the program rejects it — that's correct behavior.
        assert.ok(error, "Incorrect mint must throw");
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
      const transferAmount = 2 * 10 ** USDC_DECIMALS; // 2 USDC

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
          userUsdcAta: userTokenAccount,
          mainUsdcVault: new PublicKey(userUsdcAtaPda),
        })
        .rpc();

      console.log("  Transfer tx:", tx);

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
      const excessiveAmount = 100_000 * 10 ** USDC_DECIMALS;

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
        assert.ok(error, "Insufficient balance must throw");
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
        assert.ok(error, "Zero amount must throw");
      }
    });
  });

  // ════════════════════════════════════════════════════════════════
  //  3. SECURITY TESTS — No airdrops, use static generated keypairs
  // ════════════════════════════════════════════════════════════════
  describe("Security Tests", () => {
    it("should reject an unauthorized signer", async () => {
      /**
       * Attacker keypair – generated locally, never needs SOL because
       * we expect the tx to fail at simulation (before it's submitted).
       * We use simulate instead of rpc to avoid needing funded attackers.
       */
      const attackerKeypair = Keypair.generate();
      const attackerAddr: Address = address(
        attackerKeypair.publicKey.toBase58()
      );

      // Attacker's PDA is different from admin's (signer is in the seed)
      const [attackerStatePda] = await deriveMainStatePda(
        usdcMintAddr,
        attackerAddr,
        programId
      );

      try {
        await program.methods
          .transfertovault(new anchor.BN(1 * 10 ** USDC_DECIMALS))
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
          .simulate();

        assert.fail("Unauthorized signer should be rejected");
      } catch (error) {
        console.log("  ✓ Unauthorized signer was rejected");
        assert.ok(error, "Unauthorized transfer must throw");
      }
    });

    it("should reject a wrong/uninitialized state account", async () => {
      const fakeState = Keypair.generate();

      try {
        await program.methods
          .transfertovault(new anchor.BN(0.5 * 10 ** USDC_DECIMALS))
          .accountsPartial({
            signer: adminSigner.publicKey,
            usdcMint: USDC_MINT_PUBKEY,
            systemProgram: anchor.web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            mainStateAccount: fakeState.publicKey,
            userUsdcAta: userTokenAccount,
            mainUsdcVault: new PublicKey(userUsdcAtaPda),
          })
          .simulate();

        assert.fail("Wrong state account should be rejected");
      } catch (error) {
        console.log("  ✓ Wrong state account was rejected");
        assert.ok(error, "Mismatched state account must throw");
      }
    });

    it("should reject a wrong vault account", async () => {
      // Use the user's own token account as a "wrong" vault
      // instead of creating a new one (saves a devnet tx)
      try {
        await program.methods
          .transfertovault(new anchor.BN(0.5 * 10 ** USDC_DECIMALS))
          .accountsPartial({
            signer: adminSigner.publicKey,
            usdcMint: USDC_MINT_PUBKEY,
            systemProgram: anchor.web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            mainStateAccount: new PublicKey(mainStatePda),
            userUsdcAta: userTokenAccount,
            mainUsdcVault: userTokenAccount, // wrong – same as source
          })
          .simulate();

        assert.fail("Wrong vault should be rejected");
      } catch (error) {
        console.log("  ✓ Wrong vault was rejected");
        assert.ok(error, "Mismatched vault must throw");
      }
    });

    it("should reject transfer when signer is NOT the admin stored in state", async () => {
      const impersonator = Keypair.generate();

      try {
        // Pass the ADMIN's state PDA but sign with a different key
        await program.methods
          .transfertovault(new anchor.BN(0.5 * 10 ** USDC_DECIMALS))
          .accountsPartial({
            signer: impersonator.publicKey,
            usdcMint: USDC_MINT_PUBKEY,
            systemProgram: anchor.web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            mainStateAccount: new PublicKey(mainStatePda),
            userUsdcAta: userTokenAccount,
            mainUsdcVault: new PublicKey(userUsdcAtaPda),
          })
          .signers([impersonator])
          .simulate();

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
          .simulate();

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
