"use client";

import { useState } from "react";
import Link from "next/link";
import { WalletButton } from "@/components/wallet/WalletButton";
import { useWallet } from "@solana/wallet-adapter-react";
import { RPCSettings } from "./RPCSettings-Simple";
import { Menu, X, TrendingUp, Store } from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useTranslation } from "@/lib/i18n/context";

export function Header() {
  const { publicKey, connected } = useWallet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useTranslation();
  
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
              {t('header.popularTokens')}
            </Link>
            {connected && publicKey && (
              <Link
                href={`/${publicKey.toBase58()}`}
                className="text-gray-300 font-extrabold hover:text-white transition-colors px-3 py-2"
              >
                {t('header.myShop')}
              </Link>
            )}
            <LanguageSwitcher />
            <RPCSettings />
            <WalletButton />
          </div>

          {/* Mobile Menu with RPC and Wallet always visible */}
          <div className="flex md:hidden items-center gap-2">
            <RPCSettings />
            <WalletButton />
            <button
              onClick={toggleMobileMenu}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu - Navigation links and Language Switcher */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-800 py-4 space-y-3">
            <Link
              href="/markets"
              className="flex items-center gap-3 text-gray-300 font-semibold hover:text-white transition-colors px-3 py-2"
              onClick={closeMobileMenu}
            >
              <TrendingUp className="w-5 h-5 text-purple-400" />
              {t('header.popularTokens')}
            </Link>

            {connected && publicKey && (
              <Link
                href={`/${publicKey.toBase58()}`}
                className="flex items-center gap-3 text-gray-300 font-semibold hover:text-white transition-colors px-3 py-2"
                onClick={closeMobileMenu}
              >
                <Store className="w-5 h-5 text-purple-400" />
                {t('header.myShop')}
              </Link>
            )}

            {/* Language Switcher in mobile dropdown */}
            <div className="px-3 py-2">
              <LanguageSwitcher />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}