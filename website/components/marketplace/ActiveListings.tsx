"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActiveListings } from "./hooks/useActiveListings";
import { usePurchase } from "./hooks/usePurchase";
import { Loader2, ShoppingCart, RefreshCw } from "lucide-react";
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
    const buyAmountInSmallestUnit = Math.floor(amount * Math.pow(10, decimals));
    
    // 验证数量不超过库存
    if (buyAmountInSmallestUnit > selectedListing.amount) {
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
        buyAmountInSmallestUnit,
        selectedListing.pricePerToken,
        selectedListing.listingId,
        selectedListing.sellTokenDecimals,
        selectedListing.buyTokenDecimals
      );
      
      if (success) {
        // 关闭弹窗并刷新列表
        setSelectedListing(null);
        setPurchaseAmount("1");
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
              onPurchaseClick={setSelectedListing}
              purchaseLoading={purchaseLoadingStates[listing.address]}
            />
          ))}
          </div>
        )}

        {/* Purchase Modal */}
        <Dialog open={!!selectedListing} onOpenChange={(open) => !open && setSelectedListing(null)}>
          <DialogContent className="bg-gray-900 border-gray-800">
            <DialogHeader>
              <DialogTitle className="text-white">购买确认</DialogTitle>
              <DialogDescription className="text-gray-400">
                {selectedListing && (
                  <>
                    购买 {selectedListing.sellTokenName || selectedListing.sellTokenSymbol}
                    <br />
                    库存: {formatAmount(selectedListing.amount, selectedListing.sellTokenDecimals ?? 9)}
                    <br />
                    单价: {formatPrice(selectedListing.pricePerToken, selectedListing.buyTokenDecimals ?? 9)} {selectedListing.buyTokenSymbol}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">购买数量</label>
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
                    className="flex-1 bg-gray-800 border-gray-700 text-white"
                    placeholder="输入数量"
                  />
                  <Button
                    variant="outline"
                    onClick={handleSelectAll}
                    className="border-gray-700 hover:bg-gray-800"
                  >
                    全部
                  </Button>
                </div>
                {selectedListing && purchaseAmount && (
                  <p className="text-xs text-gray-500 mt-2">
                    总价: {(parseFloat(purchaseAmount) * formatPrice(selectedListing.pricePerToken, selectedListing.buyTokenDecimals ?? 9)).toFixed(6)} {selectedListing.buyTokenSymbol}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedListing(null);
                  setPurchaseAmount("1");
                }}
                className="border-gray-700 hover:bg-gray-800"
              >
                取消
              </Button>
              <Button
                onClick={handlePurchase}
                disabled={purchaseLoadingStates[selectedListing?.address]}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
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