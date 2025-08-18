"use client";

interface TokenMetadata {
  name: string;
  symbol: string;
  description?: string;
  image?: string;
}

// 简单的本地存储来记录我们创建的代币元数据
const LOCAL_TOKEN_METADATA_KEY = "puzi_token_metadata";

export function useTokenMetadata() {

  // 保存代币元数据到本地存储
  const saveTokenMetadata = (mintAddress: string, metadata: TokenMetadata) => {
    try {
      const existingData = localStorage.getItem(LOCAL_TOKEN_METADATA_KEY);
      const tokenMetadata = existingData ? JSON.parse(existingData) : {};
      
      tokenMetadata[mintAddress] = {
        ...metadata,
        createdAt: Date.now(),
      };
      
      localStorage.setItem(LOCAL_TOKEN_METADATA_KEY, JSON.stringify(tokenMetadata));
    } catch (error) {
      console.error("Failed to save token metadata:", error);
    }
  };

  // 获取代币元数据
  const getTokenMetadata = (mintAddress: string): TokenMetadata | null => {
    try {
      const existingData = localStorage.getItem(LOCAL_TOKEN_METADATA_KEY);
      if (!existingData) return null;
      
      const tokenMetadata = JSON.parse(existingData);
      return tokenMetadata[mintAddress] || null;
    } catch (error) {
      console.error("Failed to get token metadata:", error);
      return null;
    }
  };

  // 获取所有本地代币元数据
  const getAllTokenMetadata = (): Record<string, TokenMetadata & { createdAt: number }> => {
    try {
      const existingData = localStorage.getItem(LOCAL_TOKEN_METADATA_KEY);
      return existingData ? JSON.parse(existingData) : {};
    } catch (error) {
      console.error("Failed to get all token metadata:", error);
      return {};
    }
  };

  return {
    saveTokenMetadata,
    getTokenMetadata,
    getAllTokenMetadata,
  };
}