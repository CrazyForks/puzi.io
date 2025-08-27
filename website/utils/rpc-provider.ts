import { Connection } from '@solana/web3.js';

export interface RPCEndpoint {
  name: string;
  url: string;
  weight?: number; // For load balancing
}

export const MAINNET_ENDPOINTS: RPCEndpoint[] = [
  { name: 'Solana Public', url: 'https://api.mainnet-beta.solana.com', weight: 1 },
];

export const DEVNET_ENDPOINTS: RPCEndpoint[] = [
  { name: 'Solana Devnet', url: 'https://api.devnet.solana.com', weight: 1 },
];

export type Network = 'mainnet' | 'devnet';

class RPCProvider {
  private network: Network = 'mainnet';
  private endpoints: RPCEndpoint[] = MAINNET_ENDPOINTS;
  private currentEndpointIndex: number = 0;
  private customRPC: string | null = null;
  private connection: Connection | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(endpoint: string) => void> = new Set();

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
    }
    
    // Start health check
    this.startHealthCheck();
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
        confirmTransactionInitialTimeout: 60000,
      });
    }
    
    return this.connection;
  }

  async checkEndpointHealth(endpoint: string): Promise<boolean> {
    try {
      const conn = new Connection(endpoint, { 
        commitment: 'confirmed',
        disableRetryOnRateLimit: true,
      });
      const startTime = Date.now();
      
      // Use getVersion as a simpler health check
      await conn.getVersion();
      
      const latency = Date.now() - startTime;
      
      // Consider endpoint healthy if response time is under 5 seconds
      return latency < 5000;
    } catch (error) {
      console.warn(`RPC endpoint ${endpoint} health check failed`);
      return false;
    }
  }

  async switchToNextEndpoint(): Promise<boolean> {
    if (this.customRPC) {
      // If using custom RPC, don't switch
      return false;
    }

    const startIndex = this.currentEndpointIndex;
    
    do {
      this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.endpoints.length;
      const endpoint = this.endpoints[this.currentEndpointIndex].url;
      
      const isHealthy = await this.checkEndpointHealth(endpoint);
      if (isHealthy) {
        console.log(`Switched to RPC endpoint: ${endpoint}`);
        this.connection = null; // Reset connection
        this.notifyListeners();
        return true;
      }
    } while (this.currentEndpointIndex !== startIndex);
    
    console.error('All RPC endpoints are unhealthy');
    return false;
  }

  private startHealthCheck() {
    // Check health every 60 seconds
    this.healthCheckInterval = setInterval(async () => {
      const endpoint = this.getCurrentEndpoint();
      const isHealthy = await this.checkEndpointHealth(endpoint);
      
      if (!isHealthy && !this.customRPC) {
        console.log('Current RPC endpoint is unhealthy, switching...');
        await this.switchToNextEndpoint();
      }
    }, 60000);
  }

  stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
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
}

// Singleton instance
export const rpcProvider = new RPCProvider();