"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletButton } from "@/components/counter/WalletButton";
import { createToken } from "@/lib/metaplex/token";
import { toast } from "sonner";

export default function NewToken() {
  const router = useRouter();
  const { connection } = useConnection();
  const wallet = useWallet();
  
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    supply: "",
    decimals: "9",
    description: "",
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!wallet.connected || !wallet.publicKey) {
      toast.error("请先连接钱包");
      return;
    }

    setIsCreating(true);
    
    try {
      toast.info("正在创建代币...");
      
      const result = await createToken({
        wallet,
        connection,
        metadata: {
          name: formData.name,
          symbol: formData.symbol,
          description: formData.description,
        },
        supply: parseInt(formData.supply),
        decimals: parseInt(formData.decimals),
      });

      if (result.success) {
        toast.success(`代币创建成功! 地址: ${result.mintAddress}`);
        
        // Redirect to token page after creation
        setTimeout(() => {
          router.push(`/`);
        }, 2000);
      }
    } catch (error: any) {
      console.error("Error creating token:", error);
      toast.error(`创建失败: ${error.message || "未知错误"}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen p-8 bg-gradient-to-b from-gray-950 via-gray-900 to-black">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-10"></div>
      
      <div className="relative z-10 max-w-2xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <button
            onClick={() => router.push("/")}
            className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
          >
            ← 返回首页
          </button>
          <WalletButton />
        </div>

        <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-8 border border-gray-800">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-blue-500 text-transparent bg-clip-text">
            创建新代币
          </h1>
          <p className="text-gray-400 mb-8">
            在 Solana 区块链上创建您的自定义代币
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                代币名称
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="例如: My Token"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="symbol" className="block text-sm font-medium text-gray-300 mb-2">
                代币符号
              </label>
              <input
                type="text"
                id="symbol"
                name="symbol"
                value={formData.symbol}
                onChange={handleChange}
                required
                placeholder="例如: MTK"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="supply" className="block text-sm font-medium text-gray-300 mb-2">
                总供应量
              </label>
              <input
                type="number"
                id="supply"
                name="supply"
                value={formData.supply}
                onChange={handleChange}
                required
                placeholder="例如: 1000000"
                min="1"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="decimals" className="block text-sm font-medium text-gray-300 mb-2">
                小数位数
              </label>
              <input
                type="number"
                id="decimals"
                name="decimals"
                value={formData.decimals}
                onChange={handleChange}
                required
                min="0"
                max="9"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                描述 (可选)
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                placeholder="描述您的代币..."
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
              />
            </div>


            <button
              type="submit"
              disabled={isCreating || !wallet.connected}
              className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {!wallet.connected ? "请先连接钱包" : isCreating ? "创建中..." : "创建代币"}
            </button>
          </form>

          <div className="mt-8 p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
            <p className="text-yellow-400 text-sm">
              <strong>注意：</strong> 创建代币需要支付 Solana 网络费用。请确保您的钱包中有足够的 SOL。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}