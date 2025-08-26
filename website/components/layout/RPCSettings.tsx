"use client";

import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { rpcProvider, type Network } from "@/utils/rpc-provider";
import { Settings, Wifi, WifiOff, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export function RPCSettings() {
  const [network, setNetwork] = useState<Network>("devnet");
  const [currentEndpoint, setCurrentEndpoint] = useState("");
  const [isHealthy, setIsHealthy] = useState(true);
  const [customRPCDialogOpen, setCustomRPCDialogOpen] = useState(false);
  const [customRPCInput, setCustomRPCInput] = useState("");
  const [checkingHealth, setCheckingHealth] = useState(false);

  useEffect(() => {
    // Initialize state from RPC provider
    setNetwork(rpcProvider.getNetwork());
    setCurrentEndpoint(rpcProvider.getCurrentEndpoint());
    
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

  const checkHealth = async (endpoint: string) => {
    const healthy = await rpcProvider.checkEndpointHealth(endpoint);
    setIsHealthy(healthy);
  };

  const handleNetworkChange = (newNetwork: Network) => {
    rpcProvider.setNetwork(newNetwork);
    setNetwork(newNetwork);
    toast.success(`切换到 ${newNetwork} 网络`);
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
      toast.success("自定义 RPC 已设置");
      
      // Close dialog and reset state
      setCustomRPCDialogOpen(false);
      setCustomRPCInput("");
    } catch (error) {
      setCheckingHealth(false);
      toast.error("检查 RPC 节点时出错");
    }
  };

  const handleResetRPC = () => {
    rpcProvider.setCustomRPC(null);
    toast.success("已重置为默认 RPC");
  };

  const getNetworkDisplayName = () => {
    switch (network) {
      case "mainnet":
        return "主网";
      case "devnet":
        return "开发网";
      default:
        return network;
    }
  };

  const getEndpointDisplayName = () => {
    const name = rpcProvider.getCurrentEndpointName();
    if (name === "Custom RPC") {
      // Show shortened URL for custom RPC
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
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center gap-2 text-gray-300 hover:text-white"
          >
            {isHealthy ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <span className="text-xs">
              {getNetworkDisplayName()}
            </span>
            <Settings className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>RPC 设置</span>
            <span className="text-xs text-gray-500">
              {getEndpointDisplayName()}
            </span>
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuLabel className="text-xs text-gray-500 font-normal">
            选择网络
          </DropdownMenuLabel>
          
          <DropdownMenuItem 
            onClick={() => handleNetworkChange("mainnet")}
            className="flex items-center justify-between"
          >
            <span>主网 (Mainnet)</span>
            {network === "mainnet" && <Check className="w-4 h-4 text-green-500" />}
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => handleNetworkChange("devnet")}
            className="flex items-center justify-between"
          >
            <span>开发网 (Devnet)</span>
            {network === "devnet" && <Check className="w-4 h-4 text-green-500" />}
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => setCustomRPCDialogOpen(true)}>
            <Settings className="w-4 h-4 mr-2" />
            自定义 RPC
          </DropdownMenuItem>
          
          {rpcProvider.getCurrentEndpointName() === "Custom RPC" && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleResetRPC} className="text-red-500">
                重置为默认 RPC
              </DropdownMenuItem>
            </>
          )}
          
          <DropdownMenuSeparator />
          
          <div className="px-2 py-1.5">
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
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={customRPCDialogOpen} onOpenChange={(open) => {
        setCustomRPCDialogOpen(open);
        if (!open) {
          // Reset state when dialog closes
          setCustomRPCInput("");
          setCheckingHealth(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>自定义 RPC 节点</DialogTitle>
            <DialogDescription>
              输入自定义 RPC 节点地址。请确保节点可用且响应速度良好。
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="custom-rpc">RPC 地址</Label>
              <Input
                id="custom-rpc"
                placeholder="https://your-rpc-endpoint.com"
                value={customRPCInput}
                onChange={(e) => setCustomRPCInput(e.target.value)}
                disabled={checkingHealth}
              />
            </div>
            
            <div className="flex items-start gap-2 text-sm text-yellow-600">
              <AlertCircle className="w-4 h-4 mt-0.5" />
              <span>
                使用不可靠的 RPC 节点可能导致交易失败或延迟。建议使用知名的 RPC 服务商。
              </span>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCustomRPCDialogOpen(false);
                setCustomRPCInput("");
                setCheckingHealth(false);
              }}
              disabled={checkingHealth}
            >
              取消
            </Button>
            <Button 
              onClick={handleCustomRPCSubmit}
              disabled={checkingHealth || !customRPCInput.trim()}
            >
              {checkingHealth ? "检查中..." : "确认"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}