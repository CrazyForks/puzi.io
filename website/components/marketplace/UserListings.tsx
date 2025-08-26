"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUserListings } from "./hooks/useUserListings";
import { usePurchase } from "./hooks/usePurchase";
import { useCancelListing } from "./hooks/useCancelListing";
import { Loader2, ShoppingCart, RefreshCw, Store } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { getTokenByMint } from "@/config/known-tokens";
import { ListingCard } from "./ListingCard";
import { PurchaseModal } from "./PurchaseModal";

interface UserListingsProps {
  userAddress: string;
  onRefresh?: () => void;
  onAddListing?: () => void;
  showAddButton?: boolean;
}

export function UserListings({ userAddress, onRefresh, onAddListing, showAddButton = false }: UserListingsProps) {
  const { publicKey, connected } = useWallet();
  const { listings: userListings, loading, error, refetch } = useUserListings(userAddress);
  const { purchaseToken } = usePurchase();
  const { cancelListing } = useCancelListing();
  const [purchaseLoadingStates, setPurchaseLoadingStates] = useState<Record<string, boolean>>({});
  const [cancelLoadingStates, setCancelLoadingStates] = useState<Record<string, boolean>>({});
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  const handleRefresh = () => {
    refetch();
    onRefresh?.();
  };

  const handleCancelListing = async (listing: { address: string; sellMint: string; listingId: number }) => {
    setCancelLoadingStates(prev => ({ ...prev, [listing.address]: true }));
    
    try {
      const success = await cancelListing(
        listing.address,
        listing.sellMint,
        listing.listingId
      );
      
      if (success) {
        refetch();
      }
    } finally {
      setCancelLoadingStates(prev => ({ ...prev, [listing.address]: false }));
    }
  };

  const handlePurchase = async (purchaseAmount: string) => {
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
    setPurchaseLoading(true);

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
      <Card className="bg-black/20 backdrop-blur-sm border border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            在售商品
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
            在售商品
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
    <>
      <Card className="bg-black/20 backdrop-blur-sm border border-gray-800">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-white flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              在售商品 ({userListings.length})
            </CardTitle>
            <Button onClick={handleRefresh} variant="outline" size="sm" className="hover:bg-white/10">
              <RefreshCw className="w-4 h-4 mr-1" />
              刷新
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {userListings.length === 0 && !showAddButton ? (
            <div className="text-center py-16">
              <ShoppingCart className="w-20 h-20 text-gray-700 mx-auto mb-4 opacity-50" />
              <p className="text-gray-500 text-lg font-medium">
                暂无在售商品
              </p>
              <p className="text-gray-600 text-sm mt-2">
                {showAddButton ? "点击上架按钮开始销售" : "店主还没有上架任何商品"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* 上架商品按钮 - 放在第一个位置 */}
              {showAddButton && (
                <button
                  onClick={onAddListing}
                  className="border-2 border-dashed border-gray-600 rounded-xl p-5 flex flex-col items-center justify-center gap-3 hover:border-purple-500 hover:bg-purple-500/5 transition-all group h-full min-h-[280px] cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                    <Store className="w-6 h-6 text-purple-400" />
                  </div>
                  <span className="text-gray-400 group-hover:text-white transition-colors font-medium">
                    上架商品
                  </span>
                </button>
              )}
              
              {userListings.map((listing) => (
                <ListingCard
                  key={listing.address}
                  listing={listing}
                  connected={connected}
                  isOwner={publicKey?.toBase58() === listing.seller}
                  showCancelButton={publicKey?.toBase58() === userAddress}
                  onPurchaseClick={(listing) => {
                    setSelectedListing(listing);
                  }}
                  onCancelClick={handleCancelListing}
                  purchaseLoading={purchaseLoadingStates[listing.address]}
                  cancelLoading={cancelLoadingStates[listing.address]}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Purchase Modal */}
      <PurchaseModal
        open={!!selectedListing}
        onOpenChange={(open) => !open && setSelectedListing(null)}
        listing={selectedListing}
        onConfirm={handlePurchase}
        loading={purchaseLoading}
      />
    </>
  );
}