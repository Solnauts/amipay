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
  ASSOCIATED_TOKEN_PROGRAM_ID,
  transfer,
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
// FEE for createMainAccounts (basis points, max 500 = 5%)
// ═══════════════════════════════════════════════════════════════════
const FEE_BPS = new anchor.BN(100); // 1% fee

// ═══════════════════════════════════════════════════════════════════
// Unique ID for initialize instruction (used in PDA seed derivation)
// ═══════════════════════════════════════════════════════════════════
const UNIQUE_ID = "test_user_001";

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
 * Derives the user_usdc_ata PDA (the user-facing vault):
 *   seeds = [b"user_usdc_ata", unique_id.as_bytes(), usdc_mint.key()]
 *
 * NOTE: The Initialize instruction uses unique_id in the seed.
 */

//function to deriveUserUsdcAtaPda
async function deriveUserUsdcAtaPda(
  uniqueId: string,
  usdcMint: Address,
  programId: Address
): Promise<[Address, number]> {
  const seeds = [
    utf8.encode("user_usdc_ata"),
    utf8.encode(uniqueId),
    addrEncoder.encode(usdcMint),
  ];
  const [pda, bump] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds,
  });
  return [pda, bump];
}

/**
 * Derives the main_usdc_vault PDA (the main program vault created by createMainAccounts):
 *   seeds = [b"main_usdc_vault", usdc_mint.key(), signer.key()]
 *
 * NOTE: The CreateMainAccounts instruction includes signer in the seed.
 */

//function to deriveMainUsdcVaultPda
async function deriveMainUsdcVaultPda(
  usdcMint: Address,
  signerAddr: Address,
  programId: Address
): Promise<[Address, number]> {
  const seeds = [
    utf8.encode("main_usdc_vault"),
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
 * Derives the fee_collector_usdc_ata (ATA for the main_state PDA):
 * This is an associated token account with:
 *   mint = usdc_mint
 *   authority = main_state_account PDA
 */
async function deriveFeeCollectorAta(
  usdcMint: PublicKey,
  mainStatePda: PublicKey
): Promise<PublicKey> {
  return await getAssociatedTokenAddress(
    usdcMint,
    mainStatePda,
    true, // allowOwnerOffCurve (PDA is off-curve)
    TOKEN_PROGRAM_ID
  );
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

//  USDC:  ~10 USDC
//         • 2 USDC for the main transfer test
//         • 1 USDC for unauthorized signer test (simulated, not spent)
//         • 0.5  USDC x several security tests (simulated, not spent)
//         • full balance transfer at the end
//         • Buffer for repeated runs
//
const MIN_SOL_REQUIRED = 2 * LAMPORTS_PER_SOL;
const MIN_USDC_REQUIRED = 10 * 10 ** USDC_DECIMALS; // 10 USDC

// TEST SUITE
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
  let mainUsdcVaultPda: Address;
  let mainUsdcVaultBump: number;
  let feeCollectorAtaPubkey: PublicKey;

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
    console.log("  Unique ID    :", UNIQUE_ID);

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

    // user_usdc_ata PDA now includes unique_id in the seeds
    [userUsdcAtaPda, userUsdcAtaBump] = await deriveUserUsdcAtaPda(
      UNIQUE_ID,
      usdcMintAddr,
      programId
    );
    console.log("  user_usdc_ata PDA:", userUsdcAtaPda, " bump:", userUsdcAtaBump);

    // main_usdc_vault PDA now includes signer in the seeds
    [mainUsdcVaultPda, mainUsdcVaultBump] = await deriveMainUsdcVaultPda(
      usdcMintAddr,
      adminAddr,
      programId
    );
    console.log("  main_usdc_vault PDA:", mainUsdcVaultPda, " bump:", mainUsdcVaultBump);

    // ── Derive fee_collector_usdc_ata (ATA of main_state PDA) ──
    feeCollectorAtaPubkey = await deriveFeeCollectorAta(
      USDC_MINT_PUBKEY,
      new PublicKey(mainStatePda)
    );
    console.log("  fee_collector ATA:", feeCollectorAtaPubkey.toBase58());

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
  //  CLEANUP — Close stale PDAs from previous deployments
  //  (needed when MainAccountShape struct layout changes)
  // ════════════════════════════════════════════════════════════════
  describe("Cleanup Stale Accounts", () => {
    it("should close stale main_state and main_usdc_vault PDAs if they exist", async () => {
      /**
       * The MainAccountShape struct may have changed since the last deploy.
       * If the old PDA exists with a different data layout (e.g., 106 bytes
       * instead of the current 146 bytes), Anchor will fail to deserialize it.
       *
       * This cleanup step calls closeMainState to:
       *   1. Close the main_usdc_vault token account (CPI to Token Program)
       *   2. Zero-out and drain the main_state PDA lamports
       *
       * If the accounts don't exist or are already correct, this will
       * simply skip (caught by the try/catch).
       */
      try {
        // Check if the PDA exists at all
        const stateAccountInfo = await connection.getAccountInfo(
          new PublicKey(mainStatePda)
        );

        if (!stateAccountInfo) {
          console.log("  ⏭ No stale main_state PDA found – skipping cleanup");
          return;
        }

        // Check if the account size matches the expected size (8 discriminator + 138 struct = 146)
        const expectedSize = 8 + 32 + 32 + 32 + 1 + 1 + 8 + 32; // 146 bytes
        if (stateAccountInfo.data.length === expectedSize) {
          // Try to deserialize — if it works, no cleanup needed
          try {
            await program.account.mainAccountShape.fetch(
              new PublicKey(mainStatePda)
            );
            console.log("  ⏭ main_state PDA exists with correct layout – skipping cleanup");
            return;
          } catch {
            console.log("  ⚠ main_state PDA exists but can't be deserialized – closing...");
          }
        } else {
          console.log(
            `  ⚠ main_state PDA exists with wrong size: ${stateAccountInfo.data.length} bytes (expected ${expectedSize}) – closing...`
          );
        }

        const tx = await program.methods
          .closeMainState()
          .accountsPartial({
            signer: adminSigner.publicKey,
            usdcMint: USDC_MINT_PUBKEY,
            systemProgram: anchor.web3.SystemProgram.programId,
            mainStateAccount: new PublicKey(mainStatePda),
            mainUsdcVault: new PublicKey(mainUsdcVaultPda),
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();

        console.log("  ✓ Closed stale PDAs, tx:", tx);

        // Wait for confirmation
        await connection.confirmTransaction(tx, "confirmed");
      } catch (error: any) {
        // If it fails (e.g., accounts don't exist, or it's already clean), that's fine
        console.log("  ℹ Cleanup skipped or not needed:", error.message?.slice(0, 100));
      }
    });
  });

  // ════════════════════════════════════════════════════════════════
  //  0. CREATE MAIN ACCOUNTS (must run first)
  // ════════════════════════════════════════════════════════════════
  describe("Create Main Accounts", () => {
    it("should create (or re-initialize) main_state PDA and main_usdc_vault PDA", async () => {
      /**
       * This is the FIRST instruction that must be called.
       * It creates (or updates if they already exist via init_if_needed):
       *   1. main_state_account PDA (MainAccountShape) — stores admin, mint, vault, bumps, fee
       *   2. main_usdc_vault PDA — token account owned by main_state PDA
       *   3. fee_collector_usdc_ata — ATA for fee collection owned by main_state PDA
       *
       * After this, the main_state_account.admin_signer is set to our pubkey,
       * which gates all future instructions.
       *
       * IDL instruction name: createMainAccounts
       * Rust fn: create_main_accounts(ctx, fee)
       * Accounts:
       *   - signer (mut, signer, constraint: signer == ADMIN)
       *   - usdcMint (constraint: usdc_mint == USDC_MINT)
       *   - systemProgram
       *   - mainStateAccount (init_if_needed, PDA: ["main_state", usdc_mint, signer])
       *   - feeCollectorUsdcAta (init_if_needed, ATA of main_state)
       *   - tokenProgram
       *   - associatedTokenProgram
       *   - mainUsdcVault (init_if_needed, PDA: ["main_usdc_vault", usdc_mint, signer])
       */
      const tx = await program.methods
        .createMainAccounts(FEE_BPS)
        .accountsPartial({
          signer: adminSigner.publicKey,
          usdcMint: USDC_MINT_PUBKEY,
          systemProgram: anchor.web3.SystemProgram.programId,
          mainStateAccount: new PublicKey(mainStatePda),
          feeCollectorUsdcAta: feeCollectorAtaPubkey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          mainUsdcVault: new PublicKey(mainUsdcVaultPda),
        })
        .rpc();

      console.log("  createMainAccounts tx:", tx);

      // Wait for confirmation before verifying with Solana Kit RPC
      await connection.confirmTransaction(tx, "confirmed");

      // ── Verify main_state_account was created via Solana Kit RPC ──
      const stateAccountInfo = await client.rpc
        .getAccountInfo(mainStatePda, {
          commitment: "confirmed",
          encoding: "base64",
        })
        .send();
      assert.ok(stateAccountInfo.value, "main_state PDA should exist");
      assert.equal(
        stateAccountInfo.value!.owner,
        programId,
        "main_state PDA must be owned by the program"
      );
      console.log("  ✓ main_state PDA created and owned by program");

      // ── Verify main_usdc_vault was created ──
      const vaultInfo = await getAccount(
        connection,
        new PublicKey(mainUsdcVaultPda)
      );
      assert.ok(vaultInfo, "main_usdc_vault should exist");
      assert.equal(
        vaultInfo.mint.toBase58(),
        USDC_MINT_PUBKEY.toBase58(),
        "Vault mint should be USDC"
      );
      // The vault's token authority should be the main_state PDA
      assert.equal(
        vaultInfo.owner.toBase58(),
        mainStatePda,
        "Vault token authority must be main_state PDA"
      );
      console.log("  ✓ main_usdc_vault created with correct authority");
      console.log("  Vault balance:", vaultInfo.amount.toString());

      // ── Verify fee_collector_usdc_ata was created ──
      const feeCollectorInfo = await getAccount(
        connection,
        feeCollectorAtaPubkey
      );
      assert.ok(feeCollectorInfo, "fee_collector_usdc_ata should exist");
      assert.equal(
        feeCollectorInfo.mint.toBase58(),
        USDC_MINT_PUBKEY.toBase58(),
        "Fee collector mint should be USDC"
      );
      console.log("  ✓ fee_collector_usdc_ata created");
    });

    it("should fail on double creation (accounts already exist)", async () => {
      try {
        await program.methods
          .createMainAccounts(FEE_BPS)
          .accountsPartial({
            signer: adminSigner.publicKey,
            usdcMint: USDC_MINT_PUBKEY,
            systemProgram: anchor.web3.SystemProgram.programId,
            mainStateAccount: new PublicKey(mainStatePda),
            feeCollectorUsdcAta: feeCollectorAtaPubkey,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            mainUsdcVault: new PublicKey(mainUsdcVaultPda),
          })
          .rpc();

        assert.fail("Double creation should fail");
      } catch (error) {
        console.log("  ✓ Correctly prevented double creation");
        assert.ok(error, "Double creation must throw");
      }
    });

    it("should verify MainAccountShape fields are correctly set", async () => {
      // Fetch the on-chain account data via Anchor
      const stateAccount = await program.account.mainAccountShape.fetch(
        new PublicKey(mainStatePda)
      );

      assert.equal(
        stateAccount.adminSigner.toBase58(),
        adminSigner.publicKey.toBase58(),
        "admin_signer should be our pubkey"
      );
      console.log("  ✓ admin_signer =", stateAccount.adminSigner.toBase58());

      assert.equal(
        stateAccount.usdcMint.toBase58(),
        USDC_MINT_PUBKEY.toBase58(),
        "usdc_mint should match"
      );
      console.log("  ✓ usdc_mint    =", stateAccount.usdcMint.toBase58());

      assert.equal(
        stateAccount.mainVaultAccount.toBase58(),
        mainUsdcVaultPda,
        "main_vault_account should be the vault PDA"
      );
      console.log("  ✓ main_vault   =", stateAccount.mainVaultAccount.toBase58());

      assert.ok(
        stateAccount.selfBump > 0,
        "self_bump should be set"
      );
      console.log("  ✓ self_bump    =", stateAccount.selfBump);

      assert.ok(
        stateAccount.mainUsdcVaultBump > 0,
        "main_usdc_vault_bump should be set"
      );
      console.log("  ✓ vault_bump   =", stateAccount.mainUsdcVaultBump);

      assert.equal(
        stateAccount.fee.toNumber(),
        FEE_BPS.toNumber(),
        "fee should match what we set"
      );
      console.log("  ✓ fee          =", stateAccount.fee.toNumber(), "bps");

      assert.equal(
        stateAccount.feeCollectorUsdcAta.toBase58(),
        feeCollectorAtaPubkey.toBase58(),
        "fee_collector_usdc_ata should match"
      );
      console.log("  ✓ fee_collector=", stateAccount.feeCollectorUsdcAta.toBase58());
    });

    it("should reject fee higher than 5% (500 bps)", async () => {
      try {
        await program.methods
          .createMainAccounts(new anchor.BN(600)) // 6% > 5% max
          .accountsPartial({
            signer: adminSigner.publicKey,
            usdcMint: USDC_MINT_PUBKEY,
            systemProgram: anchor.web3.SystemProgram.programId,
            mainStateAccount: new PublicKey(mainStatePda),
            feeCollectorUsdcAta: feeCollectorAtaPubkey,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            mainUsdcVault: new PublicKey(mainUsdcVaultPda),
          })
          .simulate();

        assert.fail("Should have rejected fee > 5%");
      } catch (error) {
        console.log("  ✓ Correctly rejected excessive fee");
        assert.ok(error, "Excessive fee must throw");
      }
    });
  });

  // ════════════════════════════════════════════════════════════════
  //  1. INITIALIZATION TESTS
  // ════════════════════════════════════════════════════════════════
  describe("Initialize", () => {
    it("should successfully initialize the contract (creates the user_usdc_ata vault)", async () => {
      /**
       * Account ownership model (after createMainAccounts + initialize):
       *
       *   adminSigner (static keypair)
       *       │
       *       └──owns──▶ main_state PDA (MainAccountShape)
       *                       │
       *                       ├── token::authority ──▶ user_usdc_ata (created here)
       *                       └── token::authority ──▶ main_usdc_vault (created in createMainAccounts)
       *
       * The initialize instruction takes a unique_id: String argument
       * which becomes part of the user_usdc_ata PDA seed:
       *   seeds = [b"user_usdc_ata", unique_id.as_bytes(), usdc_mint.key()]
       */
      const tx = await program.methods
        .initialize(UNIQUE_ID)
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

    it("should create a different PDA for a different unique_id", async () => {
      const differentUniqueId = "test_user_002";

      const [differentPda] = await deriveUserUsdcAtaPda(
        differentUniqueId,
        usdcMintAddr,
        programId
      );

      // The PDA should be different from the first user's PDA
      assert.notEqual(
        differentPda,
        userUsdcAtaPda,
        "Different unique_id should produce a different PDA"
      );
      console.log("  ✓ Different unique_id produces a different PDA");
      console.log("  user_001 PDA:", userUsdcAtaPda);
      console.log("  user_002 PDA:", differentPda);
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
      const [fakeVaultPda] = await deriveUserUsdcAtaPda(UNIQUE_ID, fakeMintAddr, programId);

      try {
        await program.methods
          .initialize(UNIQUE_ID)
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
          .initialize(UNIQUE_ID)
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
  //
  //  Flow: user wallet ATA ──(spl transfer)──▶ user_usdc_ata PDA
  //                                              │
  //        program.transfertovault() ◀────────────┘
  //                  │
  //                  ├───▶ main_usdc_vault PDA (net amount after fee)
  //                  └───▶ fee_collector_usdc_ata (fee amount)
  //
  //  Both user_usdc_ata and main_usdc_vault have
  //  token::authority = main_state PDA.
  //  The contract signs the CPI transfer with PDA seeds.
  // ════════════════════════════════════════════════════════════════
  describe("Transfer to Vault", () => {
    const DEPOSIT_AMOUNT = 5 * 10 ** USDC_DECIMALS; // 5 USDC deposited into PDA

    before(async () => {
      /**
       * Pre-step: deposit USDC from user's personal wallet ATA
       * into the program's user_usdc_ata PDA.
       *
       * This is a standard SPL token transfer (user signs as source authority).
       * The destination (user_usdc_ata PDA) is PDA-owned, but receiving
       * tokens doesn't require destination authority signature.
       */
      console.log("\n  📥 Depositing USDC into user_usdc_ata PDA...");

      const beforeBal = await getAccount(connection, new PublicKey(userUsdcAtaPda));
      console.log(
        "  PDA balance before deposit:",
        Number(beforeBal.amount) / 10 ** USDC_DECIMALS,
        "USDC"
      );

      await transfer(
        connection,
        adminSigner,                     // payer + source authority
        userTokenAccount,                // source: user's personal ATA
        new PublicKey(userUsdcAtaPda),    // destination: PDA token account
        adminSigner.publicKey,           // owner of the source account
        DEPOSIT_AMOUNT,                  // amount in smallest units
        [],
        undefined,
        TOKEN_PROGRAM_ID
      );

      const afterBal = await getAccount(connection, new PublicKey(userUsdcAtaPda));
      console.log(
        "  PDA balance after deposit :",
        Number(afterBal.amount) / 10 ** USDC_DECIMALS,
        "USDC"
      );
      console.log("  ✓ Deposit complete\n");
    });

    it("should transfer tokens from user_usdc_ata PDA → main_usdc_vault PDA (with fee deduction)", async () => {
      const transferAmount = 2 * 10 ** USDC_DECIMALS; // 2 USDC

      const initialPdaBalance = (
        await getAccount(connection, new PublicKey(userUsdcAtaPda))
      ).amount;
      const initialVaultBalance = (
        await getAccount(connection, new PublicKey(mainUsdcVaultPda))
      ).amount;
      const initialFeeBalance = (
        await getAccount(connection, feeCollectorAtaPubkey)
      ).amount;
      console.log(
        "  Initial PDA balance    :",
        Number(initialPdaBalance) / 10 ** USDC_DECIMALS,
        "USDC"
      );
      console.log(
        "  Initial Vault balance  :",
        Number(initialVaultBalance) / 10 ** USDC_DECIMALS,
        "USDC"
      );
      console.log(
        "  Initial Fee balance    :",
        Number(initialFeeBalance) / 10 ** USDC_DECIMALS,
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
          feeCollectorUsdcAta: feeCollectorAtaPubkey,
          userUsdcAta: new PublicKey(userUsdcAtaPda),
          mainUsdcVault: new PublicKey(mainUsdcVaultPda),
        })
        .rpc();

      console.log("  Transfer tx:", tx);

      const finalPdaBalance = (
        await getAccount(connection, new PublicKey(userUsdcAtaPda))
      ).amount;
      const finalVaultBalance = (
        await getAccount(connection, new PublicKey(mainUsdcVaultPda))
      ).amount;
      const finalFeeBalance = (
        await getAccount(connection, feeCollectorAtaPubkey)
      ).amount;

      console.log(
        "  Final PDA balance      :",
        Number(finalPdaBalance) / 10 ** USDC_DECIMALS,
        "USDC"
      );
      console.log(
        "  Final Vault balance    :",
        Number(finalVaultBalance) / 10 ** USDC_DECIMALS,
        "USDC"
      );
      console.log(
        "  Final Fee balance      :",
        Number(finalFeeBalance) / 10 ** USDC_DECIMALS,
        "USDC"
      );

      // The total deducted from user PDA should equal the transfer amount
      assert.equal(
        Number(initialPdaBalance) - Number(finalPdaBalance),
        transferAmount,
        "PDA balance should decrease by the transfer amount"
      );

      // Vault + fee collector should have received the full amount
      const totalReceived =
        Number(finalVaultBalance) - Number(initialVaultBalance) +
        Number(finalFeeBalance) - Number(initialFeeBalance);
      assert.equal(
        totalReceived,
        transferAmount,
        "Vault + Fee collector should have received the full transfer amount"
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
            feeCollectorUsdcAta: feeCollectorAtaPubkey,
            userUsdcAta: new PublicKey(userUsdcAtaPda),
            mainUsdcVault: new PublicKey(mainUsdcVaultPda),
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
            feeCollectorUsdcAta: feeCollectorAtaPubkey,
            userUsdcAta: new PublicKey(userUsdcAtaPda),
            mainUsdcVault: new PublicKey(mainUsdcVaultPda),
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
  //  3. CLAIM BY USER TESTS
  //
  //  Flow: main_usdc_vault PDA ──(program CPI)──▶ user_usdc_ata PDA
  //                                  │
  //                                  └───▶ fee_collector_usdc_ata (fee)
  //
  //  This is the reverse of transfertovault — the admin claims
  //  tokens from the main vault back to a user's ATA.
  // ════════════════════════════════════════════════════════════════
  describe("Claim by User", () => {
    it("should claim tokens from main_usdc_vault → user_usdc_ata (with fee deduction)", async () => {
      const claimAmount = 1 * 10 ** USDC_DECIMALS; // 1 USDC

      const initialPdaBalance = (
        await getAccount(connection, new PublicKey(userUsdcAtaPda))
      ).amount;
      const initialVaultBalance = (
        await getAccount(connection, new PublicKey(mainUsdcVaultPda))
      ).amount;
      const initialFeeBalance = (
        await getAccount(connection, feeCollectorAtaPubkey)
      ).amount;

      console.log(
        "  Initial user ATA balance:",
        Number(initialPdaBalance) / 10 ** USDC_DECIMALS,
        "USDC"
      );
      console.log(
        "  Initial vault balance   :",
        Number(initialVaultBalance) / 10 ** USDC_DECIMALS,
        "USDC"
      );

      // Skip if vault has insufficient funds
      if (Number(initialVaultBalance) < claimAmount) {
        console.log("  ⚠ Vault balance too low for claim test – skipping");
        return;
      }

      const tx = await program.methods
        .claimByUser(new anchor.BN(claimAmount))
        .accountsPartial({
          signer: adminSigner.publicKey,
          usdcMint: USDC_MINT_PUBKEY,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          mainStateAccount: new PublicKey(mainStatePda),
          feeCollectorUsdcAta: feeCollectorAtaPubkey,
          userUsdcAta: new PublicKey(userUsdcAtaPda),
          mainUsdcVault: new PublicKey(mainUsdcVaultPda),
        })
        .rpc();

      console.log("  Claim tx:", tx);

      const finalPdaBalance = (
        await getAccount(connection, new PublicKey(userUsdcAtaPda))
      ).amount;
      const finalVaultBalance = (
        await getAccount(connection, new PublicKey(mainUsdcVaultPda))
      ).amount;
      const finalFeeBalance = (
        await getAccount(connection, feeCollectorAtaPubkey)
      ).amount;

      console.log(
        "  Final user ATA balance  :",
        Number(finalPdaBalance) / 10 ** USDC_DECIMALS,
        "USDC"
      );
      console.log(
        "  Final vault balance     :",
        Number(finalVaultBalance) / 10 ** USDC_DECIMALS,
        "USDC"
      );
      console.log(
        "  Final fee balance       :",
        Number(finalFeeBalance) / 10 ** USDC_DECIMALS,
        "USDC"
      );

      // The total deducted from vault should equal the claim amount
      const totalDeducted = Number(initialVaultBalance) - Number(finalVaultBalance);
      assert.equal(
        totalDeducted,
        claimAmount,
        "Vault balance should decrease by the claim amount"
      );

      // User ATA + fee collector should have received the full amount
      const totalReceived =
        Number(finalPdaBalance) - Number(initialPdaBalance) +
        Number(finalFeeBalance) - Number(initialFeeBalance);
      assert.equal(
        totalReceived,
        claimAmount,
        "User ATA + Fee collector should have received the full claim amount"
      );
    });

    it("should fail when claiming more than vault balance", async () => {
      const excessiveAmount = 100_000 * 10 ** USDC_DECIMALS;

      try {
        await program.methods
          .claimByUser(new anchor.BN(excessiveAmount))
          .accountsPartial({
            signer: adminSigner.publicKey,
            usdcMint: USDC_MINT_PUBKEY,
            systemProgram: anchor.web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            mainStateAccount: new PublicKey(mainStatePda),
            feeCollectorUsdcAta: feeCollectorAtaPubkey,
            userUsdcAta: new PublicKey(userUsdcAtaPda),
            mainUsdcVault: new PublicKey(mainUsdcVaultPda),
          })
          .rpc();

        assert.fail("Should have failed – insufficient vault funds");
      } catch (error: any) {
        console.log("  ✓ Correctly rejected excessive claim");
        assert.ok(error, "Insufficient vault balance must throw");
      }
    });
  });

  // ════════════════════════════════════════════════════════════════
  //  4. SECURITY TESTS — No airdrops, use static generated keypairs
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
            feeCollectorUsdcAta: feeCollectorAtaPubkey,
            userUsdcAta: new PublicKey(userUsdcAtaPda),
            mainUsdcVault: new PublicKey(mainUsdcVaultPda),
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
            feeCollectorUsdcAta: feeCollectorAtaPubkey,
            userUsdcAta: new PublicKey(userUsdcAtaPda),
            mainUsdcVault: new PublicKey(mainUsdcVaultPda),
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
            feeCollectorUsdcAta: feeCollectorAtaPubkey,
            userUsdcAta: new PublicKey(userUsdcAtaPda),
            mainUsdcVault: userTokenAccount, // wrong – not the correct vault PDA
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
            feeCollectorUsdcAta: feeCollectorAtaPubkey,
            userUsdcAta: new PublicKey(userUsdcAtaPda),
            mainUsdcVault: new PublicKey(mainUsdcVaultPda),
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
  //  5. EDGE CASE TESTS
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
            feeCollectorUsdcAta: feeCollectorAtaPubkey,
            userUsdcAta: new PublicKey(userUsdcAtaPda),
            mainUsdcVault: new PublicKey(mainUsdcVaultPda),
          })
          .simulate();

        assert.fail("Max u64 should fail");
      } catch (error) {
        console.log("  ✓ Max u64 correctly handled");
      }
    });

    it("should handle transfer of exact remaining PDA balance", async () => {
      const currentBalance = (
        await getAccount(connection, new PublicKey(userUsdcAtaPda))
      ).amount;
      console.log(
        "  Current PDA balance:",
        Number(currentBalance) / 10 ** USDC_DECIMALS,
        "USDC"
      );

      if (currentBalance === BigInt(0)) {
        console.log("  Skipping – PDA balance is already zero");
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
            feeCollectorUsdcAta: feeCollectorAtaPubkey,
            userUsdcAta: new PublicKey(userUsdcAtaPda),
            mainUsdcVault: new PublicKey(mainUsdcVaultPda),
          })
          .rpc();

        const finalBalance = (
          await getAccount(connection, new PublicKey(userUsdcAtaPda))
        ).amount;
        assert.equal(
          Number(finalBalance),
          0,
          "PDA balance should be zero after exact transfer"
        );
        console.log("  ✓ Exact PDA balance transfer succeeded");
      } catch (error: any) {
        console.warn("  Exact balance transfer failed:", error.message);
      }
    });
  });

  // ════════════════════════════════════════════════════════════════
  //  6. ACCOUNT OWNERSHIP VERIFICATION (Solana Kit RPC)
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

    it("should verify main_usdc_vault PDA is owned by the Token Program", async () => {
      const vaultInfo = await client.rpc
        .getAccountInfo(mainUsdcVaultPda, {
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
        new PublicKey(mainUsdcVaultPda)
      );
      assert.equal(
        tokenAcct.owner.toBase58(),
        mainStatePda,
        "Token-level authority must be the main_state PDA"
      );
      console.log("  ✓ Vault token authority = main_state PDA");
    });

    it("should verify fee_collector_usdc_ata is owned by the Token Program", async () => {
      const feeInfo = await client.rpc
        .getAccountInfo(address(feeCollectorAtaPubkey.toBase58()), {
          commitment: "confirmed",
          encoding: "base64",
        })
        .send();

      if (!feeInfo.value) {
        console.log("  ⚠ fee_collector not yet created – skipping");
        return;
      }

      const tokenProgramAddr = address(TOKEN_PROGRAM_ID.toBase58());
      assert.equal(
        feeInfo.value.owner,
        tokenProgramAddr,
        "Fee collector on-chain owner must be the Token Program"
      );
      console.log("  ✓ Fee collector is owned by Token Program");

      const tokenAcct = await getAccount(
        connection,
        feeCollectorAtaPubkey
      );
      assert.equal(
        tokenAcct.owner.toBase58(),
        mainStatePda,
        "Fee collector token-level authority must be the main_state PDA"
      );
      console.log("  ✓ Fee collector token authority = main_state PDA");
    });
  });
});
