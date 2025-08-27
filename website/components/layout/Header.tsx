"use client";

import Link from "next/link";
import { WalletButton } from "@/components/wallet/WalletButton";
import { useWallet } from "@solana/wallet-adapter-react";
import { RPCSettings } from "./RPCSettings-Simple";

export function Header() {
  const { publicKey, connected } = useWallet();
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl">铺</span>
            </div>
            {/* <span className="text-xl font-bold text-white">Puzi</span> */}
          </Link>

          {/* Right side navigation */}
          <div className="flex items-center gap-4">
            {connected && publicKey && (
              <Link 
                href={`/${publicKey.toBase58()}`}
                className="text-gray-300 font-extrabold hover:text-white transition-colors px-3 py-2"
              >
                我的铺子
              </Link>
            )}
            <RPCSettings />
            <WalletButton />
          </div>
        </div>
      </div>
    </header>
  );
}