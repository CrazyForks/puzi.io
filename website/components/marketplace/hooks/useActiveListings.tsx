"use client";

import { useState, useCallback, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Program } from "@coral-xyz/anchor";
import { PuziContracts, IDL } from "@/anchor-idl/idl";
import { useOnChainTokenMetadata } from "./useOnChainTokenMetadata";

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
  sellTokenDescription?: string;
  sellTokenImage?: string;
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
  const { fetchTokenMetadata } = useOnChainTokenMetadata();

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

        // 从链上获取代币元数据
        const sellMintAddress = listing.sellMint.toBase58();
        const buyMintAddress = listing.buyMint.toBase58();
        
        const [sellTokenMetadata, buyTokenMetadata] = await Promise.all([
          fetchTokenMetadata(sellMintAddress),
          fetchTokenMetadata(buyMintAddress)
        ]);

        // 如果无法获取完整元数据，至少尝试获取 decimals
        // 重要：不要假设默认值，必须获取实际的 decimals
        let sellTokenDecimals: number | undefined = undefined;
        let buyTokenDecimals: number | undefined = undefined;
        
        if (sellTokenMetadata) {
          sellTokenDecimals = sellTokenMetadata.decimals;
          console.log(`Got decimals from metadata for ${sellMintAddress}: ${sellTokenDecimals}`);
        }
        
        // 如果还没有获取到 decimals，必须直接从 mint 获取
        if (sellTokenDecimals === undefined) {
          try {
            if (sellMintAddress === "So11111111111111111111111111111111111111112") {
              sellTokenDecimals = 9; // SOL 固定9位小数
            } else {
              const { getMint } = await import("@solana/spl-token");
              const mintInfo = await getMint(connection, listing.sellMint);
              sellTokenDecimals = mintInfo.decimals;
              console.log(`Got decimals from getMint for ${sellMintAddress}: ${sellTokenDecimals}`);
            }
          } catch (error) {
            console.error("Failed to get sell token decimals:", error);
            // 如果还是失败了，使用0作为最保守的默认值
            sellTokenDecimals = 0;
          }
        }
        
        if (buyTokenMetadata) {
          buyTokenDecimals = buyTokenMetadata.decimals;
        }
        
        // 如果还没有获取到 decimals，必须直接从 mint 获取
        if (buyTokenDecimals === undefined) {
          try {
            if (buyMintAddress === "So11111111111111111111111111111111111111112") {
              buyTokenDecimals = 9; // SOL
            } else if (buyMintAddress === "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr") {
              buyTokenDecimals = 6; // USDC
            } else {
              const { getMint } = await import("@solana/spl-token");
              const mintInfo = await getMint(connection, listing.buyMint);
              buyTokenDecimals = mintInfo.decimals;
            }
          } catch (error) {
            console.error("Failed to get buy token decimals:", error);
            // 如果还是失败了，使用0作为最保守的默认值
            buyTokenDecimals = 0;
          }
        }

        // 构建 token 信息对象
        const sellTokenInfo = sellTokenMetadata || {
          name: `Token ${sellMintAddress.slice(0, 8)}`,
          symbol: `TK${sellMintAddress.slice(0, 4).toUpperCase()}`,
          decimals: sellTokenDecimals,
          description: "",
          image: ""
        };

        const buyTokenInfo = buyTokenMetadata || {
          name: `Token ${buyMintAddress.slice(0, 8)}`,
          symbol: `TK${buyMintAddress.slice(0, 4).toUpperCase()}`,
          decimals: buyTokenDecimals
        };

        // 调试日志
        console.log("Listing details:", {
          sellMint: sellMintAddress,
          rawAmount: listing.amount.toNumber(),
          sellTokenDecimals,
          divisor: Math.pow(10, sellTokenDecimals),
          formattedAmount: listing.amount.toNumber() / Math.pow(10, sellTokenDecimals),
          expected: "如果你上架了100个代币且decimals=0，rawAmount应该是100"
        });

        activeListings.push({
          address: listingAccount.publicKey.toBase58(),
          seller: listing.seller.toBase58(),
          sellMint: listing.sellMint.toBase58(),
          buyMint: listing.buyMint.toBase58(),
          pricePerToken: listing.pricePerToken.toNumber(),
          amount: listing.amount.toNumber(),
          listingId: listing.listingId.toNumber(),
          isActive: listing.isActive,
          sellTokenName: sellTokenInfo.name,
          sellTokenSymbol: sellTokenInfo.symbol,
          sellTokenDescription: sellTokenInfo.description,
          sellTokenImage: sellTokenInfo.image,
          sellTokenDecimals,
          buyTokenName: buyTokenInfo.name,
          buyTokenSymbol: buyTokenInfo.symbol,
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
  }, [connection, fetchTokenMetadata]);

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