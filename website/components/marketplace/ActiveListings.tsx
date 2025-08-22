"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActiveListings } from "./hooks/useActiveListings";
import { usePurchase } from "./hooks/usePurchase";
import { Loader2, ShoppingCart, RefreshCw, ExternalLink } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { getTokenByMint } from "@/config/known-tokens";
import { ListingCard } from "./ListingCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface ActiveListingsProps {
  onRefresh?: () => void;
}

export function ActiveListings({ onRefresh }: ActiveListingsProps) {
  const { publicKey, connected } = useWallet();
  const { listings, loading, error, refetch } = useActiveListings();
  const { purchaseToken } = usePurchase();
  const [purchaseLoadingStates, setPurchaseLoadingStates] = useState<Record<string, boolean>>({});
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [purchaseAmount, setPurchaseAmount] = useState<string>("1");

  const handleRefresh = () => {
    refetch();
    onRefresh?.();
  };

  const handlePurchase = async () => {
    if (!selectedListing) return;
    
    const amount = parseFloat(purchaseAmount);
    
    if (isNaN(amount) || amount <= 0) {
      alert("请输入有效的购买数量");
      return;
    }

    const decimals = selectedListing.sellTokenDecimals ?? 9;
    
    // 验证精度是否正确
    const buyAmountInSmallestUnit = amount * Math.pow(10, decimals);
    if (buyAmountInSmallestUnit % 1 !== 0) {
      alert(`购买数量的精度不能超过 ${decimals} 位小数。\n例如：${decimals === 0 ? '只能购买整数个（如 1, 2, 3）' : decimals === 1 ? '只能精确到小数点后1位（如 1.1, 2.5）' : `只能精确到小数点后${decimals}位`}`);
      return;
    }
    
    const buyAmountInSmallestUnitInt = Math.floor(buyAmountInSmallestUnit);
    
    // 验证数量不超过库存
    if (buyAmountInSmallestUnitInt > selectedListing.amount) {
      alert(`购买数量不能超过库存 (${formatAmount(selectedListing.amount, decimals)})`);
      return;
    }

    // 设置当前列表项的加载状态
    setPurchaseLoadingStates(prev => ({ ...prev, [selectedListing.address]: true }));

    try {
      const success = await purchaseToken(
        selectedListing.address,
        selectedListing.sellMint,
        selectedListing.buyMint,
        selectedListing.seller,
        buyAmountInSmallestUnitInt,
        selectedListing.pricePerToken,
        selectedListing.listingId,
        selectedListing.sellTokenDecimals,
        selectedListing.buyTokenDecimals
      );
      
      if (success) {
        // 关闭弹窗并刷新列表
        setSelectedListing(null);
        // 不需要重置购买数量，下次打开会自动设置为全部
        refetch();
      }
    } finally {
      // 清除加载状态
      setPurchaseLoadingStates(prev => ({ ...prev, [selectedListing.address]: false }));
    }
  };

  const handleSelectAll = () => {
    if (selectedListing) {
      const maxAmount = formatAmount(selectedListing.amount, selectedListing.sellTokenDecimals ?? 9);
      setPurchaseAmount(maxAmount);
    }
  };

  const formatPrice = (pricePerToken: number, buyDecimals: number = 9, sellDecimals: number = 9) => {
    // pricePerToken 现在直接是每个完整代币的价格（以买币最小单位存储）
    // 转换为UI显示：除以买币的小数位
    const displayPrice = pricePerToken / Math.pow(10, buyDecimals);
    return displayPrice.toLocaleString(undefined, {
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



  if (loading) {
    return (
      <div className="w-full">
        <h2 className="text-white text-2xl font-bold flex items-center gap-2 mb-6">
          <ShoppingCart className="w-6 h-6" />
          市场卖单
        </h2>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-400">加载卖单中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <h2 className="text-white text-2xl font-bold flex items-center gap-2 mb-6">
          <ShoppingCart className="w-6 h-6" />
          市场卖单
        </h2>
        <div className="text-center py-8">
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            重试
          </Button>
        </div>
      </div>
    );
  }


  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-white text-2xl font-bold flex items-center gap-2">
          <ShoppingCart className="w-6 h-6" />
          市场卖单 ({listings.length})
        </h2>
        <Button onClick={handleRefresh} variant="outline" size="sm" className="hover:bg-white/10">
          <RefreshCw className="w-4 h-4 mr-1" />
          刷新
        </Button>
      </div>
      
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {listings.map((listing) => (
            <ListingCard
              key={listing.address}
              listing={listing}
              connected={connected}
              onPurchaseClick={(listing) => {
                setSelectedListing(listing);
                // 设置购买数量为全部
                const maxAmount = formatAmount(listing.amount, listing.sellTokenDecimals ?? 9);
                setPurchaseAmount(maxAmount);
              }}
              purchaseLoading={purchaseLoadingStates[listing.address]}
            />
          ))}
          </div>
        )}

        {/* Purchase Modal */}
        <Dialog open={!!selectedListing} onOpenChange={(open) => !open && setSelectedListing(null)}>
          <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white text-xl font-bold">购买确认</DialogTitle>
            </DialogHeader>
            
            {selectedListing && (
              <div className="space-y-6">
                {/* 代币信息卡片 */}
                <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">代币</span>
                    <a 
                      href={`https://solscan.io/token/${selectedListing.sellMint}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white font-medium hover:text-purple-400 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      {selectedListing.sellTokenName || selectedListing.sellTokenSymbol}
                      <ExternalLink className="w-3 h-3 text-gray-500" />
                    </a>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">可购买量</span>
                    <span className="text-white font-medium">
                      {formatAmount(selectedListing.amount, selectedListing.sellTokenDecimals ?? 9)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">单价</span>
                    <span className="text-white font-medium">
                      {formatPrice(selectedListing.pricePerToken, selectedListing.buyTokenDecimals ?? 9, selectedListing.sellTokenDecimals ?? 9)} {selectedListing.buyTokenSymbol}
                    </span>
                  </div>
                </div>

                {/* 购买数量输入 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">购买数量</label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={purchaseAmount}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "" || /^\d*\.?\d*$/.test(value)) {
                          setPurchaseAmount(value);
                        }
                      }}
                      className="flex-1 bg-gray-800 border-gray-700 text-white focus:border-purple-500 transition-colors"
                      placeholder="输入购买数量"
                    />
                    <Button
                      variant="outline"
                      onClick={handleSelectAll}
                      className="border-gray-700 hover:bg-gray-800 hover:border-purple-500 transition-colors"
                    >
                      全部
                    </Button>
                  </div>
                  
                  {/* 精度提示 */}
                  {(() => {
                    const decimals = selectedListing.sellTokenDecimals ?? 9;
                    const minAmount = Math.pow(10, -decimals);
                    const inputValue = parseFloat(purchaseAmount) || 0;
                    const isValidPrecision = purchaseAmount === "" || 
                      (inputValue * Math.pow(10, decimals)) % 1 === 0;
                    
                    return (
                      <div className="space-y-1">
                        {!isValidPrecision && purchaseAmount !== "" && (
                          <p className="text-xs text-red-400">
                            ⚠️ 输入的数量精度超过代币支持的小数位数
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          最小购买单位: {minAmount.toFixed(decimals)}
                          {decimals === 0 && " (必须购买整数个)"}
                          {decimals === 1 && " (精确到小数点后1位)"}
                          {decimals > 2 && ` (精确到小数点后${decimals}位)`}
                        </p>
                      </div>
                    );
                  })()}
                </div>

                {/* 总价显示 */}
                {purchaseAmount && parseFloat(purchaseAmount) > 0 && (() => {
                  const inputValue = parseFloat(purchaseAmount);
                  const decimals = selectedListing.sellTokenDecimals ?? 9;
                  const isValidPrecision = (inputValue * Math.pow(10, decimals)) % 1 === 0;
                  
                  if (isValidPrecision) {
                    const totalPrice = inputValue * (selectedListing.pricePerToken / Math.pow(10, selectedListing.buyTokenDecimals ?? 9));
                    return (
                      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300 text-sm">总计支付</span>
                          <span className="text-white text-lg font-bold">
                            {totalPrice.toFixed(6)} {selectedListing.buyTokenSymbol}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedListing(null);
                  // 不需要重置购买数量，下次打开会自动设置为全部
                }}
                className="border-gray-700 hover:bg-gray-800"
              >
                取消
              </Button>
              <Button
                onClick={handlePurchase}
                disabled={(() => {
                  if (!selectedListing || !purchaseAmount) return true;
                  if (purchaseLoadingStates[selectedListing.address]) return true;
                  
                  // 检查精度是否正确
                  const decimals = selectedListing.sellTokenDecimals ?? 9;
                  const inputValue = parseFloat(purchaseAmount) || 0;
                  const isValidPrecision = (inputValue * Math.pow(10, decimals)) % 1 === 0;
                  
                  return !isValidPrecision || inputValue <= 0;
                })()}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {purchaseLoadingStates[selectedListing?.address] ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    购买中...
                  </>
                ) : (
                  '确认购买'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
}