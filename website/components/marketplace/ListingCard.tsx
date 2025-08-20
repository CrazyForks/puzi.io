"use client";

import { Button } from "@/components/ui/button";
import { Loader2, ShoppingCart, ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";
import { getTokenByMint } from "@/config/known-tokens";

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

  return (
    <div className="group relative p-5 rounded-xl border border-gray-700/50 bg-gradient-to-br from-gray-800/30 to-gray-900/30 hover:from-gray-800/50 hover:to-gray-900/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-900/10 hover:border-purple-600/30">
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
          
          {/* Token Name with Link */}
          <a 
            href={`https://solscan.io/token/${listing.sellMint}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 text-white font-semibold text-lg hover:text-purple-400 transition-colors group"
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

      {/* Action Buttons */}
      <div className="space-y-2">
        {connected ? (
          <>
            {/* 购买按钮 - 不是自己的卖单时显示 */}
            {!isOwner && onPurchaseClick && (
              <Button
                size="sm"
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium"
                onClick={() => onPurchaseClick(listing)}
                disabled={purchaseLoading}
              >
                {purchaseLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    购买中
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
                取消卖单
              </Button>
            )}
          </>
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
  );
}