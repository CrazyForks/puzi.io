"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useActiveListings } from "./hooks/useActiveListings";
import { useCancelListing } from "./hooks/useCancelListing";
import { Loader2, ShoppingCart, Trash2, RefreshCw } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";

interface ActiveListingsProps {
  onRefresh?: () => void;
  userAddress?: string;
}

export function ActiveListings({ onRefresh, userAddress }: ActiveListingsProps) {
  const { publicKey, connected } = useWallet();
  const { listings, userListings, otherListings, loading, error, refetch } = useActiveListings();
  const { cancelListing, loading: cancelLoading } = useCancelListing();
  const [activeTab, setActiveTab] = useState<"all" | "mine" | "others">("all");

  const handleRefresh = () => {
    refetch();
    onRefresh?.();
  };

  const handleCancelListing = async (listing: { address: string; sellMint: string; listingId: number }) => {
    const success = await cancelListing(
      listing.address,
      listing.sellMint,
      listing.listingId
    );
    
    if (success) {
      // 刷新列表
      refetch();
    }
  };

  const getDisplayListings = () => {
    // If userAddress is provided, filter listings by that address
    if (userAddress) {
      return listings.filter(listing => listing.seller === userAddress);
    }
    
    // Otherwise use tab-based filtering
    switch (activeTab) {
      case "mine":
        return userListings;
      case "others":
        return otherListings;
      default:
        return listings;
    }
  };

  const formatPrice = (price: number, decimals: number = 9) => {
    return (price / Math.pow(10, decimals)).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6
    });
  };

  const formatAmount = (amount: number, decimals: number = 9) => {
    return (amount / Math.pow(10, decimals)).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6
    });
  };

  const getTokenIcon = (symbol?: string) => {
    if (symbol === "SOL") {
      return <span className="text-sm font-bold text-white">◎</span>;
    }
    return <span className="text-xs font-bold text-white">{symbol?.charAt(0) || "?"}</span>;
  };

  const getTokenColor = (symbol?: string) => {
    if (symbol === "SOL") {
      return "bg-gradient-to-r from-green-400 to-blue-500";
    }
    return "bg-gradient-to-r from-purple-400 to-blue-500";
  };

  if (loading) {
    return (
      <Card className="bg-black/20 backdrop-blur-sm border border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            市场卖单
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-400">加载卖单中...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-black/20 backdrop-blur-sm border border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            市场卖单
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              重试
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayListings = getDisplayListings();

  return (
    <Card className="bg-black/20 backdrop-blur-sm border border-gray-800">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            {userAddress ? `在售商品 (${displayListings.length})` : `市场卖单 (${listings.length})`}
          </CardTitle>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-1" />
            刷新
          </Button>
        </div>

        {/* 标签页 - Only show when not filtering by specific user */}
        {connected && !userAddress && (
          <div className="flex space-x-1 bg-gray-800/50 p-1 rounded-md">
            <button
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                activeTab === "all" 
                  ? "bg-purple-600 text-white" 
                  : "text-gray-400 hover:text-white"
              }`}
              onClick={() => setActiveTab("all")}
            >
              全部 ({listings.length})
            </button>
            <button
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                activeTab === "mine" 
                  ? "bg-purple-600 text-white" 
                  : "text-gray-400 hover:text-white"
              }`}
              onClick={() => setActiveTab("mine")}
            >
              我的 ({userListings.length})
            </button>
            <button
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                activeTab === "others" 
                  ? "bg-purple-600 text-white" 
                  : "text-gray-400 hover:text-white"
              }`}
              onClick={() => setActiveTab("others")}
            >
              市场 ({otherListings.length})
            </button>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {displayListings.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">
              {activeTab === "mine" ? "你还没有创建任何卖单" : "暂无卖单"}
            </p>
            <p className="text-sm text-gray-500">
              {activeTab === "mine" ? "创建代币并上架开始交易" : "成为第一个创建卖单的人！"}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {displayListings.map((listing) => (
              <div
                key={listing.address}
                className="p-4 rounded-lg border border-gray-700 bg-gray-800/50 hover:bg-gray-800/70 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    {/* 卖的代币 */}
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full ${getTokenColor(listing.sellTokenSymbol)} flex items-center justify-center`}>
                        {getTokenIcon(listing.sellTokenSymbol)}
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">
                          {listing.sellTokenSymbol}
                        </p>
                        <p className="text-xs text-gray-400">
                          卖出
                        </p>
                      </div>
                    </div>

                    <div className="text-gray-400 mx-2">→</div>

                    {/* 收的代币 */}
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full ${getTokenColor(listing.buyTokenSymbol)} flex items-center justify-center`}>
                        {getTokenIcon(listing.buyTokenSymbol)}
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">
                          {listing.buyTokenSymbol}
                        </p>
                        <p className="text-xs text-gray-400">
                          收取
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    {/* 价格信息 */}
                    <p className="text-white font-medium">
                      {formatPrice(listing.pricePerToken, listing.buyTokenDecimals || 9)} {listing.buyTokenSymbol}
                    </p>
                    <p className="text-xs text-gray-400">单价</p>
                  </div>
                </div>

                <div className="mt-3 flex justify-between items-center">
                  <div className="flex gap-4 text-sm text-gray-400">
                    <span>
                      数量: {formatAmount(listing.amount, listing.sellTokenDecimals || 9)} {listing.sellTokenSymbol}
                    </span>
                    <span>
                      总价: {formatPrice(listing.pricePerToken * listing.amount / Math.pow(10, (listing.sellTokenDecimals || 9)), listing.buyTokenDecimals || 9)} {listing.buyTokenSymbol}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {/* 如果是自己的卖单，显示取消按钮 */}
                    {connected && publicKey && listing.seller === publicKey.toBase58() && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-400 border-red-400/30 hover:bg-red-400/10"
                        onClick={() => handleCancelListing(listing)}
                        disabled={cancelLoading}
                      >
                        {cancelLoading ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3 mr-1" />
                        )}
                        取消
                      </Button>
                    )}
                    
                    {/* 如果不是自己的卖单，显示购买按钮 */}
                    {connected && publicKey && listing.seller !== publicKey.toBase58() && (
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                      >
                        <ShoppingCart className="w-3 h-3 mr-1" />
                        购买
                      </Button>
                    )}

                    {/* 如果没连接钱包，显示连接提示 */}
                    {!connected && (
                      <Button size="sm" disabled variant="outline">
                        请连接钱包
                      </Button>
                    )}
                  </div>
                </div>

                {/* 卖家信息 */}
                <div className="mt-2 pt-2 border-t border-gray-700/50">
                  <p className="text-xs text-gray-500">
                    卖家: {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
                    {connected && publicKey && listing.seller === publicKey.toBase58() && (
                      <span className="ml-2 px-2 py-0.5 bg-purple-600/20 text-purple-400 rounded text-xs">
                        我的
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}