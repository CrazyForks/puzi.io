"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface PurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: any;
  onConfirm: (amount: string) => Promise<void>;
  loading?: boolean;
  tokenInfo?: {
    name?: string;
    symbol?: string;
  };
  isReverseListing?: boolean;
}

export function PurchaseModal({
  open,
  onOpenChange,
  listing,
  onConfirm,
  loading = false,
  tokenInfo,
  isReverseListing = false,
}: PurchaseModalProps) {
  const [purchaseAmount, setPurchaseAmount] = useState<string>("");

  const formatAmount = (amount: number) => {
    if (!amount || amount === 0) return "0";
    return amount.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6
    });
  };

  // Clear purchase amount when modal opens
  useEffect(() => {
    if (open) {
      setPurchaseAmount("");
    }
  }, [open]);

  const formatPrice = (price: number) => {
    if (!price || price === 0) return "0";
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6
    });
  };

  const handleSelectAll = () => {
    if (!listing) return;
    
    if (isReverseListing) {
      // For reverse listings, total is USDC amount
      const total = listing.total || listing.amount / Math.pow(10, listing.sellTokenDecimals ?? 9);
      setPurchaseAmount(total.toString());
    } else {
      const maxAmount = listing.amount / Math.pow(10, listing.sellTokenDecimals ?? 9);
      setPurchaseAmount(maxAmount.toString());
    }
  };

  const handleConfirm = async () => {
    await onConfirm(purchaseAmount);
    setPurchaseAmount("");
  };

  const handleCancel = () => {
    onOpenChange(false);
    setPurchaseAmount("");
  };

  if (!listing) return null;

  // Determine what token is being purchased and what is being paid
  const purchaseTokenSymbol = isReverseListing 
    ? (listing.buyTokenSymbol || 'USDC')
    : (listing.sellTokenSymbol || tokenInfo?.symbol || 'Token');
    
  const purchaseTokenName = isReverseListing
    ? (listing.buyTokenName || listing.buyTokenSymbol || 'USDC')
    : (listing.sellTokenName || listing.sellTokenSymbol || tokenInfo?.name || tokenInfo?.symbol || 'Token');
    
  const paymentTokenSymbol = isReverseListing
    ? (tokenInfo?.symbol || listing.sellTokenSymbol || 'Token')
    : (listing.buyTokenSymbol || 'USDC');

  const purchaseTokenMint = listing.sellMint;
  
  const availableAmount = isReverseListing
    ? listing.total
    : listing.amount / Math.pow(10, listing.sellTokenDecimals ?? 9);

  // Calculate price display
  let priceDisplay;
  let priceValue;
  
  if (isReverseListing) {
    // For reverse listing: show Token/USDC price
    const tokenPerUsdc = listing.price > 0 ? 1 / listing.price : 0;
    priceValue = tokenPerUsdc;
    priceDisplay = `${formatPrice(tokenPerUsdc)} ${tokenInfo?.symbol || 'Token'}/USDC`;
  } else {
    // For normal listing: show USDC/Token price
    priceValue = listing.pricePerToken / Math.pow(10, listing.buyTokenDecimals ?? 9);
    priceDisplay = `${formatPrice(priceValue)} ${listing.buyTokenSymbol || 'USDC'}/${tokenInfo?.symbol || listing.sellTokenSymbol || 'Token'}`;
  }

  // Precision validation
  const decimals = listing.sellTokenDecimals ?? 9;
  const inputValue = parseFloat(purchaseAmount) || 0;
  const isValidPrecision = purchaseAmount === "" || (inputValue * Math.pow(10, decimals)) % 1 === 0;
  const minAmount = Math.pow(10, -decimals);

  // Calculate total payment
  let totalPayment = 0;
  if (isValidPrecision && inputValue > 0) {
    if (isReverseListing) {
      // Buying USDC with Token: inputValue is USDC amount
      // We need to calculate how many tokens are needed to buy this amount of USDC
      // listing.pricePerToken is the price per USDC in Token's smallest units
      const pricePerUsdc = listing.pricePerToken / Math.pow(10, listing.buyTokenDecimals ?? 9);
      totalPayment = inputValue * pricePerUsdc;
    } else {
      // Buying Token with USDC: inputValue is Token amount
      const pricePerToken = listing.pricePerToken / Math.pow(10, listing.buyTokenDecimals ?? 9);
      totalPayment = inputValue * pricePerToken;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-xl font-bold">购买确认</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* 代币信息卡片 */}
          <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">购买代币</span>
              <a 
                href={`https://solscan.io/token/${purchaseTokenMint}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white font-medium hover:text-purple-400 transition-colors flex items-center gap-1 cursor-pointer"
              >
                {purchaseTokenName}
                <ExternalLink className="w-3 h-3 text-gray-500" />
              </a>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">可购买量</span>
              <span className="text-white font-medium">
                {formatAmount(availableAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">单价</span>
              <span className="text-white font-medium">
                {priceDisplay}
              </span>
            </div>
          </div>

          {/* 购买数量输入 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              购买数量 ({purchaseTokenSymbol})
            </label>
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
                className="flex-1 bg-gray-800 border-gray-700 text-white transition-colors"
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
                {decimals > 1 && ` (精确到小数点后${decimals}位)`}
              </p>
            </div>
          </div>

          {/* 总价显示 */}
          {purchaseAmount && inputValue > 0 && isValidPrecision && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">总计支付</span>
                <span className="text-white text-lg font-bold">
                  {totalPayment.toFixed(6)} {paymentTokenSymbol}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="border-gray-700 hover:bg-gray-800"
          >
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValidPrecision || inputValue <= 0 || loading}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
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
  );
}