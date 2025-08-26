import { rpcProvider } from './rpc-provider';

// USDC addresses for different networks
export const USDC_MAINNET = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC on mainnet
export const USDC_DEVNET = 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr'; // USDC-Dev on devnet

/**
 * Get the correct USDC address based on the current network
 */
export function getUSDCAddress(): string {
  const network = rpcProvider.getNetwork();
  return network === 'mainnet' ? USDC_MAINNET : USDC_DEVNET;
}

/**
 * Get USDC symbol for the current network
 */
export function getUSDCSymbol(): string {
  const network = rpcProvider.getNetwork();
  return network === 'mainnet' ? 'USDC' : 'USDC-Dev';
}

/**
 * USDC has 6 decimals on both mainnet and devnet
 */
export const USDC_DECIMALS = 6;