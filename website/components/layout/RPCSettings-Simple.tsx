"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rpcProvider, type Network } from "@/utils/rpc-provider";
import { Settings, Wifi, WifiOff, ChevronDown, X, Check } from "lucide-react";
import { toast } from "sonner";

export function RPCSettings() {
  const [network, setNetwork] = useState<Network>("devnet");
  const [currentEndpoint, setCurrentEndpoint] = useState("");
  const [isHealthy, setIsHealthy] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [customRPCInput, setCustomRPCInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [savedCustomRPC, setSavedCustomRPC] = useState<string | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);

  useEffect(() => {
    // Initialize state from RPC provider
    setNetwork(rpcProvider.getNetwork());
    setCurrentEndpoint(rpcProvider.getCurrentEndpoint());
    
    // Check if there's a saved custom RPC
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('custom_rpc');
      if (saved) {
        setSavedCustomRPC(saved);
      }
    }
    
    // Listen for RPC changes
    const handleEndpointChange = (endpoint: string) => {
      setCurrentEndpoint(endpoint);
      checkHealth(endpoint);
    };
    
    rpcProvider.addListener(handleEndpointChange);
    
    // Initial health check
    checkHealth(rpcProvider.getCurrentEndpoint());
    
    return () => {
      rpcProvider.removeListener(handleEndpointChange);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-rpc-dropdown]')) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const checkHealth = async (endpoint: string) => {
    const healthy = await rpcProvider.checkEndpointHealth(endpoint);
    setIsHealthy(healthy);
  };

  const handleNetworkChange = (newNetwork: Network) => {
    rpcProvider.setNetwork(newNetwork);
    setNetwork(newNetwork);
    setDropdownOpen(false);
    setShowCustomInput(false);
    toast.success(`切换到 ${newNetwork === 'mainnet' ? '主网' : '开发网'}`);
  };

  const handleCustomRPCSubmit = async () => {
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

    setCheckingHealth(true);
    
    try {
      // Check endpoint health
      const healthy = await rpcProvider.checkEndpointHealth(customRPCInput);
      
      setCheckingHealth(false);
      
      if (!healthy) {
        toast.error("无法连接到该 RPC 节点");
        return;
      }

      rpcProvider.setCustomRPC(customRPCInput);
      setSavedCustomRPC(customRPCInput);
      toast.success("自定义 RPC 已设置");
      
      // Close input and dropdown
      setShowCustomInput(false);
      setDropdownOpen(false);
      setCustomRPCInput("");
    } catch (error) {
      setCheckingHealth(false);
      toast.error("检查 RPC 节点时出错");
    }
  };

  const handleResetRPC = () => {
    rpcProvider.setCustomRPC(null);
    setSavedCustomRPC(null);
    setDropdownOpen(false);
    toast.success("已重置为默认 RPC");
  };

  const getNetworkDisplayName = () => {
    return network === 'mainnet' ? '主网' : '开发网';
  };

  const getEndpointDisplayName = () => {
    const name = rpcProvider.getCurrentEndpointName();
    if (name === "Custom RPC") {
      try {
        const url = new URL(currentEndpoint);
        return `自定义 (${url.hostname})`;
      } catch {
        return "自定义 RPC";
      }
    }
    return name;
  };

  return (
    <div className="relative" data-rpc-dropdown>
      <Button 
        variant="ghost" 
        size="sm" 
        className="flex items-center gap-2 text-gray-300 hover:text-white"
        onClick={() => setDropdownOpen(!dropdownOpen)}
      >
        {isHealthy ? (
          <Wifi className="w-4 h-4 text-green-500" />
        ) : (
          <WifiOff className="w-4 h-4 text-red-500" />
        )}
        <span className="text-xs">
          {getNetworkDisplayName()}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
      </Button>

      {dropdownOpen && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-gray-900 border border-gray-800 rounded-lg shadow-lg p-2 z-[200]">
          <div className="px-2 py-1.5 flex items-center justify-between border-b border-gray-800 mb-2">
            <span className="font-semibold text-sm">RPC 设置</span>
            <span className="text-xs text-gray-500">
              {getEndpointDisplayName()}
            </span>
          </div>

          <div className="mb-2">
            <div className="text-xs text-gray-500 px-2 py-1">选择网络</div>
            
            <button
              onClick={() => handleNetworkChange("mainnet")}
              className="w-full flex items-center justify-between px-2 py-1.5 text-sm rounded hover:bg-gray-800 transition-colors"
            >
              <span>主网 (Mainnet)</span>
              {network === "mainnet" && <Check className="w-4 h-4 text-green-500" />}
            </button>
            
            <button
              onClick={() => handleNetworkChange("devnet")}
              className="w-full flex items-center justify-between px-2 py-1.5 text-sm rounded hover:bg-gray-800 transition-colors"
            >
              <span>开发网 (Devnet)</span>
              {network === "devnet" && <Check className="w-4 h-4 text-green-500" />}
            </button>
          </div>

          <div className="border-t border-gray-800 pt-2">
            {!showCustomInput ? (
              <button
                onClick={() => {
                  setShowCustomInput(true);
                  // Fill in the saved custom RPC if it exists
                  if (savedCustomRPC) {
                    setCustomRPCInput(savedCustomRPC);
                  }
                }}
                className="w-full flex items-center px-2 py-1.5 text-sm rounded hover:bg-gray-800 transition-colors"
              >
                <Settings className="w-4 h-4 mr-2" />
                自定义 RPC
              </button>
            ) : (
              <div className="px-2 py-2 space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="https://your-rpc.com"
                    value={customRPCInput}
                    onChange={(e) => setCustomRPCInput(e.target.value)}
                    className="flex-1 h-8 text-sm bg-gray-800 border-gray-700"
                    disabled={checkingHealth}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleCustomRPCSubmit();
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={handleCustomRPCSubmit}
                    disabled={checkingHealth || !customRPCInput.trim()}
                    className="h-8 px-2"
                  >
                    {checkingHealth ? "..." : "确定"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowCustomInput(false);
                      setCustomRPCInput("");
                    }}
                    className="h-8 px-2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
            
            {rpcProvider.getCurrentEndpointName() === "Custom RPC" && !showCustomInput && (
              <>
                <div className="border-t border-gray-800 mt-2 pt-2">
                  <button
                    onClick={handleResetRPC}
                    className="w-full flex items-center px-2 py-1.5 text-sm text-red-500 rounded hover:bg-gray-800 transition-colors"
                  >
                    重置为默认 RPC
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="border-t border-gray-800 mt-2 pt-2 px-2">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {isHealthy ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>连接正常</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span>连接异常</span>
                </>
              )}
            </div>
            <div className="text-xs text-gray-600 mt-1 break-all">
              {currentEndpoint}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}