"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { rpcProvider } from "@/utils/rpc-provider";
import { Wifi, WifiOff, Loader2 } from "lucide-react";
import { RPCSettingsModal } from "./RPCSettingsModal";

export function RPCSettings() {
  const [modalOpen, setModalOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('connected');

  useEffect(() => {
    // Initialize connection status
    setConnectionStatus(rpcProvider.getConnectionStatus());
    
    // Listen for connection status changes
    const handleStatusChange = (status: 'connected' | 'disconnected' | 'checking') => {
      setConnectionStatus(status);
    };
    
    rpcProvider.addStatusListener(handleStatusChange);
    
    return () => {
      rpcProvider.removeStatusListener(handleStatusChange);
    };
  }, []);

  return (
    <>
      <Button 
        variant="ghost" 
        size="sm" 
        className="flex items-center gap-1"
        onClick={() => setModalOpen(true)}
        title="RPC 设置"
      >
        {connectionStatus === 'checking' ? (
          <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
        ) : connectionStatus === 'connected' ? (
          <Wifi className="w-4 h-4 text-green-500" />
        ) : (
          <WifiOff className="w-4 h-4 text-red-500" />
        )}
      </Button>

      <RPCSettingsModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}