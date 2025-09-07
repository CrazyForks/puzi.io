"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUserListings } from "./hooks/useUserListings";
import { usePurchase } from "./hooks/usePurchase";
import { useCancelListing } from "./hooks/useCancelListing";
import { Loader2, ShoppingCart, RefreshCw, Store } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { ListingCard } from "./ListingCard";
import { PurchaseModal } from "./PurchaseModal";
import { useTranslation } from "@/lib/i18n/context";

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
  const { t } = useTranslation();

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
      alert(t('errors.invalidAmount'));
      return;
    }

    const decimals = selectedListing.sellTokenDecimals ?? 9;
    const buyAmountInSmallestUnit = Math.floor(amount * Math.pow(10, decimals));
    
    // 验证数量不超过库存
    if (buyAmountInSmallestUnit > selectedListing.amount) {
      alert(`${t('errors.amountExceedsStock')} (${formatAmount(selectedListing.amount, decimals)})`);
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
            {t('shop.onSale')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-400">{t('common.loading')}...</span>
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
            {t('shop.onSale')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              {t('common.refresh')}
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
              {t('shop.onSale')} ({userListings.length})
            </CardTitle>
            <Button onClick={handleRefresh} variant="outline" size="sm" className="hover:bg-white/10">
              <RefreshCw className="w-4 h-4 mr-1" />
              {t('common.refresh')}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {userListings.length === 0 && !showAddButton ? (
            <div className="text-center py-16">
              <ShoppingCart className="w-20 h-20 text-gray-700 mx-auto mb-4 opacity-50" />
              <p className="text-gray-500 text-lg font-medium">
                {t('shop.noListings')}
              </p>
              <p className="text-gray-600 text-sm mt-2">
                {showAddButton ? t('shop.clickToList') : t('shop.ownerNoListings')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* 上架商品按钮 - 放在第一个位置 */}
              {showAddButton && (
                <button
                  onClick={onAddListing}
                  className="border-2 border-dashed border-gray-600 rounded-xl p-0 sm:p-5 flex flex-col items-center justify-center gap-2 sm:gap-3 hover:border-purple-500 hover:bg-purple-500/5 transition-all group h-full min-h-[180px] sm:min-h-[280px] cursor-pointer"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                    <Store className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                  </div>
                  <span className="text-gray-400 group-hover:text-white transition-colors font-medium text-sm sm:text-base">
                    {t('shop.listItem')}
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