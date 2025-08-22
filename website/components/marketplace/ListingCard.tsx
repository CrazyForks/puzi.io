"use client";

import { Button } from "@/components/ui/button";
import { Loader2, ShoppingCart, ExternalLink, Trash2, Info } from "lucide-react";
import { getTokenByMint } from "@/config/known-tokens";
import { useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { getTotalRentRefund } from "@/utils/rent";
import { WRAPPED_SOL_MINT } from "@/utils/sol-wrapper"

interface ListingCardProps {
  listing: any;
  connected: boolean;
  isOwner?: boolean;  // 是否是卡片拥有者
  showCancelButton?: boolean;  // 是否显示取消按钮
  onPurchaseClick?: (listing: any) => void;
  onCancelClick?: (listing: any) => void;
  purchaseLoading?: boolean;
  cancelLoading?: boolean;
}

export function ListingCard({
  listing,
  connected,
  isOwner = false,
  showCancelButton = false,
  onPurchaseClick,
  onCancelClick,
  purchaseLoading = false,
  cancelLoading = false
}: ListingCardProps) {
  const { connection } = useConnection();
  const [baseRentRefund, setBaseRentRefund] = useState<number | null>(null);
  const isWrappedSOL = listing.sellMint === WRAPPED_SOL_MINT.toString() || 
                       listing.sellMint === "So11111111111111111111111111111111111111112";

  useEffect(() => {
    if (isOwner) {
      // 只获取基础租金（listing + escrow）
      getTotalRentRefund(connection).then(setBaseRentRefund);
    }
  }, [connection, isOwner]);
  
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

  const getTokenColor = (symbol?: string) => {
    if (symbol === "SOL") {
      return "bg-gradient-to-r from-green-400 to-blue-500";
    }
    return "bg-gradient-to-r from-purple-400 to-blue-500";
  };

  const isSoldOut = listing.amount === 0;
  
  return (
    <div className={`group relative p-5 rounded-xl border transition-all duration-300 flex flex-col h-full ${
      isSoldOut 
        ? 'border-gray-800 bg-gradient-to-br from-gray-900/50 to-gray-950/50 opacity-75' 
        : 'border-gray-700/50 bg-gradient-to-br from-gray-800/30 to-gray-900/30 hover:from-gray-800/50 hover:to-gray-900/50 hover:shadow-xl hover:shadow-purple-900/10 hover:border-purple-600/30'
    }`}>
      {/* Sold Out Badge */}
      {isSoldOut && (
        <div className="absolute top-2 right-2 bg-red-500/20 text-red-400 px-2 py-1 rounded-md text-xs font-semibold border border-red-500/30">
          已售罄
        </div>
      )}
      
      {/* Top Section - Token Display and Description */}
      <div className="flex-grow">
        <div className="flex flex-col items-center">
          {/* Token Image */}
          {listing.sellTokenImage ? (
            <img 
              src={listing.sellTokenImage} 
              alt={listing.sellTokenName}
              className="w-16 h-16 rounded-full mb-3 object-cover ring-2 ring-gray-700/50"
            />
          ) : (
            <div className={`w-16 h-16 rounded-full ${getTokenColor(listing.sellTokenSymbol)} flex items-center justify-center shadow-lg mb-3 ring-2 ring-white/10`}>
              <span className="text-xl font-bold text-white">
                {listing.sellTokenSymbol?.charAt(0) || "?"}
              </span>
            </div>
          )}
          
          {/* Token Name with Link */}
          <a 
            href={`https://solscan.io/token/${listing.sellMint}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 text-white font-semibold text-lg hover:text-purple-400 transition-colors group cursor-pointer"
          >
            {listing.sellTokenName || listing.sellTokenSymbol}
            <ExternalLink className="w-3 h-3 text-gray-500 group-hover:text-purple-400" />
          </a>
          
          {/* Token Description */}
          {listing.sellTokenDescription && (
            <p className="text-gray-500 text-xs mt-2 text-center line-clamp-2">
              {listing.sellTokenDescription}
            </p>
          )}
        </div>
      </div>

      {/* Bottom Section - Price, Buttons, Seller Info */}
      <div className="mt-auto pt-4">
        {/* Price Info */}
        <div className="bg-gray-900/50 rounded-lg p-3 mb-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">数量:</span>
          <span className={listing.amount === 0 ? "text-gray-500 line-through" : "text-white"}>
            {listing.amount === 0 ? "已售罄" : formatAmount(listing.amount, listing.sellTokenDecimals ?? 9)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">单价:</span>
          <div className="flex items-center gap-1">
            <span className="text-white font-bold">
              {formatPrice(listing.pricePerToken, listing.buyTokenDecimals ?? 9, listing.sellTokenDecimals ?? 9)}
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

      {/* Action Buttons */}
      <div className="space-y-2">
        {connected ? (
          <>
            {/* 购买按钮 - 不是自己的卖单时显示 */}
            {!isOwner && onPurchaseClick && (
              <Button
                size="sm"
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium disabled:from-gray-600 disabled:to-gray-700"
                onClick={() => onPurchaseClick(listing)}
                disabled={purchaseLoading || isSoldOut}
              >
                {purchaseLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    购买中
                  </>
                ) : isSoldOut ? (
                  <>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    已售罄
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    购买
                  </>
                )}
              </Button>
            )}
            
            {/* 取消卖单按钮 - 是自己的卖单且允许显示时 */}
            {isOwner && showCancelButton && onCancelClick && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-red-400 border-red-400/30 hover:bg-red-400/10"
                  onClick={() => onCancelClick(listing)}
                  disabled={cancelLoading}
                >
                  {cancelLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  {isSoldOut ? "回收租金" : "取消卖单"}
                </Button>
                {baseRentRefund && (
                  <div className="flex items-center gap-1 text-xs text-gray-400 justify-center">
                    <Info className="w-3 h-3" />
                    <span>
                      {listing.amount === 0 ? "售罄后" : "取消后"}
                      返还租金: ~{baseRentRefund.toFixed(4)} SOL
                    </span>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <Button size="sm" disabled variant="outline" className="w-full">
            请连接钱包
          </Button>
        )}
      </div>

      </div>
    </div>
  );
}