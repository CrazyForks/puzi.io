"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useTokenListings } from "@/components/marketplace/hooks/useTokenListings";
import { useOnChainTokenMetadata } from "@/components/marketplace/hooks/useOnChainTokenMetadata";
import { usePurchase } from "@/components/marketplace/hooks/usePurchase";
import { Loader2, RefreshCw, ArrowUpDown, ExternalLink, Coins, TrendingUp, TrendingDown, ArrowLeftRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PurchaseModal } from "@/components/marketplace/PurchaseModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateListing } from "@/components/marketplace/hooks/useCreateListing";
import { useTokenBalance } from "@/components/marketplace/hooks/useTokenBalance";
import { getUSDCAddress, getUSDCSymbol, USDC_DECIMALS } from "@/utils/usdc-address";

interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
  seller: string;
  listingId: number;
  address: string;
  buyTokenSymbol: string;
  buyTokenDecimals: number;
  sellTokenDecimals: number;
  sellMint: string;
  buyMint: string;
  pricePerToken: number;
  originalListing: any;
  isReverseListing?: boolean;
}

export default function TokenTradePage() {
  const params = useParams();
  const tokenAddress = params["token-address"] as string;
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { sellListings, buyListings, loading, error, refetch } = useTokenListings(tokenAddress);
  const { fetchTokenMetadata } = useOnChainTokenMetadata();
  const { purchaseToken } = usePurchase();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderBookEntry | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [leftPriceMode, setLeftPriceMode] = useState<'token-per-usdc' | 'usdc-per-token'>('usdc-per-token');
  const [rightPriceMode, setRightPriceMode] = useState<'usdc-per-token' | 'token-per-usdc'>('token-per-usdc');
  const [showListingModal, setShowListingModal] = useState(false);
  const [listingType, setListingType] = useState<'sell-token' | 'sell-usdc' | null>(null);
  const [listingAmount, setListingAmount] = useState('');
  const [listingPrice, setListingPrice] = useState('');
  const [createListingLoading, setCreateListingLoading] = useState(false);
  const { createListing } = useCreateListing();
  
  // Fetch balances for the token and USDC
  const { balance: tokenBalance } = useTokenBalance(tokenAddress);
  const { balance: usdcBalance } = useTokenBalance(getUSDCAddress());

  // Fetch token metadata
  useEffect(() => {
    const loadTokenInfo = async () => {
      if (tokenAddress) {
        const metadata = await fetchTokenMetadata(tokenAddress);
        setTokenInfo(metadata);
      }
    };
    loadTokenInfo();
  }, [tokenAddress, fetchTokenMetadata]);

  // Process sell orders and buy orders
  const { sellOrders, buyOrders } = useMemo(() => {
    // Process sell orders
    const processedSells: OrderBookEntry[] = sellListings.map(listing => {
      const price = listing.pricePerToken / Math.pow(10, listing.buyTokenDecimals ?? 9);
      const amount = listing.amount / Math.pow(10, listing.sellTokenDecimals ?? 9);
      return {
        price,
        amount,
        total: price * amount,
        seller: listing.seller,
        listingId: listing.listingId,
        address: listing.address,
        buyTokenSymbol: listing.buyTokenSymbol || "SOL",
        buyTokenDecimals: listing.buyTokenDecimals ?? 9,
        sellTokenDecimals: listing.sellTokenDecimals ?? 9,
        sellMint: listing.sellMint,
        buyMint: listing.buyMint,
        pricePerToken: listing.pricePerToken,
        originalListing: listing,
      };
    });

    // Process buy orders (reverse calculation)
    const processedBuys: OrderBookEntry[] = buyListings.map(listing => {
      // For buy orders, we need to calculate the implied price
      // They're selling X token to get Y of our token
      // Price = how much of their token per 1 of our token
      const sellDecimals = listing.sellTokenDecimals ?? 9;
      const buyDecimals = listing.buyTokenDecimals ?? 9;
      
      // The listing says: price_per_token of sellToken in buyToken
      // We want: price of our token in their token
      // So we need to invert: 1 / price
      const originalPrice = listing.pricePerToken / Math.pow(10, listing.buyTokenDecimals ?? 9);
      const invertedPrice = originalPrice > 0 ? 1 / originalPrice : 0;
      
      const amount = listing.amount / Math.pow(10, sellDecimals);
      const totalInOurToken = amount * originalPrice; // How much of our token they want
      
      return {
        price: invertedPrice,
        amount: totalInOurToken, // Amount of our token they want to buy
        total: amount, // Total of their token they're offering
        seller: listing.seller,
        listingId: listing.listingId,
        address: listing.address,
        buyTokenSymbol: listing.sellTokenSymbol || "Unknown",
        buyTokenDecimals: sellDecimals,
        sellTokenDecimals: buyDecimals,
        sellMint: listing.sellMint,
        buyMint: listing.buyMint,
        pricePerToken: listing.pricePerToken,
        originalListing: listing,
        isReverseListing: true, // 标记这是反向订单
      };
    });

    // Sort orders
    const sortedSells = processedSells.sort((a, b) => 
      sortOrder === "asc" ? a.price - b.price : b.price - a.price
    );
    const sortedBuys = processedBuys.sort((a, b) => 
      sortOrder === "desc" ? a.price - b.price : b.price - a.price
    );

    return { sellOrders: sortedSells, buyOrders: sortedBuys };
  }, [sellListings, buyListings, sortOrder]);


  const formatPrice = (price: number) => {
    if (!price || price === 0) return "0";
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6
    });
  };

  const formatAmount = (amount: number) => {
    if (!amount || amount === 0) return "0";
    return amount.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4
    });
  };

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  const handleOrderClick = (order: OrderBookEntry, type: 'buy' | 'sell') => {
    setSelectedOrder(order);
  };

  const handlePurchase = async (purchaseAmount: string) => {
    if (!selectedOrder || !connected || !publicKey) {
      if (!connected) {
        setVisible(true);
      }
      return;
    }

    const amount = parseFloat(purchaseAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("请输入有效的数量");
      return;
    }

    setPurchaseLoading(true);
    try {
      const listing = selectedOrder.originalListing;
      
      // 判断是买入还是卖出当前代币
      const isBuyingCurrentToken = !selectedOrder.isReverseListing;
      
      let buyAmountInSmallestUnit;
      
      if (isBuyingCurrentToken) {
        // 买入当前代币（从卖单）：amount 是要买入的当前代币数量
        const decimals = listing.sellTokenDecimals ?? 9;
        buyAmountInSmallestUnit = Math.floor(amount * Math.pow(10, decimals));
      } else {
        // For reverse listing (buying USDC with Token):
        // - listing.sellMint is USDC (what they're selling)
        // - listing.buyMint is our Token (what they want)
        // - amount is the USDC amount user wants to buy
        // We need to buy exactly that amount of USDC
        
        const usdcDecimals = listing.sellTokenDecimals ?? 9;
        buyAmountInSmallestUnit = Math.floor(amount * Math.pow(10, usdcDecimals));
      }

      console.log("交易详情:", {
        isBuyingCurrentToken,
        isReverseListing: selectedOrder.isReverseListing,
        userInputAmount: amount,
        buyAmountInSmallestUnit,
        selectedOrderAmount: selectedOrder.amount,
        selectedOrderTotal: selectedOrder.total,
        listing: listing
      });

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
        setSelectedOrder(null);
        refetch();
      }
    } finally {
      setPurchaseLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-400">加载交易数据...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Token Info at the top */}
        {tokenInfo && (
          <Card className="bg-gray-900/50 border-gray-800 p-6">
            <div className="flex items-start gap-4">
              {tokenInfo.image && (
                <img 
                  src={tokenInfo.image} 
                  alt={tokenInfo.name || 'Token'} 
                  className="w-16 h-16 rounded-full"
                />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <a 
                    href={`https://solscan.io/token/${tokenAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-2xl font-bold text-white hover:text-purple-400 transition-colors inline-flex items-center gap-2"
                  >
                    {tokenInfo.name || 'Unknown Token'}
                    <ExternalLink className="w-4 h-4 text-gray-500" />
                  </a>
                  {tokenInfo.symbol && (
                    <span className="text-gray-400 text-lg">({tokenInfo.symbol})</span>
                  )}
                </div>
                {tokenInfo.description && (
                  <p className="text-gray-400 text-sm">{tokenInfo.description}</p>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Coins className="w-6 h-6 text-purple-400" />
              {tokenInfo?.symbol || 'Token'} / USDC 交易对
            </h2>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowListingModal(true)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1" />
              上架代币
            </Button>
            <Button 
              onClick={refetch} 
              variant="outline" 
              className="hover:bg-white/10"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              刷新
            </Button>
          </div>
        </div>

        {/* Order Books Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Buy Token with USDC (from sellOrders - normal listings) */}
          <Card className="bg-gray-900/50 border-gray-800">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-white">
                  使用 USDC 购买 {tokenInfo?.symbol || 'Token'}
                </h2>
              </div>

              {sellOrders.filter(o => o.buyTokenSymbol === "USDC" || o.buyTokenSymbol === "USDC-Dev" || o.buyTokenSymbol === getUSDCSymbol()).length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">暂无订单</p>
                  <p className="text-gray-500 text-sm mt-2">
                    等待用户挂单
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3">
                          <div className="flex items-center gap-1">
                            <span>
                              价格 ({leftPriceMode === 'usdc-per-token' 
                                ? `USDC/${tokenInfo?.symbol || 'Token'}`
                                : `${tokenInfo?.symbol || 'Token'}/USDC`})
                            </span>
                            <button
                              onClick={() => setLeftPriceMode(leftPriceMode === 'usdc-per-token' ? 'token-per-usdc' : 'usdc-per-token')}
                              className="p-0.5 hover:bg-gray-700 rounded transition-colors"
                              title="切换价格显示方式"
                            >
                              <ArrowLeftRight className="w-3 h-3 text-gray-500 hover:text-white" />
                            </button>
                          </div>
                        </th>
                        <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3">
                          数量 ({tokenInfo?.symbol || 'Token'})
                        </th>
                        <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {sellOrders
                        .filter(order => order.buyTokenSymbol === "USDC" || order.buyTokenSymbol === "USDC-Dev" || order.buyTokenSymbol === getUSDCSymbol())
                        .map((order) => {
                          // For normal sell orders (someone is selling Token to get USDC)
                          // order.price is USDC/Token, can show Token/USDC by inverting
                          const tokenPerUsdc = order.price > 0 ? 1 / order.price : 0;
                          const displayPrice = leftPriceMode === 'usdc-per-token' ? order.price : tokenPerUsdc;
                          
                          return (
                            <tr key={order.address} className="hover:bg-gray-800/30 transition-colors">
                              <td className="py-3">
                                <span className="text-white font-medium">
                                  {formatPrice(displayPrice)}
                                </span>
                              </td>
                              <td className="py-3">
                                <span className="text-white">
                                  {formatAmount(order.amount)}
                                </span>
                              </td>
                              <td className="py-3">
                                <Button
                                  onClick={() => handleOrderClick(order, 'sell')}
                                  size="sm"
                                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium h-7 px-3 text-xs"
                                >
                                  购买
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>

          {/* Right: Buy USDC with Token (from buyOrders - reverse listings) */}
          <Card className="bg-gray-900/50 border-gray-800">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-white">
                  使用 {tokenInfo?.symbol || 'Token'} 购买 USDC
                </h2>
              </div>

              {buyOrders.filter(o => o.buyTokenSymbol === "USDC" || o.buyTokenSymbol === "USDC-Dev").length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">暂无订单</p>
                  <p className="text-gray-500 text-sm mt-2">
                    等待用户挂单
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3">
                          <div className="flex items-center gap-1">
                            <span>
                              价格 ({rightPriceMode === 'token-per-usdc' 
                                ? `${tokenInfo?.symbol || 'Token'}/USDC`
                                : `USDC/${tokenInfo?.symbol || 'Token'}`})
                            </span>
                            <button
                              onClick={() => setRightPriceMode(rightPriceMode === 'token-per-usdc' ? 'usdc-per-token' : 'token-per-usdc')}
                              className="p-0.5 hover:bg-gray-700 rounded transition-colors"
                              title="切换价格显示方式"
                            >
                              <ArrowLeftRight className="w-3 h-3 text-gray-500 hover:text-white" />
                            </button>
                          </div>
                        </th>
                        <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3">
                          数量 (USDC)
                        </th>
                        <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {buyOrders
                        .filter(order => order.buyTokenSymbol === "USDC" || order.buyTokenSymbol === "USDC-Dev" || order.buyTokenSymbol === getUSDCSymbol())
                        .map((order) => {
                          // For buy orders (reverse listings where someone is selling USDC to get Token)
                          // We can show either Token/USDC or USDC/Token based on user preference
                          const tokenPerUsdc = order.price > 0 ? 1 / order.price : 0;
                          const displayPrice = rightPriceMode === 'token-per-usdc' ? tokenPerUsdc : order.price;
                          
                          return (
                            <tr key={order.address} className="hover:bg-gray-800/30 transition-colors">
                              <td className="py-3">
                                <span className="text-white font-medium">
                                  {formatPrice(displayPrice)}
                                </span>
                              </td>
                              <td className="py-3">
                                <span className="text-white">
                                  {formatAmount(order.total)}
                                </span>
                              </td>
                              <td className="py-3">
                                <Button
                                  onClick={() => handleOrderClick(order, 'buy')}
                                  size="sm"
                                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium h-7 px-3 text-xs"
                                >
                                  购买
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        </div>


        {/* Purchase Modal - Using shared component */}
        <PurchaseModal
          open={!!selectedOrder}
          onOpenChange={(open) => !open && setSelectedOrder(null)}
          listing={selectedOrder ? {
            ...selectedOrder.originalListing,
            total: selectedOrder.total,
            price: selectedOrder.price
          } : null}
          onConfirm={handlePurchase}
          loading={purchaseLoading}
          tokenInfo={tokenInfo}
          isReverseListing={selectedOrder?.isReverseListing}
        />

        {/* Listing Choice Modal */}
        <Dialog open={showListingModal} onOpenChange={(open) => {
          setShowListingModal(open);
          if (!open) {
            setListingType(null);
            setListingAmount('');
            setListingPrice('');
          }
        }}>
          <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white text-xl font-bold">
                {!listingType ? '选择上架类型' : '创建挂单'}
              </DialogTitle>
              <DialogDescription className="text-gray-400 mt-2">
                {!listingType 
                  ? '请选择您想要出售的代币类型'
                  : listingType === 'sell-token'
                    ? `出售 ${tokenInfo?.symbol || 'Token'} 收取 USDC`
                    : `出售 USDC 收取 ${tokenInfo?.symbol || 'Token'}`
                }
              </DialogDescription>
            </DialogHeader>
            
            {!listingType ? (
              <div className="grid grid-cols-2 gap-4 py-6">
                <Card 
                  className="bg-gray-800/50 border-gray-700 hover:border-purple-500 cursor-pointer transition-all p-4 text-center group"
                  onClick={() => setListingType('sell-token')}
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                      <Coins className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-white font-semibold">
                      出售 {tokenInfo?.symbol || 'Token'}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      收取 USDC
                    </p>
                  </div>
                </Card>

                <Card 
                  className="bg-gray-800/50 border-gray-700 hover:border-purple-500 cursor-pointer transition-all p-4 text-center group"
                  onClick={() => setListingType('sell-usdc')}
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-r from-green-600 to-blue-600 flex items-center justify-center">
                      <Coins className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-white font-semibold">
                      出售 USDC
                    </h3>
                    <p className="text-gray-400 text-sm">
                      收取 {tokenInfo?.symbol || 'Token'}
                    </p>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="amount" className="text-sm font-medium text-gray-300">
                      出售数量 ({listingType === 'sell-token' ? tokenInfo?.symbol || 'Token' : 'USDC'})
                    </Label>
                    <span className="text-xs text-gray-400">
                      可用: {listingType === 'sell-token' 
                        ? tokenBalance.toLocaleString(undefined, { maximumFractionDigits: 6 })
                        : usdcBalance.toLocaleString(undefined, { maximumFractionDigits: 6 })
                      } {listingType === 'sell-token' ? tokenInfo?.symbol || 'Token' : 'USDC'}
                    </span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="amount"
                      type="text"
                      value={listingAmount}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "" || /^\d*\.?\d*$/.test(value)) {
                          setListingAmount(value);
                        }
                      }}
                      className="flex-1 bg-gray-800 border-gray-700 text-white"
                      placeholder="输入出售数量"
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        const maxAmount = listingType === 'sell-token' ? tokenBalance : usdcBalance;
                        setListingAmount(maxAmount.toString());
                      }}
                      className="border-gray-700 hover:bg-gray-800 hover:border-purple-500 transition-colors px-4 h-10"
                    >
                      全部
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price" className="text-sm font-medium text-gray-300">
                    单价 ({listingType === 'sell-token' ? 'USDC' : tokenInfo?.symbol || 'Token'}/{listingType === 'sell-token' ? tokenInfo?.symbol || 'Token' : 'USDC'})
                  </Label>
                  <Input
                    id="price"
                    type="text"
                    value={listingPrice}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "" || /^\d*\.?\d*$/.test(value)) {
                        setListingPrice(value);
                      }
                    }}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="输入单价"
                  />
                </div>

                {/* Total display */}
                {listingAmount && listingPrice && parseFloat(listingAmount) > 0 && parseFloat(listingPrice) > 0 && (
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">总计收取</span>
                      <span className="text-white text-lg font-bold">
                        {(parseFloat(listingAmount) * parseFloat(listingPrice)).toFixed(6)} {listingType === 'sell-token' ? 'USDC' : tokenInfo?.symbol || 'Token'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {listingType && (
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setListingType(null)}
                  className="border-gray-700 hover:bg-gray-800"
                >
                  返回
                </Button>
                <Button
                  onClick={async () => {
                    if (!listingAmount || !listingPrice || !connected) {
                      if (!connected) {
                        setVisible(true);
                      }
                      return;
                    }

                    setCreateListingLoading(true);
                    try {
                      const usdcAddress = getUSDCAddress();
                      const sellToken = listingType === 'sell-token' ? tokenAddress : usdcAddress;
                      const buyToken = listingType === 'sell-token' ? usdcAddress : tokenAddress;
                      
                      // Get decimals for proper conversion
                      // Use actual token decimals from tokenInfo, fallback to 9 if not available
                      const tokenDecimals = tokenInfo?.decimals ?? 9;
                      const sellDecimals = listingType === 'sell-token' ? tokenDecimals : USDC_DECIMALS;
                      const buyDecimals = listingType === 'sell-token' ? USDC_DECIMALS : tokenDecimals;
                      
                      // Convert amount to smallest units
                      const amountInSmallestUnit = Math.floor(parseFloat(listingAmount) * Math.pow(10, sellDecimals));
                      
                      // Convert price to smallest units (price per full token in buy token's smallest units)
                      const priceInSmallestUnit = Math.floor(parseFloat(listingPrice) * Math.pow(10, buyDecimals));
                      
                      const success = await createListing({
                        sellMint: sellToken,
                        buyMint: buyToken,
                        amount: amountInSmallestUnit,
                        pricePerToken: priceInSmallestUnit
                      });

                      if (success) {
                        setShowListingModal(false);
                        setListingType(null);
                        setListingAmount('');
                        setListingPrice('');
                        refetch(); // Refresh the listings
                      }
                    } catch (error) {
                      console.error('Failed to create listing:', error);
                    } finally {
                      setCreateListingLoading(false);
                    }
                  }}
                  disabled={!listingAmount || !listingPrice || parseFloat(listingAmount) <= 0 || parseFloat(listingPrice) <= 0 || createListingLoading}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {createListingLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      创建中...
                    </>
                  ) : (
                    '确认创建'
                  )}
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}