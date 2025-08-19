export interface KnownToken {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
  logoURI?: string;
  coingeckoId?: string;
}

// Solana主网上的常见代币
export const KNOWN_TOKENS: KnownToken[] = [
  {
    symbol: "USDC-Dev",
    name: "USD Coin Dev",
    mint: "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr",
    decimals: 6,
    logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
    coingeckoId: "usd-coin"
  },
  {
    symbol: "SOL",
    name: "Wrapped SOL",
    mint: "So11111111111111111111111111111111111111112",
    decimals: 9,
    logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
    coingeckoId: "solana"
  },
];

// 获取代币信息的辅助函数
export function getTokenByMint(mint: string): KnownToken | undefined {
  return KNOWN_TOKENS.find(token => token.mint === mint);
}

export function getTokenBySymbol(symbol: string): KnownToken | undefined {
  return KNOWN_TOKENS.find(token => token.symbol === symbol);
}

// 默认支付代币（用户可以选择的支付方式）
export const PAYMENT_TOKENS = KNOWN_TOKENS.filter(token => 
  ["USDC-Dev", "SOL"].includes(token.symbol)
);