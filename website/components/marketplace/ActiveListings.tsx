"use client";
import { Button } from "@/components/ui/button";
import { useActiveListings } from "./hooks/useActiveListings";
import { usePurchase } from "./hooks/usePurchase";
import { Loader2, ShoppingCart, RefreshCw } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { getTokenByMint } from "@/config/known-tokens";
import { ListingCard } from "./ListingCard";
import { PurchaseModal } from "./PurchaseModal";

interface ActiveListingsProps {
  onRefresh?: () => void;
}

export function ActiveListings({ onRefresh }: ActiveListingsProps) {
  const { publicKey, connected } = useWallet();
  const { listings, loading, error, refetch } = useActiveListings();
  const { purchaseToken } = usePurchase();
  const [purchaseLoadingStates, setPurchaseLoadingStates] = useState<Record<string, boolean>>({});
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  const handleRefresh = () => {
    refetch();
    onRefresh?.();
  };

  const handlePurchase = async (purchaseAmount: string) => {
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
    setPurchaseLoading(true);

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
        refetch();
      }
    } finally {
      // 清除加载状态
      setPurchaseLoadingStates(prev => ({ ...prev, [selectedListing.address]: false }));
      setPurchaseLoading(false);
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
              }}
              purchaseLoading={purchaseLoadingStates[listing.address]}
            />
          ))}
          </div>
        )}

        {/* Purchase Modal */}
        <PurchaseModal
          open={!!selectedListing}
          onOpenChange={(open) => !open && setSelectedListing(null)}
          listing={selectedListing}
          onConfirm={handlePurchase}
          loading={purchaseLoading}
        />
    </div>
  );
}