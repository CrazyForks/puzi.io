"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WalletButton } from "@/components/counter/WalletButton";
import { useWallet } from "@solana/wallet-adapter-react";
import { TokenList, TokenListRef } from "./TokenList";
import { ListingForm } from "./ListingForm";
import { ActiveListings } from "./ActiveListings";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useState, useRef } from "react";

interface TokenInfo {
  mint: string;
  amount: number;
  name?: string;
  symbol?: string;
  decimals: number;
  logoURI?: string;
}

export function MarketplaceCard() {
  const { connected } = useWallet();
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const tokenListRef = useRef<TokenListRef>(null);
  
  const handleListingComplete = () => {
    setSelectedToken(null);
    // 这里会触发ActiveListings的刷新
  };

  if (!connected) {
    return (
      <Card className="w-full max-w-2xl mx-auto bg-black/20 backdrop-blur-sm border border-gray-800">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white">
            代币售卖平台
          </CardTitle>
          <CardDescription className="text-gray-400">
            连接钱包后开始上架你的代币
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <WalletButton />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <Card className="bg-black/20 backdrop-blur-sm border border-gray-800">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-bold text-white">
                代币售卖平台
              </CardTitle>
              <CardDescription className="text-gray-400">
                创建、交易和管理你的代币
              </CardDescription>
            </div>
            <WalletButton />
          </div>
        </CardHeader>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 左侧：代币选择 */}
        <div className="space-y-4">
          <Card className="bg-black/20 backdrop-blur-sm border border-gray-800">
            <CardContent className="p-6">
              <Link 
                href="/token/new"
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-all"
              >
                <Plus className="w-4 h-4 mr-2" />
                创建新代币
              </Link>
            </CardContent>
          </Card>
          <TokenList 
            ref={tokenListRef}
            selectedToken={selectedToken}
            onTokenSelect={setSelectedToken}
          />
        </div>
        
        {/* 中间：上架表单 */}
        <ListingForm 
          selectedToken={selectedToken}
          onListingComplete={handleListingComplete}
        />
        
        {/* 右侧：市场卖单 */}
        <ActiveListings 
          onRefresh={() => {
            // 可以在这里添加其他刷新逻辑
          }}
        />
      </div>
    </div>
  );
}