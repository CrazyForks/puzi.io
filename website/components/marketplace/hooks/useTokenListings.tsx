"use client";

import { useState, useCallback, useEffect } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { Puzi, IDL } from "@/anchor-idl/idl";
import { useOnChainTokenMetadata } from "./useOnChainTokenMetadata";
import { USDC_MAINNET, USDC_DEVNET } from "@/utils/usdc-address";

interface ListingInfo {
  address: string;
  seller: string;
  sellMint: string;
  buyMint: string;
  pricePerToken: number;
  amount: number;
  listingId: number;
  sellTokenName?: string;
  sellTokenSymbol?: string;
  sellTokenDescription?: string;
  sellTokenImage?: string;
  sellTokenDecimals?: number;
  buyTokenName?: string;
  buyTokenSymbol?: string;
  buyTokenDecimals?: number;
}

export function useTokenListings(tokenAddress: string | undefined) {
  const { connection } = useConnection();
  const [sellListings, setSellListings] = useState<ListingInfo[]>([]);
  const [buyListings, setBuyListings] = useState<ListingInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { fetchTokenMetadata } = useOnChainTokenMetadata();

  const fetchTokenListings = useCallback(async () => {
    if (!connection || !tokenAddress) {
      setSellListings([]);
      setBuyListings([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 创建只读Program实例
      const program = new Program<Puzi>(IDL, { connection });

      console.log("获取代币订单...", tokenAddress);

      const tokenPubkey = new PublicKey(tokenAddress);

      // 使用 memcmp 过滤获取卖单（sellMint = tokenAddress）
      // Listing account structure:
      // - discriminator: 8 bytes
      // - seller: 32 bytes
      // - sellMint: 32 bytes (offset 40)
      // - buyMint: 32 bytes (offset 72)
      const sellFilters = [
        {
          memcmp: {
            offset: 40, // sellMint 的偏移量
            bytes: tokenPubkey.toBase58(),
          },
        },
      ];

      // 获取买单（buyMint = tokenAddress）
      const buyFilters = [
        {
          memcmp: {
            offset: 72, // buyMint 的偏移量
            bytes: tokenPubkey.toBase58(),
          },
        },
      ];

      // 并行获取卖单和买单
      const [sellAccounts, buyAccounts] = await Promise.all([
        program.account.listing.all(sellFilters),
        program.account.listing.all(buyFilters),
      ]);

      console.log(`找到 ${sellAccounts.length} 个卖单, ${buyAccounts.length} 个买单`);

      // 处理卖单
      const activeSellListings: ListingInfo[] = [];
      for (const account of sellAccounts) {
        const listing = account.account;
        
        // 只显示活跃的卖单 (amount > 0)
        if (listing.amount === 0 || listing.amount.toNumber() === 0) {
          continue;
        }

        // 获取买币的元数据
        const buyMintAddress = listing.buyMint.toBase58();
        const buyTokenMetadata = await fetchTokenMetadata(buyMintAddress);
        
        let buyTokenDecimals: number | undefined = undefined;
        
        if (buyTokenMetadata) {
          buyTokenDecimals = buyTokenMetadata.decimals;
        }
        
        // 如果还没有获取到 decimals，必须直接从 mint 获取
        if (buyTokenDecimals === undefined) {
          try {
            if (buyMintAddress === "So11111111111111111111111111111111111111112") {
              buyTokenDecimals = 9; // SOL
            } else if (buyMintAddress === USDC_DEVNET || buyMintAddress === USDC_MAINNET) {
              buyTokenDecimals = 6; // USDC
            } else {
              const { getMint } = await import("@solana/spl-token");
              const mintInfo = await getMint(connection, listing.buyMint);
              buyTokenDecimals = mintInfo.decimals;
            }
          } catch (error) {
            console.error("Failed to get buy token decimals:", error);
            buyTokenDecimals = 9; // 默认值
          }
        }

        const buyTokenInfo = buyTokenMetadata || {
          name: `Token ${buyMintAddress.slice(0, 8)}`,
          symbol: `TK${buyMintAddress.slice(0, 4).toUpperCase()}`,
          decimals: buyTokenDecimals
        };

        // 获取卖币的元数据（主要是 decimals）
        let sellTokenDecimals: number | undefined = undefined;
        const sellMintAddress = listing.sellMint.toBase58();
        
        try {
          if (sellMintAddress === "So11111111111111111111111111111111111111112") {
            sellTokenDecimals = 9;
          } else {
            const { getMint } = await import("@solana/spl-token");
            const mintInfo = await getMint(connection, listing.sellMint);
            sellTokenDecimals = mintInfo.decimals;
          }
        } catch {
          sellTokenDecimals = 9;
        }

        activeSellListings.push({
          address: account.publicKey.toBase58(),
          seller: listing.seller.toBase58(),
          sellMint: listing.sellMint.toBase58(),
          buyMint: listing.buyMint.toBase58(),
          pricePerToken: listing.pricePerToken.toNumber(),
          amount: listing.amount.toNumber(),
          listingId: listing.listingId.toNumber(),
          sellTokenDecimals,
          buyTokenName: buyTokenInfo.name,
          buyTokenSymbol: buyTokenInfo.symbol,
          buyTokenDecimals,
        });
      }

      // 处理买单
      const activeBuyListings: ListingInfo[] = [];
      for (const account of buyAccounts) {
        const listing = account.account;
        
        // 只显示活跃的买单 (amount > 0)
        if (listing.amount === 0 || listing.amount.toNumber() === 0) {
          continue;
        }

        // 获取卖币的元数据（对于买单来说，是对方的代币）
        const sellMintAddress = listing.sellMint.toBase58();
        const sellTokenMetadata = await fetchTokenMetadata(sellMintAddress);
        
        let sellTokenDecimals: number | undefined = undefined;
        
        if (sellTokenMetadata) {
          sellTokenDecimals = sellTokenMetadata.decimals;
        }
        
        // 如果还没有获取到 decimals，必须直接从 mint 获取
        if (sellTokenDecimals === undefined) {
          try {
            if (sellMintAddress === "So11111111111111111111111111111111111111112") {
              sellTokenDecimals = 9;
            } else {
              const { getMint } = await import("@solana/spl-token");
              const mintInfo = await getMint(connection, listing.sellMint);
              sellTokenDecimals = mintInfo.decimals;
            }
          } catch (error) {
            console.error("Failed to get sell token decimals:", error);
            sellTokenDecimals = 9;
          }
        }

        const sellTokenInfo = sellTokenMetadata || {
          name: `Token ${sellMintAddress.slice(0, 8)}`,
          symbol: `TK${sellMintAddress.slice(0, 4).toUpperCase()}`,
          decimals: sellTokenDecimals
        };

        // 获取买币的元数据（我们的代币，主要是 decimals）
        let buyTokenDecimals: number | undefined = undefined;
        const buyMintAddress = listing.buyMint.toBase58();
        
        try {
          if (buyMintAddress === "So11111111111111111111111111111111111111112") {
            buyTokenDecimals = 9;
          } else {
            const { getMint } = await import("@solana/spl-token");
            const mintInfo = await getMint(connection, listing.buyMint);
            buyTokenDecimals = mintInfo.decimals;
          }
        } catch {
          buyTokenDecimals = 9;
        }

        activeBuyListings.push({
          address: account.publicKey.toBase58(),
          seller: listing.seller.toBase58(),
          sellMint: listing.sellMint.toBase58(),
          buyMint: listing.buyMint.toBase58(),
          pricePerToken: listing.pricePerToken.toNumber(),
          amount: listing.amount.toNumber(),
          listingId: listing.listingId.toNumber(),
          sellTokenName: sellTokenInfo.name,
          sellTokenSymbol: sellTokenInfo.symbol,
          sellTokenDecimals,
          buyTokenDecimals,
        });
      }

      // 按创建时间排序（最新的在前面）
      activeSellListings.sort((a, b) => b.listingId - a.listingId);
      activeBuyListings.sort((a, b) => b.listingId - a.listingId);

      setSellListings(activeSellListings);
      setBuyListings(activeBuyListings);
      
      console.log(`找到 ${activeSellListings.length} 个活跃卖单, ${activeBuyListings.length} 个活跃买单`);

    } catch (err: unknown) {
      console.error("获取订单失败:", err);
      
      let errorMessage = "获取订单失败";
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
  }, [connection, tokenAddress, fetchTokenMetadata]);

  useEffect(() => {
    fetchTokenListings();
  }, [fetchTokenListings]);

  const refetch = useCallback(() => {
    fetchTokenListings();
  }, [fetchTokenListings]);

  return {
    sellListings,
    buyListings,
    loading,
    error,
    refetch,
  };
}