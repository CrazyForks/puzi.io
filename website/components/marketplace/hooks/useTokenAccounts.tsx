"use client";

import { useEffect, useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useOnChainTokenMetadata } from "./useOnChainTokenMetadata";

interface TokenInfo {
  mint: string;
  amount: number;
  name?: string;
  symbol?: string;
  decimals: number;
  logoURI?: string;
}

export function useTokenAccounts() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { fetchTokenMetadata } = useOnChainTokenMetadata();

  const fetchTokenAccounts = useCallback(async () => {
    if (!publicKey || !connection) {
      setTokens([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {

      const tokenList: TokenInfo[] = [];

      // 首先获取SOL余额
      try {
        const solBalance = await connection.getBalance(publicKey, 'confirmed');
        if (solBalance > 0) {
          tokenList.push({
            mint: "SOL_NATIVE", // 使用特殊标识符表示原生 SOL
            amount: solBalance,
            name: "Solana",
            symbol: "SOL",
            decimals: 9,
          });
        }
      } catch (solError) {
        console.warn("获取SOL余额失败:", solError);
      }

      // 获取所有SPL代币账户 - 使用更保守的配置
      let tokenAccounts;
      try {
        tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          publicKey,
          {
            programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
          },
          'confirmed' // 使用confirmed commitment减少RPC负载
        );
      } catch (rpcError: unknown) {
        const error = rpcError as Error;
        if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
          throw new Error("请求过于频繁，请稍后再试");
        }
        throw rpcError;
      }

      for (const tokenAccount of tokenAccounts.value) {
        const accountInfo = tokenAccount.account.data.parsed.info;
        const mintAddress = accountInfo.mint;
        const amount = parseInt(accountInfo.tokenAmount.amount);
        const decimals = accountInfo.tokenAmount.decimals;

        // 只显示余额大于0的代币
        if (amount > 0) {
          // 跳过 Wrapped SOL，因为我们已经显示了原生 SOL
          if (mintAddress === "So11111111111111111111111111111111111111112") {
            // 不添加 Wrapped SOL 到列表
            console.log("跳过 Wrapped SOL，使用原生 SOL 代替");
          } else {
            // 先添加基本信息，后续异步获取元数据
            tokenList.push({
              mint: mintAddress,
              amount,
              name: `Token ${mintAddress.slice(0, 8)}`,
              symbol: `TK${mintAddress.slice(0, 4).toUpperCase()}`,
              decimals,
            });
          }
        }
      }

      // 先设置基本信息
      setTokens(tokenList);

      // 异步获取所有代币的链上元数据（排除原生 SOL）
      const mintAddresses = tokenList
        .filter(token => token.mint !== "SOL_NATIVE")
        .map(token => token.mint);
      
      if (mintAddresses.length > 0) {
        // 并行获取所有代币的元数据
        const metadataPromises = mintAddresses.map(async (mintAddress) => {
          const metadata = await fetchTokenMetadata(mintAddress);
          return { mintAddress, metadata };
        });
        
        const metadataResults = await Promise.allSettled(metadataPromises);
        
        // 更新代币信息
        const updatedTokenList = tokenList.map(token => {
          const result = metadataResults.find(
            r => r.status === 'fulfilled' && r.value.mintAddress === token.mint
          );
          
          if (result && result.status === 'fulfilled' && result.value.metadata) {
            return {
              ...token,
              name: result.value.metadata.name,
              symbol: result.value.metadata.symbol,
              logoURI: result.value.metadata.image,
            };
          }
          
          return token;
        });
        
        // 更新状态
        setTokens(updatedTokenList);
      }
    } catch (err: unknown) {
      console.error("Failed to fetch token accounts:", err);
      
      let errorMessage = "获取代币列表失败";
      const error = err as Error;
      if (error.message?.includes("请求过于频繁")) {
        errorMessage = "请求过于频繁，请稍后再试";
      } else if (error.message?.includes("429")) {
        errorMessage = "网络繁忙，请稍后刷新";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection, fetchTokenMetadata]);

  useEffect(() => {
    fetchTokenAccounts();
  }, [fetchTokenAccounts]);

  const refetch = useCallback(() => {
    fetchTokenAccounts();
  }, [fetchTokenAccounts]);

  return {
    tokens,
    loading,
    error,
    refetch,
  };
}