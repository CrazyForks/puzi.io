"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { rpcProvider, type Network, MAINNET_ENDPOINTS, DEVNET_ENDPOINTS } from "@/utils/rpc-provider";
import { Settings, Wifi, WifiOff, Check, RefreshCw, Loader2, ExternalLink, Globe } from "lucide-react";
import { toast } from "sonner";

interface RPCSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RPCSettingsModal({ open, onOpenChange }: RPCSettingsModalProps) {
  const [network, setNetwork] = useState<Network>("mainnet");
  const [currentEndpoint, setCurrentEndpoint] = useState("");
  const [customRPCInput, setCustomRPCInput] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('connected');
  const [selectedEndpoint, setSelectedEndpoint] = useState("");
  const [isCustom, setIsCustom] = useState(false);

  useEffect(() => {
    // Initialize state from RPC provider
    setNetwork(rpcProvider.getNetwork());
    const endpoint = rpcProvider.getCurrentEndpoint();
    setCurrentEndpoint(endpoint);
    setSelectedEndpoint(endpoint);
    setConnectionStatus(rpcProvider.getConnectionStatus());
    
    // Check if current endpoint is custom
    const endpoints = network === 'mainnet' ? MAINNET_ENDPOINTS : DEVNET_ENDPOINTS;
    const isCurrentCustom = !endpoints.some(e => e.url === endpoint);
    setIsCustom(isCurrentCustom);
    if (isCurrentCustom) {
      setCustomRPCInput(endpoint);
    }
    
    // Listen for connection status changes
    const handleStatusChange = (status: 'connected' | 'disconnected' | 'checking') => {
      setConnectionStatus(status);
    };
    
    rpcProvider.addStatusListener(handleStatusChange);
    
    return () => {
      rpcProvider.removeStatusListener(handleStatusChange);
    };
  }, [network]);

  const handleNetworkChange = (newNetwork: Network) => {
    rpcProvider.setNetwork(newNetwork);
    setNetwork(newNetwork);
    
    // Reset to first endpoint of new network
    const endpoints = newNetwork === 'mainnet' ? MAINNET_ENDPOINTS : DEVNET_ENDPOINTS;
    const defaultEndpoint = endpoints.find(e => !e.url.includes('YOUR_'))?.url || endpoints[0].url;
    setSelectedEndpoint(defaultEndpoint);
    setCurrentEndpoint(defaultEndpoint);
    setIsCustom(false);
    setCustomRPCInput("");
    
    toast.success(`切换到${newNetwork === 'mainnet' ? '主网' : '开发网'}`);
  };

  const handleEndpointSelect = (url: string) => {
    setSelectedEndpoint(url);
    setIsCustom(false);
    setCustomRPCInput("");
  };

  const handleCustomSelect = () => {
    setIsCustom(true);
    if (customRPCInput) {
      setSelectedEndpoint(customRPCInput);
    }
  };

  const handleApply = async () => {
    if (isCustom) {
      if (!customRPCInput.trim()) {
        toast.error("请输入 RPC 地址");
        return;
      }

      // Validate URL
      try {
        new URL(customRPCInput);
      } catch {
        toast.error("请输入有效的 URL");
        return;
      }

      rpcProvider.setCustomRPC(customRPCInput);
      toast.success("自定义 RPC 已设置");
    } else {
      // Clear custom RPC and use selected endpoint
      rpcProvider.setCustomRPC(null);
      
      // Find the index of selected endpoint
      const endpoints = network === 'mainnet' ? MAINNET_ENDPOINTS : DEVNET_ENDPOINTS;
      const index = endpoints.findIndex(e => e.url === selectedEndpoint);
      if (index !== -1) {
        // This is a bit of a hack - we need to add a method to set specific endpoint
        // For now, we'll use custom RPC for non-default endpoints
        if (index !== 0) {
          rpcProvider.setCustomRPC(selectedEndpoint);
        }
      }
      
      toast.success("RPC 已更新");
    }
    
    onOpenChange(false);
  };

  const handleManualHealthCheck = async () => {
    const isHealthy = await rpcProvider.checkHealth();
    if (isHealthy) {
      toast.success("连接正常");
    } else {
      toast.error("连接失败，请检查网络或更换 RPC");
    }
  };

  const endpoints = network === 'mainnet' ? MAINNET_ENDPOINTS : DEVNET_ENDPOINTS;
  
  // Filter out endpoints that require API keys
  const publicEndpoints = endpoints.filter(e => !e.url.includes('YOUR_'));
  const apiKeyEndpoints = endpoints.filter(e => e.url.includes('YOUR_'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800 sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-400" />
            RPC 设置
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Network Selection */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">选择网络</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleNetworkChange("mainnet")}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  network === "mainnet"
                    ? "bg-purple-600/20 border-purple-500 text-white"
                    : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  {network === "mainnet" && <Check className="w-4 h-4" />}
                  <span>主网 Mainnet</span>
                </div>
              </button>
              
              <button
                onClick={() => handleNetworkChange("devnet")}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  network === "devnet"
                    ? "bg-purple-600/20 border-purple-500 text-white"
                    : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  {network === "devnet" && <Check className="w-4 h-4" />}
                  <span>开发网 Devnet</span>
                </div>
              </button>
            </div>
          </div>

          {/* Public RPC Endpoints */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              {network === 'mainnet' ? '公共 RPC 节点' : 'RPC 节点'}
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {publicEndpoints.map((endpoint) => (
                <button
                  key={endpoint.url}
                  onClick={() => handleEndpointSelect(endpoint.url)}
                  className={`w-full px-3 py-2 rounded-lg border text-left transition-all ${
                    selectedEndpoint === endpoint.url && !isCustom
                      ? "bg-purple-600/20 border-purple-500"
                      : "bg-gray-800/50 border-gray-700 hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-white">{endpoint.name}</span>
                    </div>
                    {selectedEndpoint === endpoint.url && !isCustom && (
                      <Check className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 ml-6 truncate">
                    {endpoint.url}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Premium RPC Services Info - Only show for mainnet */}
          {network === 'mainnet' && apiKeyEndpoints.length > 0 && (
            <div>
              <label className="text-sm text-gray-400 mb-2 block">高级 RPC 服务（需要 API Key）</label>
              <div className="bg-gray-800/30 rounded-lg p-3 space-y-2">
                <p className="text-xs text-gray-500">
                  推荐使用以下高性能 RPC 服务，请在自定义 RPC 中填入您的完整节点地址：
                </p>
                <div className="flex gap-4">
                  <a
                    href="https://helius.dev"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Helius
                  </a>
                  <a
                    href="https://quicknode.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300"
                  >
                    <ExternalLink className="w-3 h-3" />
                    QuickNode
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Custom RPC Input */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">自定义 RPC</label>
            <div className="space-y-2">
              <Input
                placeholder="https://your-rpc-endpoint.com"
                value={customRPCInput}
                onChange={(e) => {
                  setCustomRPCInput(e.target.value);
                  if (e.target.value) {
                    handleCustomSelect();
                  }
                }}
                onFocus={handleCustomSelect}
                className={`bg-gray-800 border ${
                  isCustom ? 'border-purple-500' : 'border-gray-700'
                } text-white placeholder-gray-500`}
              />
              <p className="text-xs text-gray-500">
                输入您的自定义 RPC 端点地址
              </p>
            </div>
          </div>

          {/* Connection Status */}
          <div className="bg-gray-800/30 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {connectionStatus === 'checking' ? (
                  <>
                    <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
                    <span className="text-sm text-gray-400">检查连接中...</span>
                  </>
                ) : connectionStatus === 'connected' ? (
                  <>
                    <Wifi className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-gray-400">连接正常</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-gray-400">连接异常</span>
                  </>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleManualHealthCheck}
                disabled={connectionStatus === 'checking'}
                className="h-7 px-2"
              >
                <RefreshCw className={`w-4 h-4 ${connectionStatus === 'checking' ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <div className="text-xs text-gray-600 mt-2 truncate">
              当前: {currentEndpoint}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-gray-400"
            >
              取消
            </Button>
            <Button
              onClick={handleApply}
              className="bg-purple-600 hover:bg-purple-700"
            >
              应用设置
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}