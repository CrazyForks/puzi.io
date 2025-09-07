"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTokenAccounts } from "./hooks/useTokenAccounts";
import { Loader2, Coins } from "lucide-react";
import { forwardRef, useImperativeHandle } from "react";
import { useTranslation } from "@/lib/i18n/context";

interface TokenInfo {
  mint: string;
  amount: number;
  name?: string;
  symbol?: string;
  decimals: number;
  logoURI?: string;
}

interface TokenListProps {
  selectedToken: TokenInfo | null;
  onTokenSelect: (token: TokenInfo) => void;
}

export interface TokenListRef {
  refetch: () => void;
}

export const TokenList = forwardRef<TokenListRef, TokenListProps>(({ selectedToken, onTokenSelect }, ref) => {
  const { tokens, loading, error, refetch } = useTokenAccounts();
  const { t } = useTranslation();

  // 暴露refetch方法给父组件
  useImperativeHandle(ref, () => ({
    refetch,
  }));

  if (loading) {
    return (
      <Card className="bg-black/20 backdrop-blur-sm border border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Coins className="w-5 h-5" />
            {t('shop.myTokens')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
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
            <Coins className="w-5 h-5" />
            {t('shop.myTokens')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">{error}</p>
            {error.includes("频繁") || error.includes("429") ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">
                  {t('shop.networkLimited')}
                </p>
                <Button onClick={refetch} variant="outline" size="sm">
                  {t('common.refresh')}
                </Button>
              </div>
            ) : (
              <Button onClick={refetch} variant="outline" size="sm">
                重试
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tokens.length === 0) {
    return (
      <Card className="bg-black/20 backdrop-blur-sm border border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Coins className="w-5 h-5" />
            {t('shop.myTokens')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Coins className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">钱包中没有找到代币</p>
            <Button onClick={refetch} variant="outline" size="sm">
              {t('common.refresh')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-black/20 backdrop-blur-sm border border-gray-800">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-white flex items-center gap-2">
            <Coins className="w-5 h-5" />
            {t('shop.myTokens')} ({tokens.length})
          </CardTitle>
          <Button onClick={refetch} variant="outline" size="sm">
            刷新
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {tokens.map((token) => (
            <div
              key={token.mint}
              className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                selectedToken?.mint === token.mint
                  ? "border-purple-500 bg-purple-500/10"
                  : "border-gray-700 hover:border-gray-600 bg-gray-800/50"
              }`}
              onClick={() => onTokenSelect(token)}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {token.logoURI ? (
                    <img 
                      src={token.logoURI} 
                      alt={token.symbol || "Token"}
                      className="w-8 h-8 rounded-full object-cover"
                      onError={(e) => {
                        // 如果图片加载失败，显示默认图标
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`${token.logoURI ? 'hidden' : ''} w-8 h-8 rounded-full flex items-center justify-center ${
                    token.symbol === "SOL" 
                      ? "bg-gradient-to-r from-green-400 to-blue-500" 
                      : "bg-gradient-to-r from-purple-400 to-blue-500"
                  }`}>
                    <span className="text-xs font-bold text-white">
                      {token.symbol === "SOL" ? "◎" : (token.symbol ? token.symbol.charAt(0) : "?")}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {token.symbol || "未知代币"}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">
                      {`${token.mint.slice(0, 4)}...${token.mint.slice(-4)}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">
                    {(token.amount / Math.pow(10, token.decimals)).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400">{t('common.balance')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

TokenList.displayName = "TokenList";