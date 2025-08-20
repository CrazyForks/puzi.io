"use client";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWallet } from "@solana/wallet-adapter-react";
import { TokenList, TokenListRef } from "@/components/marketplace/TokenList";
import { ListingForm } from "@/components/marketplace/ListingForm";
import { UserListings } from "@/components/marketplace/UserListings";
import Link from "next/link";
import { Plus, Store, Copy, Check } from "lucide-react";
import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

interface TokenInfo {
  mint: string;
  amount: number;
  name?: string;
  symbol?: string;
  decimals: number;
  logoURI?: string;
}

export default function UserShop() {
  const params = useParams();
  const address = params.address as string;
  const { publicKey } = useWallet();
  const [showListingModal, setShowListingModal] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const tokenListRef = useRef<TokenListRef>(null);
  
  const isOwner = publicKey?.toBase58() === address;
  
  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };
  
  const copyUrl = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("链接已复制");
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleListingComplete = () => {
    setSelectedToken(null);
    setShowListingModal(false);
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Shop Header */}
        <Card className="bg-black/20 backdrop-blur-sm border border-gray-800">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <Store className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400 flex-shrink-0" />
                <CardTitle className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2">
                  {shortenAddress(address)} 的铺子
                  <button
                    onClick={copyUrl}
                    className="text-gray-400 hover:text-white transition-colors p-1"
                    title="复制链接"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </CardTitle>
              </div>
              
              {/* Action Buttons - Only show for owner */}
              {isOwner && (
                <div className="flex gap-2 sm:gap-3">
                  <button
                    onClick={() => setShowListingModal(true)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg font-medium transition-all flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
                  >
                    <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden xs:inline">上架商品</span>
                    <span className="xs:hidden">上架商品</span>
                  </button>
                  
                  <Link
                    href="/token/new"
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg font-medium transition-all flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
                  >
                    <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden xs:inline">创建商品</span>
                    <span className="xs:hidden">创建商品</span>
                  </Link>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* User's Active Listings */}
        <div>
          {/* <h2 className="text-xl font-bold text-white mb-4">在售商品</h2> */}
          <UserListings 
            userAddress={address}
            onRefresh={() => {}}
          />
        </div>

        {/* Listing Modal */}
        {showListingModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-xl border border-gray-800 w-full max-w-4xl max-h-[90vh] sm:max-h-[80vh] overflow-auto">
              <div className="p-4 sm:p-6">
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                  <h2 className="text-lg sm:text-xl font-bold text-white">选择要上架的代币</h2>
                  <button
                    onClick={() => setShowListingModal(false)}
                    className="text-gray-400 hover:text-white transition-colors text-2xl leading-none p-1"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {/* Token Selection */}
                  <div>
                    <TokenList 
                      ref={tokenListRef}
                      selectedToken={selectedToken}
                      onTokenSelect={setSelectedToken}
                    />
                  </div>
                  
                  {/* Listing Form */}
                  <div>
                    <ListingForm 
                      selectedToken={selectedToken}
                      onListingComplete={handleListingComplete}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}