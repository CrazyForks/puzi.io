"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTradableTokens } from "@/config/tradable-tokens";
import { useRouter } from "next/navigation";
import { Coins, ExternalLink, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { rpcProvider } from "@/utils/rpc-provider";

export default function MarketsPage() {
  const router = useRouter();
  const [tokens, setTokens] = useState(getTradableTokens());
  
  // Update tokens when network changes
  useEffect(() => {
    const handleEndpointChange = () => {
      setTokens(getTradableTokens());
    };
    
    rpcProvider.addListener(handleEndpointChange);
    
    return () => {
      rpcProvider.removeListener(handleEndpointChange);
    };
  }, []);

  const handleTokenClick = (symbol: string) => {
    router.push(`/trade/${symbol.toLowerCase()}`);
  };

  if (tokens.length === 0) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <Card className="bg-black/20 backdrop-blur-sm border border-gray-800">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-purple-400" />
                热门交易代币
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Coins className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">
                  当前网络暂无配置的交易代币
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="bg-black/20 backdrop-blur-sm border border-gray-800">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-purple-400" />
                热门交易代币
              </CardTitle>
              <span className="text-sm text-gray-400">
                网络: {rpcProvider.getNetwork() === 'mainnet' ? '主网' : '开发网'}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tokens.map((token) => (
                <Card 
                  key={token.address}
                  className="bg-gray-800/50 border-gray-700 hover:border-purple-600 transition-all cursor-pointer group"
                  onClick={() => handleTokenClick(token.symbol)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {token.logoURI ? (
                          <img 
                            src={token.logoURI} 
                            alt={token.symbol}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-blue-500 flex items-center justify-center">
                            <span className="text-white font-bold">
                              {token.symbol.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold text-white group-hover:text-purple-400 transition-colors">
                            {token.name}
                          </h3>
                          <p className="text-xs text-gray-400">
                            ${token.symbol.toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {token.description && (
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {token.description}
                      </p>
                    )}
                    
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}