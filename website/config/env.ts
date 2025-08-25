export type Environment = 'devnet' | 'mainnet';

export interface EnvConfig {
  network: Environment;
  rpcEndpoint: string;
  programId: string;
}

const devnetConfig: EnvConfig = {
  network: 'devnet',
  rpcEndpoint: 'https://devnet.helius-rpc.com/?api-key=7b04005d-ff69-4612-98a3-0eba92102d80',
  programId: '4DqAA2N7V8Bun7zhQssuhGuZNxncLBGK5bV3gWiV2TQk',
};

const mainnetConfig: EnvConfig = {
  network: 'mainnet',
  rpcEndpoint: 'https://api.mainnet-beta.solana.com',
  // TODO: Add mainnet program ID after deployment
  programId: '',
};

export const getEnvConfig = (): EnvConfig => {
  const env = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet') as Environment;
  
  switch (env) {
    case 'mainnet':
      return mainnetConfig;
    case 'devnet':
    default:
      return devnetConfig;
  }
};

export const envConfig = getEnvConfig();