"use client";

import { useCallback } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { getMint } from "@solana/spl-token";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { publicKey } from "@metaplex-foundation/umi";
import { 
  fetchDigitalAsset,
  mplTokenMetadata 
} from "@metaplex-foundation/mpl-token-metadata";

export interface OnChainTokenMetadata {
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  decimals: number;
  supply?: string;
}

// 缓存管理
const metadataCache = new Map<string, { data: OnChainTokenMetadata; timestamp: number }>();
const CACHE_DURATION = 60000; // 60秒缓存

export function useOnChainTokenMetadata() {
  const { connection } = useConnection();

  const fetchTokenMetadata = useCallback(async (
    mintAddress: string
  ): Promise<OnChainTokenMetadata | null> => {
    if (!connection) return null;

    // 检查缓存
    const cached = metadataCache.get(mintAddress);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return cached.data;
    }

    try {
      // 特殊处理 SOL
      if (mintAddress === "So11111111111111111111111111111111111111112") {
        const solMetadata: OnChainTokenMetadata = {
          name: "Solana",
          symbol: "SOL",
          decimals: 9,
          description: "Solana Native Token",
          image: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
        };
        metadataCache.set(mintAddress, { data: solMetadata, timestamp: Date.now() });
        return solMetadata;
      }

      // 特殊处理 USDC
      if (mintAddress === "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr") {
        const usdcMetadata: OnChainTokenMetadata = {
          name: "USD Coin",
          symbol: "USDC",
          decimals: 6,
          description: "USD Coin",
          image: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png"
        };
        metadataCache.set(mintAddress, { data: usdcMetadata, timestamp: Date.now() });
        return usdcMetadata;
      }

      const mintPubkey = new PublicKey(mintAddress);
      
      // 获取 mint 信息（包含 decimals 和 supply）
      const mintInfo = await getMint(connection, mintPubkey);
      
      console.log(`Token ${mintAddress} decimals: ${mintInfo.decimals}`);
      
      // 创建 UMI 实例
      const umi = createUmi(connection.rpcEndpoint).use(mplTokenMetadata());
      
      // 尝试获取代币元数据
      try {
        const asset = await fetchDigitalAsset(umi, publicKey(mintAddress));
        
        let name = asset.metadata.name || "Unknown Token";
        let symbol = asset.metadata.symbol || "TOKEN";
        let description = "";
        let image = "";

        // 如果有 URI，尝试获取详细元数据
        if (asset.metadata.uri) {
          try {
            // 处理 data URI
            if (asset.metadata.uri.startsWith("data:")) {
              const jsonString = asset.metadata.uri.replace(/^data:application\/json,/, "");
              const decodedData = JSON.parse(decodeURIComponent(jsonString));
              name = decodedData.name || name;
              symbol = decodedData.symbol || symbol;
              description = decodedData.description || "";
              image = decodedData.image || "";
            } else {
              // 处理 HTTP URI
              const response = await fetch(asset.metadata.uri);
              if (response.ok) {
                const metadata = await response.json();
                name = metadata.name || name;
                symbol = metadata.symbol || symbol;
                description = metadata.description || "";
                image = metadata.image || "";
              }
            }
          } catch (error) {
            console.warn("Failed to fetch metadata from URI:", error);
          }
        }

        const metadata: OnChainTokenMetadata = {
          name,
          symbol,
          description,
          image,
          decimals: mintInfo.decimals,
          supply: mintInfo.supply.toString()
        };

        // 缓存结果
        metadataCache.set(mintAddress, { data: metadata, timestamp: Date.now() });
        return metadata;

      } catch (metadataError) {
        // 如果获取元数据失败，返回基础信息
        console.warn("Failed to fetch token metadata, using basic info:", metadataError);
        
        const basicMetadata: OnChainTokenMetadata = {
          name: `Token ${mintAddress.slice(0, 8)}`,
          symbol: `TK${mintAddress.slice(0, 4).toUpperCase()}`,
          decimals: mintInfo.decimals,
          supply: mintInfo.supply.toString()
        };

        metadataCache.set(mintAddress, { data: basicMetadata, timestamp: Date.now() });
        return basicMetadata;
      }

    } catch (error) {
      console.error("Error fetching token metadata:", error);
      return null;
    }
  }, [connection]);

  // 批量获取代币元数据
  const fetchMultipleTokenMetadata = useCallback(async (
    mintAddresses: string[]
  ): Promise<Map<string, OnChainTokenMetadata>> => {
    const results = new Map<string, OnChainTokenMetadata>();
    
    // 并行获取所有代币的元数据
    const promises = mintAddresses.map(async (mintAddress) => {
      const metadata = await fetchTokenMetadata(mintAddress);
      if (metadata) {
        results.set(mintAddress, metadata);
      }
    });

    await Promise.all(promises);
    return results;
  }, [fetchTokenMetadata]);

  return {
    fetchTokenMetadata,
    fetchMultipleTokenMetadata,
    clearCache: () => metadataCache.clear()
  };
}