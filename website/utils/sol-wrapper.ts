import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createSyncNativeInstruction, createCloseAccountInstruction, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, NATIVE_MINT } from '@solana/spl-token';
import { AnchorProvider } from '@coral-xyz/anchor';

// Wrapped SOL mint address (same on all networks)
export const WRAPPED_SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

/**
 * Wrap SOL to Wrapped SOL (wSOL)
 * @param provider - Anchor provider
 * @param amount - Amount of SOL to wrap (in lamports)
 * @returns Transaction that wraps SOL
 */
export async function createWrapSolTransaction(
  provider: AnchorProvider,
  amount: number
): Promise<Transaction> {
  const wallet = provider.wallet.publicKey;
  
  // Get or create associated token account for wSOL
  const wsolTokenAccount = await getAssociatedTokenAddress(
    WRAPPED_SOL_MINT,
    wallet,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const transaction = new Transaction();
  
  // 获取最新的 blockhash
  const { blockhash, lastValidBlockHeight } = await provider.connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = wallet;

  // Check if wSOL token account exists
  const accountInfo = await provider.connection.getAccountInfo(wsolTokenAccount);
  
  if (!accountInfo) {
    // Create associated token account for wSOL
    transaction.add(
      createAssociatedTokenAccountInstruction(
        wallet, // payer
        wsolTokenAccount, // token account
        wallet, // owner
        WRAPPED_SOL_MINT, // mint
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  // Transfer SOL to the wSOL token account
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: wallet,
      toPubkey: wsolTokenAccount,
      lamports: amount,
    })
  );

  // Sync the native account to update its balance
  transaction.add(
    createSyncNativeInstruction(
      wsolTokenAccount,
      TOKEN_PROGRAM_ID
    )
  );

  return transaction;
}

/**
 * Unwrap Wrapped SOL (wSOL) back to SOL
 * @param provider - Anchor provider
 * @returns Transaction that unwraps all wSOL
 */
export async function createUnwrapSolTransaction(
  provider: AnchorProvider
): Promise<Transaction> {
  const wallet = provider.wallet.publicKey;
  
  // Get associated token account for wSOL
  const wsolTokenAccount = await getAssociatedTokenAddress(
    WRAPPED_SOL_MINT,
    wallet,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const transaction = new Transaction();

  // Close the wSOL token account to get SOL back
  transaction.add(
    createCloseAccountInstruction(
      wsolTokenAccount, // account to close
      wallet, // destination for rent
      wallet, // owner
      [],
      TOKEN_PROGRAM_ID
    )
  );

  return transaction;
}

/**
 * Get the balance of Wrapped SOL for a wallet
 * @param connection - Solana connection
 * @param wallet - Wallet public key
 * @returns Balance in lamports
 */
export async function getWrappedSolBalance(
  connection: Connection,
  wallet: PublicKey
): Promise<number> {
  try {
    const wsolTokenAccount = await getAssociatedTokenAddress(
      WRAPPED_SOL_MINT,
      wallet,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const accountInfo = await connection.getAccountInfo(wsolTokenAccount);
    
    if (!accountInfo) {
      return 0;
    }

    // Parse token account data to get balance
    const tokenAccountInfo = await connection.getTokenAccountBalance(wsolTokenAccount);
    return parseInt(tokenAccountInfo.value.amount);
  } catch (error) {
    console.error('Error getting wrapped SOL balance:', error);
    return 0;
  }
}

/**
 * Check if user has enough SOL to wrap
 * @param connection - Solana connection
 * @param wallet - Wallet public key
 * @param amount - Amount to check (in lamports)
 * @param buffer - Additional buffer for transaction fees (default 0.01 SOL)
 * @returns true if user has enough SOL
 */
export async function hasEnoughSolToWrap(
  connection: Connection,
  wallet: PublicKey,
  amount: number,
  buffer: number = 0.01 * LAMPORTS_PER_SOL
): Promise<boolean> {
  const balance = await connection.getBalance(wallet);
  return balance >= amount + buffer;
}

/**
 * Estimate the transaction fee for wrapping SOL
 * @param connection - Solana connection
 * @returns Estimated fee in lamports
 */
export async function estimateWrapFee(connection: Connection): Promise<number> {
  // Typical transaction fee + rent for new account if needed
  const rentExemption = await connection.getMinimumBalanceForRentExemption(165); // Token account size
  const transactionFee = 5000; // Estimated transaction fee
  return rentExemption + transactionFee;
}