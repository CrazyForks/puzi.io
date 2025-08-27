import { rpcProvider } from '@/utils/rpc-provider';
import { USDC_MAINNET, USDC_DEVNET } from '@/utils/usdc-address';

export interface KnownToken {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
  logoURI?: string;
  coingeckoId?: string;
}

// Devnet tokens
const DEVNET_TOKENS: KnownToken[] = [
  {
    symbol: "USDC-Dev",
    name: "USD Coin Dev",
    mint: USDC_DEVNET,
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

// Mainnet tokens
const MAINNET_TOKENS: KnownToken[] = [
  {
    symbol: "USDC",
    name: "USD Coin",
    mint: USDC_MAINNET,
    decimals: 6,
    logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
    coingeckoId: "usd-coin"
  },
  {
    symbol: "USDT",
    name: "Tether USD",
    mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    decimals: 6,
    logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg",
    coingeckoId: "tether"
  },
  {
    symbol: "SOL",
    name: "Wrapped SOL",
    mint: "So11111111111111111111111111111111111111112",
    decimals: 9,
    logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
    coingeckoId: "solana"
  },
  {
    symbol: "BONK",
    name: "Bonk",
    mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    decimals: 5,
    logoURI: "https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I",
    coingeckoId: "bonk"
  },
  {
    symbol: "JUP",
    name: "Jupiter",
    mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    decimals: 6,
    logoURI: "https://static.jup.ag/jup/icon.png",
    coingeckoId: "jupiter"
  },
];

// Get tokens based on current network
export function getKnownTokens(): KnownToken[] {
  const network = rpcProvider.getNetwork();
  return network === 'mainnet' ? MAINNET_TOKENS : DEVNET_TOKENS;
}

// Helper functions - dynamically get tokens based on current network
export function getTokenByMint(mint: string): KnownToken | undefined {
  const tokens = getKnownTokens();
  return tokens.find(token => token.mint === mint);
}

export function getTokenBySymbol(symbol: string): KnownToken | undefined {
  const tokens = getKnownTokens();
  return tokens.find(token => token.symbol === symbol);
}

// Payment tokens based on network
export function getPaymentTokens(): KnownToken[] {
  const tokens = getKnownTokens();
  const network = rpcProvider.getNetwork();
  return tokens.filter(token => {
    if (network === 'mainnet') {
      return ["USDC", "USDT", "SOL"].includes(token.symbol);
    } else {
      return ["USDC-Dev", "SOL"].includes(token.symbol);
    }
  });
}

