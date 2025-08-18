"use client";

import React, { FC, ReactNode, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";

// Import the wallet adapter styles
import "@solana/wallet-adapter-react-ui/styles.css";

interface SolanaProviderProps {
  children: ReactNode;
}

export const SolanaProvider: FC<SolanaProviderProps> = ({ children }) => {
  // Use Helius RPC endpoint for better performance and reliability
  const endpoint = useMemo(() => {
    // Primary endpoint
    const primary = 'https://devnet.helius-rpc.com/?api-key=7b04005d-ff69-4612-98a3-0eba92102d80';
    
    // Fallback endpoints (you can add more)
    // const fallback1 = 'https://api.devnet.solana.com';
    // const fallback2 = 'https://devnet.solana.rpcpool.com';
    
    return primary;
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
