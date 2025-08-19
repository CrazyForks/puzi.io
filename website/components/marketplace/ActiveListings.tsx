"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActiveListings } from "./hooks/useActiveListings";
import { usePurchase } from "./hooks/usePurchase";
import { Loader2, ShoppingCart, RefreshCw } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { useState } from "react";
import { getTokenByMint } from "@/config/known-tokens";

interface ActiveListingsProps {
  onRefresh?: () => void;
}

export function ActiveListings({ onRefresh }: ActiveListingsProps) {
  const { publicKey, connected } = useWallet();
  const { listings, loading, error, refetch } = useActiveListings();
  const { purchaseToken } = usePurchase();
  const [purchaseAmounts, setPurchaseAmounts] = useState<Record<string, string>>({});
  const [purchaseLoadingStates, setPurchaseLoadingStates] = useState<Record<string, boolean>>({});

  const handleRefresh = () => {
    refetch();
    onRefresh?.();
  };

  const handlePurchase = async (listing: any) => {
    const inputAmount = purchaseAmounts[listing.address] || "1";
    const amount = parseFloat(inputAmount);
    
    if (isNaN(amount) || amount <= 0) {
      alert("请输入有效的购买数量");
      return;
    }

    const decimals = listing.sellTokenDecimals ?? 9;
    const buyAmountInSmallestUnit = Math.floor(amount * Math.pow(10, decimals));
    
    // 验证数量不超过库存
    if (buyAmountInSmallestUnit > listing.amount) {
      alert(`购买数量不能超过库存 (${formatAmount(listing.amount, decimals)})`);
      return;
    }

    // 设置当前列表项的加载状态
    setPurchaseLoadingStates(prev => ({ ...prev, [listing.address]: true }));

    try {
      const success = await purchaseToken(
        listing.address,
        listing.sellMint,
        listing.buyMint,
        listing.seller,
        buyAmountInSmallestUnit,
        listing.pricePerToken,
        listing.listingId,
        listing.sellTokenDecimals,
        listing.buyTokenDecimals
      );
      
      if (success) {
        // 清空输入框并刷新列表
        setPurchaseAmounts(prev => ({ ...prev, [listing.address]: "" }));
        refetch();
      }
    } finally {
      // 清除加载状态
      setPurchaseLoadingStates(prev => ({ ...prev, [listing.address]: false }));
    }
  };

  const handleAmountChange = (listingAddress: string, value: string) => {
    // 只允许数字和小数点
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setPurchaseAmounts(prev => ({ ...prev, [listingAddress]: value }));
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


  return (
    <Card className="bg-black/20 backdrop-blur-sm border border-gray-800">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            市场卖单 ({listings.length})
          </CardTitle>
          <Button onClick={handleRefresh} variant="outline" size="sm" className="hover:bg-white/10">
            <RefreshCw className="w-4 h-4 mr-1" />
            刷新
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {listings.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-2 text-lg">
              暂无卖单
            </p>
            <p className="text-sm text-gray-500">
              成为第一个创建卖单的人！
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[600px] overflow-y-auto pr-2">
            {listings.map((listing) => (
              <div
                key={listing.address}
                className="group relative p-5 rounded-xl border border-gray-700/50 bg-gradient-to-br from-gray-800/30 to-gray-900/30 hover:from-gray-800/50 hover:to-gray-900/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-900/10 hover:border-purple-600/30"
              >
                {/* Selling Token Display */}
                <div className="mb-4">
                  <div className="flex flex-col items-center">
                    {/* Token Image */}
                    {listing.sellTokenImage ? (
                      <img 
                        src={listing.sellTokenImage} 
                        alt={listing.sellTokenName}
                        className="w-16 h-16 rounded-full mb-3 object-cover border-2 border-gray-700"
                      />
                    ) : (
                      <div className={`w-16 h-16 rounded-full ${getTokenColor(listing.sellTokenSymbol)} flex items-center justify-center shadow-lg mb-3`}>
                        <span className="text-xl font-bold text-white">
                          {listing.sellTokenSymbol?.charAt(0) || "?"}
                        </span>
                      </div>
                    )}
                    
                    {/* Token Name */}
                    <h3 className="text-white font-semibold text-lg text-center">
                      {listing.sellTokenName || listing.sellTokenSymbol}
                    </h3>
                    
                    {/* Token Description */}
                    {listing.sellTokenDescription && (
                      <p className="text-gray-500 text-xs mt-2 text-center line-clamp-2">
                        {listing.sellTokenDescription}
                      </p>
                    )}
                  </div>
                </div>

                {/* Price Info */}
                <div className="bg-gray-900/50 rounded-lg p-3 mb-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">数量:</span>
                    <span className="text-white">
                      {formatAmount(listing.amount, listing.sellTokenDecimals ?? 9)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">单价:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-white font-bold">
                        {formatPrice(listing.pricePerToken, listing.buyTokenDecimals ?? 9)}
                      </span>
                      {(() => {
                        const knownToken = getTokenByMint(listing.buyMint);
                        if (knownToken?.logoURI) {
                          return (
                            <img 
                              src={knownToken.logoURI} 
                              alt={knownToken.symbol}
                              className="w-4 h-4 rounded-full"
                            />
                          );
                        }
                        return null;
                      })()}
                      <span className="text-white font-bold">
                        {listing.buyTokenSymbol}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Purchase Quantity Input */}
                {connected && (
                  <div className="mb-2">
                    <label className="text-xs text-gray-400 mb-1 block">购买数量:</label>
                    <Input
                      type="text"
                      placeholder="输入数量"
                      value={purchaseAmounts[listing.address] || ""}
                      onChange={(e) => handleAmountChange(listing.address, e.target.value)}
                      className="w-full h-8 text-sm bg-gray-900/50 border-gray-700 text-white"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      最大: {formatAmount(listing.amount, listing.sellTokenDecimals ?? 9)}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2">
                  {connected ? (
                    <Button
                      size="sm"
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium"
                      onClick={() => handlePurchase(listing)}
                      disabled={purchaseLoadingStates[listing.address]}
                    >
                      {purchaseLoadingStates[listing.address] ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <ShoppingCart className="w-4 h-4 mr-2" />
                      )}
                      购买
                    </Button>
                  ) : (
                    <Button size="sm" disabled variant="outline" className="w-full">
                      请连接钱包
                    </Button>
                  )}
                </div>

                {/* Seller Info */}
                <div className="mt-3 pt-3 border-t border-gray-700/30">
                  <Link 
                    href={`/${listing.seller}`}
                    className="text-xs text-gray-500 hover:text-purple-400 transition-colors block text-center"
                  >
                    卖家: {listing.seller.slice(0, 4)}...{listing.seller.slice(-4)}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}