"use client";

import Link from "next/link";
import { ArrowRight, Shield, Zap, Code, ShoppingBag, Coins, Users } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

export default function Home() {
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-10"></div>

      {/* Hero Section */}
      <div className="relative z-10 px-4 py-24 text-center">
        <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text">
          开个铺子
        </h1>
        <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto">
          在 Solana 上出售任何东西
        </p>
        
        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          {connected && publicKey ? (
            <Link 
              href={`/${publicKey.toString()}`}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-full flex items-center gap-2 transition-all transform hover:scale-105 shadow-lg shadow-purple-500/25"
            >
              进入我的铺子
              <ArrowRight className="w-5 h-5" />
            </Link>
          ) : (
            <button
              onClick={() => setVisible(true)}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-full flex items-center gap-2 transition-all transform hover:scale-105 shadow-lg shadow-purple-500/25"
            >
              连接钱包
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
            查看源码
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
            <h3 className="text-xl font-bold text-white mb-2">零手续费</h3>
            <p className="text-gray-400">
              协议层面不收取任何手续费
            </p>
          </div>

          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 hover:border-purple-600/50 transition-all">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">去中心化</h3>
            <p className="text-gray-400">
              基于 Solana 智能合约，完全开源透明
            </p>
          </div>

          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 hover:border-purple-600/50 transition-all">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">任意代币</h3>
            <p className="text-gray-400">
              代币？服务？NFT？都可以上架出售
            </p>
          </div>
        </div>
      </div>

      {/* How it Works Section */}
      <div className="relative z-10 px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-12">如何使用</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mb-4 border border-purple-600/50">
                <span className="text-2xl font-bold text-purple-400">1</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">连接钱包</h3>
              <p className="text-gray-400 text-sm">
                使用 Phantom 或其他 Solana 钱包连接
              </p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mb-4 border border-purple-600/50">
                <span className="text-2xl font-bold text-purple-400">2</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">创建卖单</h3>
              <p className="text-gray-400 text-sm">
                选择要出售的代币，设置价格和数量
              </p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mb-4 border border-purple-600/50">
                <span className="text-2xl font-bold text-purple-400">3</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">完成交易</h3>
              <p className="text-gray-400 text-sm">
                买家购买后，代币自动转账
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
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-400 transition-colors">
            Twitter
          </a>
          <a href="#" className="text-gray-500 hover:text-gray-400 transition-colors">
            Discord
          </a>
        </div>
        <p className="text-sm text-gray-600">
          Powered by Solana · Built with ❤️ by the community
        </p>
      </footer>
    </div>
  );
}
