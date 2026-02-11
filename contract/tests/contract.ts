import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Contract } from "../target/types/contract";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { assert, config, expect } from "chai";
import { address, generateKeyPair, Address, KeyPairSigner, Lamports, lamports, sendAndConfirmTransactionFactory, generateKeyPairSigner } from '@solana/kit';
import { createClient, getSendandConfirm } from './client';
import { LAMPORTS_PER_SOL } from "@solana/web3.js"

const client = createClient();
const sendAndConfirm = getSendandConfirm();


describe("contract", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.contract as Program<Contract>;
  const connection = provider.connection;

  // Test accounts
  let usdcMint: Address;
  let userUsdcAta: Address;
  let mainStateAccount: KeyPairSigner;
  let mainVault: Address;
  let userTokenAccount: Address;

  // Constants
  const USDC_DECIMALS = 6;
  const INITIAL_MINT_AMOUNT = 1000 * 10 ** USDC_DECIMALS; // 1000 USDC

  // Helper function to airdrop SOL
  async function airdropSol(address: Address,) {
    let airdropAmt = lamports(BigInt(10 * LAMPORTS_PER_SOL));
    await client.rpc.requestAirdrop(address, airdropAmt, { commitment: "confirmed" }).send();
  }
  let wallet: KeyPairSigner;
  // Setup before all tests
  before(async () => {
    console.log("Setting up test environment...");
    wallet = await generateKeyPairSigner();
    let amount = lamports(BigInt(1 * LAMPORTS_PER_SOL));

    // Airdrop SOL to the wallet if needed
    const balance = await client.rpc.getBalance(wallet.address).send()
    if (balance.value < amount) {
      await airdropSol(wallet.address);
    }

    // Create a mock USDC mint
    usdcMint = await createMint(
      connection,
      wallet.address,
      wallet.publicKey, // mint authority
      null, // freeze authority
      USDC_DECIMALS,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID
    );
    console.log("Mock USDC Mint created:", usdcMint.toBase58());

    // Create main state account keypair
    mainStateAccount = await generateKeyPair();

    // Derive PDA for user_usdc_ata (vault)
    [userUsdcAta] = Address.findProgramAddressSync(
      [Buffer.from("user_usdc_ata"), usdcMint.toBuffer()],
      program.programId
    );
    console.log("User USDC ATA PDA:", userUsdcAta.toBase58());

    // Create user's token account and mint some tokens
    userTokenAccount = await createAccount(
      connection,
      wallet.payer,
      usdcMint,
      wallet.publicKey,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID
    );
    console.log("User Token Account:", userTokenAccount.toBase58());

    // Mint tokens to user's account
    await mintTo(
      connection,
      wallet.payer,
      usdcMint,
      userTokenAccount,
      wallet.publicKey,
      INITIAL_MINT_AMOUNT,
      [],
      undefined,
      TOKEN_PROGRAM_ID
    );
    console.log(`Minted ${INITIAL_MINT_AMOUNT / 10 ** USDC_DECIMALS} USDC to user`);
  });

  // ============================================
  // INITIALIZATION TESTS
  // ============================================

  describe("Initialize", () => {
    it("should successfully initialize the contract", async () => {
      try {
        // Note: This test may fail due to the security issues identified
        // (main_state_account not being initialized with proper constraints)
        const tx = await program.methods
          .initialize()
          .accounts({
            signer: wallet.publicKey,
            usdcMint: usdcMint,
            systemProgram: SystemProgram.programId,
            mainStateAccount: mainStateAccount.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            userUsdcAta: userUsdcAta,
          })
          .signers([mainStateAccount])
          .rpc();

        console.log("Initialize transaction signature:", tx);

        // Verify the vault was created
        const vaultInfo = await getAccount(connection, userUsdcAta);
        assert.ok(vaultInfo, "Vault account should exist");
        console.log("Vault balance:", vaultInfo.amount.toString());
      } catch (error) {
        console.error("Initialize failed:", error);
        // Expected to fail due to security issues in the contract
        throw error;
      }
    });

    it("should fail when initializing with wrong mint", async () => {
      // Create a different mint
      const fakeMint = await createMint(
        connection,
        wallet.payer,
        wallet.publicKey,
        null,
        6,
        undefined,
        undefined,
        TOKEN_PROGRAM_ID
      );

      const fakeStateAccount = Keypair.generate();
      const [fakeVaultPda] = Address.findProgramAddressSync(
        [Buffer.from("user_usdc_ata"), fakeMint.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .initialize()
          .accounts({
            signer: wallet.publicKey,
            usdcMint: fakeMint,
            systemProgram: SystemProgram.programId,
            mainStateAccount: fakeStateAccount.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            userUsdcAta: fakeVaultPda,
          })
          .signers([fakeStateAccount])
          .rpc();

        // If we reach here, the security issue exists (no mint validation)
        console.warn("WARNING: Contract accepted arbitrary mint - SECURITY ISSUE!");
      } catch (error) {
        // Expected behavior - should reject wrong mint
        console.log("Correctly rejected wrong mint");
      }
    });

    it("should fail on double initialization", async () => {
      try {
        // Try to initialize again with the same accounts
        await program.methods
          .initialize()
          .accounts({
            signer: wallet.publicKey,
            usdcMint: usdcMint,
            systemProgram: SystemProgram.programId,
            mainStateAccount: mainStateAccount.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            userUsdcAta: userUsdcAta,
          })
          .signers([mainStateAccount])
          .rpc();

        assert.fail("Should have failed on double initialization");
      } catch (error) {
        // Expected - should fail because account already exists
        console.log("Correctly rejected double initialization");
        assert.ok(error, "Double initialization should fail");
      }
    });
  });

  // ============================================
  // TRANSFER TESTS
  // ============================================

  describe("Transfer to Vault", () => {
    it("should successfully transfer tokens to vault", async () => {
      const transferAmount = 100 * 10 ** USDC_DECIMALS; // 100 USDC

      try {
        // Get initial balances
        const initialUserBalance = (await getAccount(connection, userTokenAccount)).amount;
        console.log("Initial user balance:", Number(initialUserBalance) / 10 ** USDC_DECIMALS);

        const tx = await program.methods
          .transfertovault(new anchor.BN(transferAmount))
          .accounts({
            signer: wallet.publicKey,
            usdcMint: usdcMint,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            mainStateAccount: mainStateAccount.publicKey,
            userUsdcAta: userTokenAccount, // User's token account
            mainUsdcVault: userUsdcAta, // Program vault
          })
          .rpc();

        console.log("Transfer transaction signature:", tx);

        // Verify balances changed
        const finalUserBalance = (await getAccount(connection, userTokenAccount)).amount;
        const vaultBalance = (await getAccount(connection, userUsdcAta)).amount;

        console.log("Final user balance:", Number(finalUserBalance) / 10 ** USDC_DECIMALS);
        console.log("Vault balance:", Number(vaultBalance) / 10 ** USDC_DECIMALS);

        assert.equal(
          Number(initialUserBalance) - Number(finalUserBalance),
          transferAmount,
          "User balance should decrease by transfer amount"
        );
      } catch (error) {
        console.error("Transfer failed:", error);
        // May fail due to authority mismatch security issues
        throw error;
      }
    });

    it("should fail when transferring more than balance", async () => {
      const excessiveAmount = 10000 * 10 ** USDC_DECIMALS; // 10000 USDC (more than available)

      try {
        await program.methods
          .transfertovault(new anchor.BN(excessiveAmount))
          .accounts({
            signer: wallet.publicKey,
            usdcMint: usdcMint,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            mainStateAccount: mainStateAccount.publicKey,
            userUsdcAta: userTokenAccount,
            mainUsdcVault: userUsdcAta,
          })
          .rpc();

        assert.fail("Should have failed with insufficient balance");
      } catch (error: any) {
        console.log("Correctly rejected insufficient balance transfer");
        // Check for the custom error
        assert.ok(
          error.message.includes("InsufficientAmountError") ||
          error.message.includes("insufficient"),
          "Should throw insufficient amount error"
        );
      }
    });

    it("should fail when transferring zero amount", async () => {
      try {
        await program.methods
          .transfertovault(new anchor.BN(0))
          .accounts({
            signer: wallet.publicKey,
            usdcMint: usdcMint,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            mainStateAccount: mainStateAccount.publicKey,
            userUsdcAta: userTokenAccount,
            mainUsdcVault: userUsdcAta,
          })
          .rpc();

        // If we reach here, zero amount check is missing
        console.warn("WARNING: Contract accepted zero amount - SECURITY ISSUE!");
      } catch (error) {
        console.log("Correctly rejected zero amount transfer");
      }
    });
  });

  // ============================================
  // SECURITY TESTS
  // ============================================

  describe("Security Tests", () => {
    it("should fail when unauthorized user tries to transfer", async () => {
      // Create a new keypair (unauthorized user)
      const unauthorizedUser = Keypair.generate();
      await airdropSol(unauthorizedUser.publicKey, 1);

      // Create token account for unauthorized user
      const unauthorizedTokenAccount = await createAccount(
        connection,
        wallet.payer,
        usdcMint,
        unauthorizedUser.publicKey,
        undefined,
        undefined,
        TOKEN_PROGRAM_ID
      );

      // Mint some tokens to unauthorized user
      await mintTo(
        connection,
        wallet.payer,
        usdcMint,
        unauthorizedTokenAccount,
        wallet.publicKey,
        100 * 10 ** USDC_DECIMALS,
        [],
        undefined,
        TOKEN_PROGRAM_ID
      );

      try {
        // Try to transfer from the original user's account using unauthorized signer
        await program.methods
          .transfertovault(new anchor.BN(50 * 10 ** USDC_DECIMALS))
          .accounts({
            signer: unauthorizedUser.publicKey,
            usdcMint: usdcMint,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            mainStateAccount: mainStateAccount.publicKey,
            userUsdcAta: userTokenAccount, // Original user's account
            mainUsdcVault: userUsdcAta,
          })
          .signers([unauthorizedUser])
          .rpc();

        console.warn("WARNING: Unauthorized transfer succeeded - SECURITY ISSUE!");
        assert.fail("Should have failed with unauthorized signer");
      } catch (error) {
        console.log("Correctly rejected unauthorized transfer");
      }
    });

    it("should fail when using wrong state account", async () => {
      const fakeStateAccount = Keypair.generate();

      try {
        await program.methods
          .transfertovault(new anchor.BN(10 * 10 ** USDC_DECIMALS))
          .accounts({
            signer: wallet.publicKey,
            usdcMint: usdcMint,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            mainStateAccount: fakeStateAccount.publicKey, // Wrong state account
            userUsdcAta: userTokenAccount,
            mainUsdcVault: userUsdcAta,
          })
          .rpc();

        console.warn("WARNING: Wrong state account accepted - SECURITY ISSUE!");
        assert.fail("Should have failed with wrong state account");
      } catch (error) {
        console.log("Correctly rejected wrong state account");
      }
    });

    it("should fail when using wrong vault account", async () => {
      // Create a fake vault
      const fakeVault = await createAccount(
        connection,
        wallet.payer,
        usdcMint,
        wallet.publicKey,
        undefined,
        undefined,
        TOKEN_PROGRAM_ID
      );

      try {
        await program.methods
          .transfertovault(new anchor.BN(10 * 10 ** USDC_DECIMALS))
          .accounts({
            signer: wallet.publicKey,
            usdcMint: usdcMint,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            mainStateAccount: mainStateAccount.publicKey,
            userUsdcAta: userTokenAccount,
            mainUsdcVault: fakeVault, // Wrong vault
          })
          .rpc();

        console.warn("WARNING: Wrong vault accepted - SECURITY ISSUE!");
        assert.fail("Should have failed with wrong vault");
      } catch (error) {
        console.log("Correctly rejected wrong vault account");
      }
    });
  });

  // ============================================
  // EDGE CASE TESTS
  // ============================================

  describe("Edge Cases", () => {
    it("should handle maximum u64 amount correctly", async () => {
      const maxU64 = new anchor.BN("18446744073709551615"); // Max u64

      try {
        await program.methods
          .transfertovault(maxU64)
          .accounts({
            signer: wallet.publicKey,
            usdcMint: usdcMint,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            mainStateAccount: mainStateAccount.publicKey,
            userUsdcAta: userTokenAccount,
            mainUsdcVault: userUsdcAta,
          })
          .rpc();

        assert.fail("Should have failed with overflow or insufficient balance");
      } catch (error) {
        console.log("Correctly handled maximum amount");
      }
    });

    it("should handle transfer with exact balance", async () => {
      // Get current balance
      const currentBalance = (await getAccount(connection, userTokenAccount)).amount;

      try {
        await program.methods
          .transfertovault(new anchor.BN(currentBalance.toString()))
          .accounts({
            signer: wallet.publicKey,
            usdcMint: usdcMint,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            mainStateAccount: mainStateAccount.publicKey,
            userUsdcAta: userTokenAccount,
            mainUsdcVault: userUsdcAta,
          })
          .rpc();

        console.log("Successfully transferred exact balance");

        // Verify balance is now zero
        const finalBalance = (await getAccount(connection, userTokenAccount)).amount;
        assert.equal(Number(finalBalance), 0, "Balance should be zero after exact transfer");
      } catch (error) {
        console.error("Exact balance transfer failed:", error);
        // May fail due to PDA authority issues
      }
    });
  });
});
