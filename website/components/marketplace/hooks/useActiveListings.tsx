"use client";

import { useState, useCallback, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Program } from "@coral-xyz/anchor";
import { getMint } from "@solana/spl-token";
import { PuziContracts, IDL } from "@/anchor-idl/idl";
import { useTokenMetadata } from "./useTokenMetadata";

interface ListingInfo {
  address: string;
  seller: string;
  sellMint: string;
  buyMint: string;
  pricePerToken: number;
  amount: number;
  listingId: number;
  isActive: boolean;
  sellTokenName?: string;
  sellTokenSymbol?: string;
  sellTokenDecimals?: number;
  buyTokenName?: string;
  buyTokenSymbol?: string;
  buyTokenDecimals?: number;
}

// 缓存管理
const listingsCache = new Map<string, { data: ListingInfo[]; timestamp: number }>();
const CACHE_DURATION = 30000; // 30秒缓存

export function useActiveListings() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [listings, setListings] = useState<ListingInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getTokenMetadata } = useTokenMetadata();

  const fetchActiveListings = useCallback(async (forceRefresh = false) => {
    if (!connection) {
      setListings([]);
      return;
    }

    const cacheKey = "all_listings";
    const now = Date.now();

    // 检查缓存
    if (!forceRefresh) {
      const cached = listingsCache.get(cacheKey);
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        setListings(cached.data);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      // 创建只读Program实例
      const program = new Program<PuziContracts>(IDL, { connection });

      console.log("获取所有卖单...");

      // 获取所有listing账户
      const allListings = await program.account.listing.all();
      
      console.log(`找到 ${allListings.length} 个卖单账户`);

      const activeListings: ListingInfo[] = [];

      for (const listingAccount of allListings) {
        const listing = listingAccount.account;
        
        // 只显示活跃的卖单
        if (!listing.isActive || listing.amount === 0) {
          continue;
        }

        // 获取代币元数据
        const sellTokenMetadata = getTokenMetadata(listing.sellMint.toBase58()) || {
          name: listing.sellMint.toBase58() === "So11111111111111111111111111111111111111112" 
            ? "Solana" 
            : `Token ${listing.sellMint.toBase58().slice(0, 8)}`,
          symbol: listing.sellMint.toBase58() === "So11111111111111111111111111111111111111112" 
            ? "SOL" 
            : `TK${listing.sellMint.toBase58().slice(0, 4).toUpperCase()}`
        };

        const buyTokenMetadata = getTokenMetadata(listing.buyMint.toBase58()) || {
          name: listing.buyMint.toBase58() === "So11111111111111111111111111111111111111112" 
            ? "Solana" 
            : listing.buyMint.toBase58() === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
            ? "USD Coin"
            : `Token ${listing.buyMint.toBase58().slice(0, 8)}`,
          symbol: listing.buyMint.toBase58() === "So11111111111111111111111111111111111111112" 
            ? "SOL" 
            : listing.buyMint.toBase58() === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
            ? "USDC"
            : `TK${listing.buyMint.toBase58().slice(0, 4).toUpperCase()}`
        };

        // 获取代币小数位数
        let sellTokenDecimals = 9; // 默认9位小数
        let buyTokenDecimals = 9;

        try {
          // 对于SOL使用固定的9位小数
          if (listing.sellMint.toBase58() !== "So11111111111111111111111111111111111111112") {
            const sellMintInfo = await getMint(connection, listing.sellMint);
            sellTokenDecimals = sellMintInfo.decimals;
          }
          
          if (listing.buyMint.toBase58() !== "So11111111111111111111111111111111111111112") {
            if (listing.buyMint.toBase58() === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v") {
              buyTokenDecimals = 6; // USDC使用6位小数
            } else {
              const buyMintInfo = await getMint(connection, listing.buyMint);
              buyTokenDecimals = buyMintInfo.decimals;
            }
          }
        } catch (error) {
          console.warn("获取代币小数位数失败，使用默认值:", error);
          // 使用默认值
        }

        activeListings.push({
          address: listingAccount.publicKey.toBase58(),
          seller: listing.seller.toBase58(),
          sellMint: listing.sellMint.toBase58(),
          buyMint: listing.buyMint.toBase58(),
          pricePerToken: listing.pricePerToken.toNumber(),
          amount: listing.amount.toNumber(),
          listingId: listing.listingId.toNumber(),
          isActive: listing.isActive,
          sellTokenName: sellTokenMetadata.name,
          sellTokenSymbol: sellTokenMetadata.symbol,
          sellTokenDecimals,
          buyTokenName: buyTokenMetadata.name,
          buyTokenSymbol: buyTokenMetadata.symbol,
          buyTokenDecimals,
        });
      }

      // 按创建时间排序（最新的在前面）
      activeListings.sort((a, b) => b.listingId - a.listingId);

      // 缓存结果
      listingsCache.set(cacheKey, {
        data: activeListings,
        timestamp: now,
      });

      setListings(activeListings);
      console.log(`找到 ${activeListings.length} 个活跃卖单`);

    } catch (err: unknown) {
      console.error("获取卖单失败:", err);
      
      let errorMessage = "获取卖单失败";
      const error = err as Error;
      if (error.message?.includes("429")) {
        errorMessage = "网络繁忙，请稍后刷新";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [connection, getTokenMetadata]);

  // 获取用户自己的卖单
  const getUserListings = useCallback(() => {
    if (!publicKey) return [];
    return listings.filter(listing => listing.seller === publicKey.toBase58());
  }, [listings, publicKey]);

  // 获取其他用户的卖单
  const getOtherListings = useCallback(() => {
    if (!publicKey) return listings;
    return listings.filter(listing => listing.seller !== publicKey.toBase58());
  }, [listings, publicKey]);

  useEffect(() => {
    fetchActiveListings();
  }, [fetchActiveListings]);

  const refetch = useCallback(() => {
    fetchActiveListings(true);
  }, [fetchActiveListings]);

  return {
    listings,
    userListings: getUserListings(),
    otherListings: getOtherListings(),
    loading,
    error,
    refetch,
  };
}