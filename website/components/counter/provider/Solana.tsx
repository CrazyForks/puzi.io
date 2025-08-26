"use client";

import React, { FC, ReactNode, useMemo, useState, useEffect } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { rpcProvider } from "@/utils/rpc-provider";

// Import the wallet adapter styles
import "@solana/wallet-adapter-react-ui/styles.css";

interface SolanaProviderProps {
  children: ReactNode;
}

export const SolanaProvider: FC<SolanaProviderProps> = ({ children }) => {
  const [endpoint, setEndpoint] = useState(rpcProvider.getCurrentEndpoint());

  useEffect(() => {
    // Listen for RPC endpoint changes
    const handleEndpointChange = (newEndpoint: string) => {
      setEndpoint(newEndpoint);
    };

    rpcProvider.addListener(handleEndpointChange);

    return () => {
      rpcProvider.removeListener(handleEndpointChange);
    };
  }, []);

  // Create a new connection when endpoint changes
  const connectionConfig = useMemo(
    () => ({
      commitment: 'confirmed' as const,
      confirmTransactionInitialTimeout: 60000,
    }),
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint} config={connectionConfig}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
