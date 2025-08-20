"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserListings } from "./hooks/useUserListings";
import { usePurchase } from "./hooks/usePurchase";
import { useCancelListing } from "./hooks/useCancelListing";
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

interface UserListingsProps {
  userAddress: string;
  onRefresh?: () => void;
}

export function UserListings({ userAddress, onRefresh }: UserListingsProps) {
  const { publicKey, connected } = useWallet();
  const { listings: userListings, loading, error, refetch } = useUserListings(userAddress);
  const { purchaseToken } = usePurchase();
  const { cancelListing } = useCancelListing();
  const [purchaseLoadingStates, setPurchaseLoadingStates] = useState<Record<string, boolean>>({});
  const [cancelLoadingStates, setCancelLoadingStates] = useState<Record<string, boolean>>({});
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [purchaseAmount, setPurchaseAmount] = useState<string>("1");

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
          {userListings.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-2 text-lg">
                暂无卖单
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {userListings.map((listing) => (
                <ListingCard
                  key={listing.address}
                  listing={listing}
                  connected={connected}
                  isOwner={publicKey?.toBase58() === listing.seller}
                  showCancelButton={publicKey?.toBase58() === userAddress}
                  onPurchaseClick={setSelectedListing}
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
    </>
  );
}