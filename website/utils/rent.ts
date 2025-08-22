import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";

// Listing account size: 8 + 32 + 32 + 32 + 8 + 8 + 8 + 1 = 129 bytes
// 8 (discriminator) + 32 (seller) + 32 (sell_mint) + 32 (buy_mint) + 8 (price_per_token) 
// + 8 (amount) + 8 (listing_id) + 1 (bump)
const LISTING_ACCOUNT_SIZE = 129;

// Token account size for SPL tokens
const TOKEN_ACCOUNT_SIZE = 165;

export async function getListingRentCost(connection: Connection): Promise<number> {
  try {
    const rentExemption = await connection.getMinimumBalanceForRentExemption(LISTING_ACCOUNT_SIZE);
    return rentExemption / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error("Failed to get rent cost:", error);
    // Default fallback based on test results
    return 0.00179568;
  }
}

export async function getTokenAccountRentCost(connection: Connection): Promise<number> {
  try {
    const rentExemption = await connection.getMinimumBalanceForRentExemption(TOKEN_ACCOUNT_SIZE);
    return rentExemption / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error("Failed to get token account rent cost:", error);
    // Default fallback for token account based on test results
    return 0.00203928;
  }
}

// 总租金成本（创建卖单时支付，取消时返还）
// 注意：实际返还金额取决于是否创建了 escrow token 账户
export async function getTotalRentCost(connection: Connection, includesTokenAccount: boolean = true): Promise<number> {
  try {
    const listingRent = await getListingRentCost(connection);
    if (!includesTokenAccount) {
      return listingRent;
    }
    const tokenAccountRent = await getTokenAccountRentCost(connection);
    return listingRent + tokenAccountRent;
  } catch (error) {
    console.error("Failed to calculate total rent cost:", error);
    // Default fallback based on whether token account is included
    return includesTokenAccount ? 0.003828 : 0.00179568;
  }
}

// 为了兼容性，保留原名称作为别名
export const getTotalRentRefund = getTotalRentCost;

export function formatSOL(lamports: number): string {
  return (lamports / LAMPORTS_PER_SOL).toFixed(6);
}