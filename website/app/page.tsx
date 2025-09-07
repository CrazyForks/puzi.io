"use client";

import Link from "next/link";
import { ArrowRight, Shield, Zap, Code, Coins } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useTranslation } from "@/lib/i18n/context";

export default function Home() {
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-10"></div>

      {/* Hero Section */}
      <div className="relative z-10 px-4 py-24 text-center">
        <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text">
          {t('home.title')}
        </h1>
        <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto">
          {t('home.subtitle')}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          {connected && publicKey ? (
            <Link
              href={`/${publicKey.toString()}`}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-full flex items-center gap-2 transition-all transform hover:scale-105 shadow-lg shadow-purple-500/25"
            >
              {t('home.enterMyShop')}
              <ArrowRight className="w-5 h-5" />
            </Link>
          ) : (
            <button
              onClick={() => setVisible(true)}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-full flex items-center gap-2 transition-all transform hover:scale-105 shadow-lg shadow-purple-500/25"
            >
              {t('home.connectWallet')}
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
          <a
            href="https://github.com/timqian/puzi.io"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-4 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white font-medium rounded-full flex items-center gap-2 transition-all"
          >
            <Code className="w-5 h-5" />
            {t('home.viewSource')}
          </a>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative z-10 px-4 py-16">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 hover:border-purple-600/50 transition-all">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center mb-4">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{t('home.features.zeroFee')}</h3>
            <p className="text-gray-400">
              {t('home.features.zeroFeeDesc')}
            </p>
          </div>

          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 hover:border-purple-600/50 transition-all">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{t('home.features.decentralized')}</h3>
            <p className="text-gray-400">
              {t('home.features.decentralizedDesc')}
            </p>
          </div>

          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 hover:border-purple-600/50 transition-all">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{t('home.features.anyToken')}</h3>
            <p className="text-gray-400">
              {t('home.features.anyTokenDesc')}
            </p>
          </div>
        </div>
      </div>

      {/* How it Works Section */}
      <div className="relative z-10 px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-12">{t('home.howItWorks')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mb-4 border border-purple-600/50">
                <span className="text-2xl font-bold text-purple-400">1</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{t('home.step1')}</h3>
              <p className="text-gray-400 text-sm">
                {t('home.step1Desc')}
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mb-4 border border-purple-600/50">
                <span className="text-2xl font-bold text-purple-400">2</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{t('home.step2')}</h3>
              <p className="text-gray-400 text-sm">
                {t('home.step2Desc')}
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mb-4 border border-purple-600/50">
                <span className="text-2xl font-bold text-purple-400">3</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{t('home.step3')}</h3>
              <p className="text-gray-400 text-sm">
                {t('home.step3Desc')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 px-4 py-12 text-center">
        <div className="flex justify-center gap-6 mb-6">
          <a href="https://github.com/timqian/puzi.io" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-400 transition-colors">
            GitHub
          </a>
          <a href="https://discord.gg/prF8S5qVnh" className="text-gray-500 hover:text-gray-400 transition-colors">
            Discord
          </a>
          <a href="https://x.com/tim_qian" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-400 transition-colors">
            X
          </a>
        </div>
        <p className="text-sm text-gray-600">
          {t('home.poweredBy')}
        </p>
      </footer>
    </div>
  );
}
