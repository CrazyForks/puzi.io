"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { ShoppingCart, Loader2, ChevronDown, Info } from "lucide-react";
import { useCreateListing } from "./hooks/useCreateListing";
import { getPaymentTokens, KnownToken } from "@/config/known-tokens";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { getTotalRentRefund, getTokenAccountRentCost } from "@/utils/rent";
import { WRAPPED_SOL_MINT } from "@/utils/sol-wrapper";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";

interface TokenInfo {
  mint: string;
  amount: number;
  name?: string;
  symbol?: string;
  decimals: number;
  logoURI?: string;
}

interface ListingFormProps {
  selectedToken: TokenInfo | null;
  onListingComplete: () => void;
}

export function ListingForm({ selectedToken, onListingComplete }: ListingFormProps) {
  const [sellAmount, setSellAmount] = useState("");
  const [pricePerToken, setPricePerToken] = useState("");
  const paymentTokens = getPaymentTokens();
  const [selectedPaymentToken, setSelectedPaymentToken] = useState<KnownToken>(paymentTokens[0]); // 默认选择USDC
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
  const [rentCost, setRentCost] = useState<number | null>(null);
  const [needsWsolAccount, setNeedsWsolAccount] = useState(false);
  
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { createListing, loading } = useCreateListing();

  useEffect(() => {
    const calculateRentCost = async () => {
      // 基础租金：listing账户 + escrow token账户
      let baseRent = await getTotalRentRefund(connection);
      
      // 如果选择的是原生 SOL，检查是否需要创建 wSOL 账户
      if (selectedToken?.mint === "SOL_NATIVE" && publicKey) {
        const wsolTokenAccount = await getAssociatedTokenAddress(
          WRAPPED_SOL_MINT,
          publicKey,
          false,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );
        
        const accountInfo = await connection.getAccountInfo(wsolTokenAccount);
        if (!accountInfo) {
          // 需要创建 wSOL 账户，额外加上 token 账户租金
          const wsolAccountRent = await getTokenAccountRentCost(connection);
          baseRent += wsolAccountRent;
          setNeedsWsolAccount(true);
        } else {
          setNeedsWsolAccount(false);
        }
      } else {
        setNeedsWsolAccount(false);
      }
      
      setRentCost(baseRent);
    };
    
    calculateRentCost();
  }, [connection, selectedToken, publicKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedToken) return;

    const sellAmountNumber = parseFloat(sellAmount);
    const priceNumber = parseFloat(pricePerToken);
    
    if (sellAmountNumber <= 0 || priceNumber <= 0) {
      alert("请输入有效的数量和价格");
      return;
    }

    const maxAmount = selectedToken.amount / Math.pow(10, selectedToken.decimals);
    if (sellAmountNumber > maxAmount) {
      alert(`出售数量不能超过余额 ${maxAmount}`);
      return;
    }

    // 如果选择的是原生 SOL
    const isNativeSOL = selectedToken.mint === "SOL_NATIVE";
    let actualSellMint = selectedToken.mint;
    
    if (isNativeSOL) {
      // 使用 Wrapped SOL 的 mint 地址
      actualSellMint = WRAPPED_SOL_MINT.toString();
    }

    // 价格现在直接表示每个完整代币的价格（合约会处理小数位换算）
    const success = await createListing({
      sellMint: actualSellMint,
      buyMint: selectedPaymentToken.mint,
      amount: Math.floor(sellAmountNumber * Math.pow(10, selectedToken.decimals)),
      pricePerToken: Math.floor(priceNumber * Math.pow(10, selectedPaymentToken.decimals)),
      isNativeSOL: isNativeSOL // 传递是否是原生 SOL
    });

    if (success) {
      setSellAmount("");
      setPricePerToken("");
      onListingComplete();
    }
  };

  if (!selectedToken) {
    return (
      <Card className="bg-black/20 backdrop-blur-sm border border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            上架代币
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <ShoppingCart className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">请先选择要出售的代币</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxAmount = selectedToken.amount / Math.pow(10, selectedToken.decimals);

  return (
    <Card className="bg-black/20 backdrop-blur-sm border border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          上架代币
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 选中的代币信息 */}
          <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                selectedToken.symbol === "SOL" 
                  ? "bg-gradient-to-r from-green-400 to-blue-500" 
                  : "bg-gradient-to-r from-purple-400 to-blue-500"
              }`}>
                <span className="text-xs font-bold text-white">
                  {selectedToken.symbol === "SOL" ? "◎" : (selectedToken.symbol ? selectedToken.symbol.charAt(0) : "?")}
                </span>
              </div>
              <div>
                <p className="text-white font-medium">
                  {selectedToken.symbol || "未知代币"}
                </p>
                <p className="text-xs text-gray-400">
                  余额: {maxAmount.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* 出售数量 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              出售数量
            </label>
            <div className="relative">
              <input
                type="number"
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
                placeholder="输入要出售的数量"
                step="any"
                min="0"
                max={maxAmount}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                required
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 px-2 text-xs"
                onClick={() => setSellAmount(maxAmount.toString())}
              >
                全部
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              最大可出售: {maxAmount.toLocaleString()}
            </p>
          </div>

          {/* 支付代币选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              支付代币
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPaymentDropdown(!showPaymentDropdown)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white text-left flex items-center justify-between hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  {selectedPaymentToken.logoURI && (
                    <img 
                      src={selectedPaymentToken.logoURI} 
                      alt={selectedPaymentToken.symbol}
                      className="w-5 h-5 rounded-full"
                    />
                  )}
                  <span>{selectedPaymentToken.symbol}</span>
                  <span className="text-gray-400 text-sm">{selectedPaymentToken.name}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              
              {showPaymentDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                  {paymentTokens.map((token) => (
                    <button
                      key={token.mint}
                      type="button"
                      onClick={() => {
                        setSelectedPaymentToken(token);
                        setShowPaymentDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-gray-700 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      {token.logoURI && (
                        <img 
                          src={token.logoURI} 
                          alt={token.symbol}
                          className="w-5 h-5 rounded-full"
                        />
                      )}
                      <span className="text-white">{token.symbol}</span>
                      <span className="text-gray-400 text-sm">{token.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              买家需要使用 {selectedPaymentToken.symbol} 来购买您的代币
            </p>
          </div>

          {/* 单价 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              单价 ({selectedPaymentToken.symbol})
            </label>
            <input
              type="number"
              value={pricePerToken}
              onChange={(e) => setPricePerToken(e.target.value)}
              placeholder={`每个${selectedToken.symbol || '代币'}的价格 (${selectedPaymentToken.symbol})`}
              step="any"
              min="0"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          {/* 总价预览 */}
          {sellAmount && pricePerToken && (
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
              <p className="text-sm text-gray-300">总价预览:</p>
              <p className="text-lg font-bold text-white">
                {(parseFloat(sellAmount) * parseFloat(pricePerToken)).toFixed(4)} {selectedPaymentToken.symbol}
              </p>
            </div>
          )}

          {/* 租金提示 */}
          {rentCost && (
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-300">创建卖单需要租金</p>
                  <p className="text-xs text-gray-400 mt-1">
                    需要支付约 {rentCost.toFixed(6)} SOL 的租金
                    {needsWsolAccount ? 
                      "（listing账户 + escrow账户 + wSOL账户）" : 
                      "（listing账户 + escrow账户）"}。
                    当您取消卖单或售罄后，可以全额回收这笔租金。
                    {needsWsolAccount && " 其中 wSOL 账户的租金会在取消卖单时自动返还。"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 提交按钮 */}
          <Button
            type="submit"
            className="w-full"
            disabled={loading || !sellAmount || !pricePerToken}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                创建中...
              </>
            ) : (
              "创建卖单"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}