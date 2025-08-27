"use client";

import { useState } from "react";
import Link from "next/link";
import { WalletButton } from "@/components/wallet/WalletButton";
import { useWallet } from "@solana/wallet-adapter-react";
import { RPCSettings } from "./RPCSettings-Simple";
import { Menu, X, TrendingUp, Store } from "lucide-react";

export function Header() {
  const { publicKey, connected } = useWallet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl">铺</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            <Link 
              href="/markets"
              className="text-gray-300 font-extrabold hover:text-white transition-colors px-3 py-2"
            >
              热门代币
            </Link>
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

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-800 py-4 space-y-3">
            <Link 
              href="/markets"
              className="flex items-center gap-3 text-gray-300 font-semibold hover:text-white transition-colors px-3 py-2"
              onClick={closeMobileMenu}
            >
              <TrendingUp className="w-5 h-5 text-purple-400" />
              热门代币
            </Link>
            
            {connected && publicKey && (
              <Link 
                href={`/${publicKey.toBase58()}`}
                className="flex items-center gap-3 text-gray-300 font-semibold hover:text-white transition-colors px-3 py-2"
                onClick={closeMobileMenu}
              >
                <Store className="w-5 h-5 text-purple-400" />
                我的铺子
              </Link>
            )}
            
            <div className="flex items-center gap-3 px-3 py-2">
              <span className="text-gray-500 text-sm">RPC:</span>
              <RPCSettings />
            </div>
            
            <div className="px-3 py-2">
              <WalletButton className="w-full justify-center" />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}