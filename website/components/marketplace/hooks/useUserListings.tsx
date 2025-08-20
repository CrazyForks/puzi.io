"use client";

import { useState, useCallback, useEffect } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
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

export function useUserListings(userAddress: string) {
  const { connection } = useConnection();
  const [listings, setListings] = useState<ListingInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { fetchTokenMetadata } = useOnChainTokenMetadata();

  const fetchUserListings = useCallback(async () => {
    if (!connection || !userAddress) {
      setListings([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 创建只读Program实例
      const program = new Program<PuziContracts>(IDL, { connection });

      console.log(`获取用户 ${userAddress} 的卖单...`);

      // 使用过滤器只获取特定用户的listing账户
      const userPubkey = new PublicKey(userAddress);
      const userListings = await program.account.listing.all([
        {
          memcmp: {
            offset: 8, // 跳过discriminator (8 bytes)
            bytes: userPubkey.toBase58(),
          },
        },
      ]);
      
      console.log(`找到 ${userListings.length} 个用户卖单账户`);

      const activeListings: ListingInfo[] = [];

      for (const listingAccount of userListings) {
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

        // 获取 decimals
        let sellTokenDecimals: number | undefined = undefined;
        let buyTokenDecimals: number | undefined = undefined;
        
        if (sellTokenMetadata) {
          sellTokenDecimals = sellTokenMetadata.decimals;
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
            }
          } catch (error) {
            console.error("Failed to get sell token decimals:", error);
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

      setListings(activeListings);
      console.log(`找到 ${activeListings.length} 个活跃卖单`);

    } catch (err: unknown) {
      console.error("获取用户卖单失败:", err);
      
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
  }, [connection, userAddress, fetchTokenMetadata]);

  useEffect(() => {
    fetchUserListings();
  }, [fetchUserListings]);

  const refetch = useCallback(() => {
    fetchUserListings();
  }, [fetchUserListings]);

  return {
    listings,
    loading,
    error,
    refetch,
  };
}