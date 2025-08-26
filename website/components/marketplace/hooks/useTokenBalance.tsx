"use client";

import { useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";

export function useTokenBalance(tokenMint?: string) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!publicKey || !tokenMint) {
        setBalance(0);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Check if it's SOL
        if (tokenMint === "So11111111111111111111111111111111111111112") {
          const solBalance = await connection.getBalance(publicKey);
          setBalance(solBalance / LAMPORTS_PER_SOL);
        } else {
          // Get SPL token balance
          const mintPubkey = new PublicKey(tokenMint);
          const ata = await getAssociatedTokenAddress(mintPubkey, publicKey);
          
          try {
            const account = await getAccount(connection, ata);
            const mintInfo = await connection.getParsedAccountInfo(mintPubkey);
            
            let decimals = 9; // default
            if (mintInfo.value && 'parsed' in mintInfo.value.data) {
              decimals = mintInfo.value.data.parsed.info.decimals;
            }
            
            setBalance(Number(account.amount) / Math.pow(10, decimals));
          } catch (err) {
            // Account doesn't exist, balance is 0
            setBalance(0);
          }
        }
      } catch (err) {
        console.error("Failed to fetch balance:", err);
        setError("Failed to fetch balance");
        setBalance(0);
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
  }, [publicKey, tokenMint, connection]);

  return { balance, loading, error };
}