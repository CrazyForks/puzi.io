"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWallet } from "@solana/wallet-adapter-react";
import { TokenList, TokenListRef } from "@/components/marketplace/TokenList";
import { ListingForm } from "@/components/marketplace/ListingForm";
import { UserListings } from "@/components/marketplace/UserListings";
import { Store, Copy, Check, Coins } from "lucide-react";
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
                    className="text-gray-400 hover:text-white transition-colors p-1 cursor-pointer"
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
              {/* {isOwner && (
                <div className="flex gap-2 sm:gap-3">
                  <button
                    disabled
                    title="Coming Soon"
                    className="bg-gray-600 cursor-not-allowed opacity-50 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg font-medium transition-all flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm relative"
                  >
                    <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden xs:inline">创建商品</span>
                    <span className="xs:hidden">创建商品</span>
                    <span className="absolute -top-2 -right-2 bg-yellow-500 text-black text-[10px] px-1 rounded">Soon</span>
                  </button>
                </div>
              )} */}
            </div>
          </CardHeader>
        </Card>

        {/* User's Active Listings */}
        <div>
          <UserListings 
            userAddress={address}
            onRefresh={() => {}}
            showAddButton={isOwner}
            onAddListing={() => setShowListingModal(true)}
          />
        </div>

        {/* Listing Modal */}
        <Dialog open={showListingModal} onOpenChange={setShowListingModal}>
          <DialogContent className="bg-gray-900 border-gray-800 lg:max-w-[800px] w-[95vw] max-h-[90vh] overflow-hidden p-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-800">
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-purple-400" />
                创建卖单
              </DialogTitle>
            </DialogHeader>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 左侧：代币选择 */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <span className="text-purple-400 font-bold">1</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white">选择代币</h3>
                  </div>
                  <TokenList 
                    ref={tokenListRef}
                    selectedToken={selectedToken}
                    onTokenSelect={setSelectedToken}
                  />
                </div>
                
                {/* 右侧：上架表单 */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <span className="text-purple-400 font-bold">2</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white">设置价格</h3>
                  </div>
                  <ListingForm 
                    selectedToken={selectedToken}
                    onListingComplete={handleListingComplete}
                  />
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}