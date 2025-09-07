import { rpcProvider } from '@/utils/rpc-provider';

export interface TradableToken {
  symbol: string;  // Short name for URL, e.g., 'v2ex'
  name: string;    // Full display name
  address: string; // Token mint address
  network: 'mainnet' | 'devnet' | 'both';
  description?: string;
  logoURI?: string;
  website?: string;
  twitter?: string;
}

// Mainnet tradable tokens
const MAINNET_TRADABLE_TOKENS: TradableToken[] = [
  {
    symbol: 'v2ex',
    name: 'V2EX',
    address: '9raUVuzeWUk53co63M4WXLWPWE4Xc6Lpn7RS9dnkpump',
    network: 'mainnet',
    description: 'way to explore',
    logoURI: 'https://ipfs.io/ipfs/QmT8rZaCR85GUJB3x7CTf4oQ3BZvK3BUEgRe6jWXwWzXaC',
  },
  {
    symbol: 'sol',
    name: 'Solana',
    address: 'So11111111111111111111111111111111111111112', // Wrapped SOL
    network: 'mainnet',
    description: 'Solana',
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
    website: 'https://solana.com',
    twitter: 'https://twitter.com/solana',
  },
  // Add more mainnet tokens here
];

// Devnet tradable tokens (for testing)
const DEVNET_TRADABLE_TOKENS: TradableToken[] = [
  {
    symbol: 'sol',
    name: 'Solana',
    address: 'So11111111111111111111111111111111111111112', // Wrapped SOL
    network: 'devnet',
    description: 'Solana native token',
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
  },
  // Add devnet test tokens here
];

// Get tokens based on current network
export function getTradableTokens(): TradableToken[] {
  const network = rpcProvider.getNetwork();
  
  // Combine tokens that work on current network
  const tokens = [
    ...(network === 'mainnet' ? MAINNET_TRADABLE_TOKENS : DEVNET_TRADABLE_TOKENS),
    // Also include tokens that work on both networks
    ...MAINNET_TRADABLE_TOKENS.filter(t => t.network === 'both'),
    ...DEVNET_TRADABLE_TOKENS.filter(t => t.network === 'both'),
  ];
  
  // Remove duplicates
  const uniqueTokens = tokens.filter((token, index, self) =>
    index === self.findIndex((t) => t.address === token.address)
  );
  
  return uniqueTokens;
}

// Get token by symbol (case-insensitive)
export function getTradableTokenBySymbol(symbol: string): TradableToken | undefined {
  const tokens = getTradableTokens();
  return tokens.find(token => 
    token.symbol.toLowerCase() === symbol.toLowerCase()
  );
}

// Get token by address
export function getTradableTokenByAddress(address: string): TradableToken | undefined {
  const tokens = getTradableTokens();
  return tokens.find(token => token.address === address);
}

// Check if a string is a known token symbol
export function isKnownTokenSymbol(symbol: string): boolean {
  return getTradableTokenBySymbol(symbol) !== undefined;
}

// Get all token symbols for routing
export function getAllTokenSymbols(): string[] {
  // Return all possible symbols from both networks for static generation
  const allTokens = [
    ...MAINNET_TRADABLE_TOKENS,
    ...DEVNET_TRADABLE_TOKENS,
  ];
  
  const uniqueSymbols = [...new Set(allTokens.map(t => t.symbol.toLowerCase()))];
  return uniqueSymbols;
}