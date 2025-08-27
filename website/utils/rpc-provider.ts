import { Connection } from '@solana/web3.js';

export interface RPCEndpoint {
  name: string;
  url: string;
}

export const MAINNET_ENDPOINTS: RPCEndpoint[] = [
  { name: 'Solana Public', url: 'https://solana-rpc.publicnode.com' },
];

export const DEVNET_ENDPOINTS: RPCEndpoint[] = [
  { name: 'Solana Devnet', url: 'https://api.devnet.solana.com' },
];

export type Network = 'mainnet' | 'devnet';

class RPCProvider {
  private network: Network = 'mainnet';
  private endpoints: RPCEndpoint[] = MAINNET_ENDPOINTS;
  private currentEndpointIndex: number = 0;
  private customRPC: string | null = null;
  private connection: Connection | null = null;
  private listeners: Set<(endpoint: string) => void> = new Set();
  private connectionStatus: 'connected' | 'disconnected' | 'checking' = 'connected';
  private statusListeners: Set<(status: 'connected' | 'disconnected' | 'checking') => void> = new Set();

  constructor() {
    // Load saved settings
    if (typeof window !== 'undefined') {
      const savedNetwork = localStorage.getItem('rpc_network') as Network;
      const savedCustomRPC = localStorage.getItem('custom_rpc');
      
      if (savedNetwork) {
        this.setNetwork(savedNetwork);
      }
      if (savedCustomRPC) {
        this.setCustomRPC(savedCustomRPC);
      }
      
      // Do initial health check
      this.checkHealth();
    }
  }

  setNetwork(network: Network) {
    this.network = network;
    
    // Clear custom RPC when changing network
    if (this.customRPC) {
      this.customRPC = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('custom_rpc');
      }
    }
    
    switch (network) {
      case 'mainnet':
        this.endpoints = MAINNET_ENDPOINTS;
        break;
      case 'devnet':
        this.endpoints = DEVNET_ENDPOINTS;
        break;
    }
    
    this.currentEndpointIndex = 0;
    this.connection = null;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('rpc_network', network);
    }
    
    this.notifyListeners();
    // Check health when network changes
    this.checkHealth();
  }

  setCustomRPC(url: string | null) {
    this.customRPC = url;
    this.connection = null;
    
    if (typeof window !== 'undefined') {
      if (url) {
        localStorage.setItem('custom_rpc', url);
      } else {
        localStorage.removeItem('custom_rpc');
      }
    }
    
    this.notifyListeners();
    // Check health when custom RPC changes
    if (url) {
      this.checkHealth();
    }
  }

  getCurrentEndpoint(): string {
    if (this.customRPC) {
      return this.customRPC;
    }
    return this.endpoints[this.currentEndpointIndex].url;
  }

  getConnection(): Connection {
    const endpoint = this.getCurrentEndpoint();
    
    if (!this.connection || this.connection.rpcEndpoint !== endpoint) {
      this.connection = new Connection(endpoint, {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 10000,
      });
    }
    
    return this.connection;
  }

  addListener(callback: (endpoint: string) => void) {
    this.listeners.add(callback);
  }

  removeListener(callback: (endpoint: string) => void) {
    this.listeners.delete(callback);
  }

  private notifyListeners() {
    const endpoint = this.getCurrentEndpoint();
    this.listeners.forEach(callback => callback(endpoint));
  }

  getNetwork(): Network {
    return this.network;
  }

  getEndpoints(): RPCEndpoint[] {
    return this.endpoints;
  }

  getCurrentEndpointName(): string {
    if (this.customRPC) {
      return 'Custom RPC';
    }
    return this.endpoints[this.currentEndpointIndex].name;
  }

  // Health check
  async checkHealth(): Promise<boolean> {
    this.setConnectionStatus('checking');
    
    try {
      const endpoint = this.getCurrentEndpoint();
      const testConnection = new Connection(endpoint, {
        commitment: 'confirmed',
        disableRetryOnRateLimit: true,
      });
      
      // Simple health check - just try to get version
      await testConnection.getVersion();
      
      this.setConnectionStatus('connected');
      return true;
    } catch (error) {
      console.warn('RPC health check failed:', error);
      this.setConnectionStatus('disconnected');
      return false;
    }
  }

  // Connection status management
  private setConnectionStatus(status: 'connected' | 'disconnected' | 'checking') {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      this.notifyStatusListeners();
    }
  }

  getConnectionStatus(): 'connected' | 'disconnected' | 'checking' {
    return this.connectionStatus;
  }

  addStatusListener(callback: (status: 'connected' | 'disconnected' | 'checking') => void) {
    this.statusListeners.add(callback);
  }

  removeStatusListener(callback: (status: 'connected' | 'disconnected' | 'checking') => void) {
    this.statusListeners.delete(callback);
  }

  private notifyStatusListeners() {
    this.statusListeners.forEach(callback => callback(this.connectionStatus));
  }
}

// Singleton instance
export const rpcProvider = new RPCProvider();