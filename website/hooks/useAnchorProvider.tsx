import { useMemo } from "react";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";

export function useAnchorProvider() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const provider = useMemo(() => {
    if (!wallet) {
      // Return a provider without wallet for read-only operations
      return new AnchorProvider(
        connection,
        {} as any, // Dummy wallet for read-only
        { commitment: "confirmed" }
      );
    }
    
    return new AnchorProvider(
      connection,
      wallet,
      { commitment: "confirmed" }
    );
  }, [connection, wallet]);

  return provider;
}