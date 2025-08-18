import { 
  generateSigner,
  percentAmount,
  publicKey,
  createSignerFromKeypair,
  keypairIdentity,
  Umi,
  KeypairSigner,
  sol
} from '@metaplex-foundation/umi';
import { 
  createAndMint,
  TokenStandard,
  createFungible,
  mintV1,
  mplTokenMetadata,
  createV1
} from '@metaplex-foundation/mpl-token-metadata';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { createUmi as createUmiCore } from '@metaplex-foundation/umi-bundle-defaults';
import { Connection, PublicKey } from '@solana/web3.js';

export interface TokenMetadata {
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  externalUrl?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

export interface CreateTokenParams {
  wallet: any; // Wallet adapter
  connection: Connection;
  metadata: TokenMetadata;
  supply: number;
  decimals: number;
}

export async function createToken({
  wallet,
  connection,
  metadata,
  supply,
  decimals,
}: CreateTokenParams) {
  try {
    // Ensure wallet is connected
    if (!wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    console.log('Starting token creation...');
    console.log('RPC Endpoint:', connection.rpcEndpoint);
    console.log('Wallet public key:', wallet.publicKey.toString());

    // Create UMI instance with retry configuration
    const umi = createUmiCore(connection.rpcEndpoint)
      .use(mplTokenMetadata())
      .use(walletAdapterIdentity(wallet));

    // Generate a new mint keypair
    const mint = generateSigner(umi);
    console.log('Generated mint address:', mint.publicKey);

    // Create minimal metadata URI with description
    // Keep it short to avoid transaction size issues
    const minimalMetadata = {
      name: metadata.name,
      symbol: metadata.symbol,
      description: metadata.description || ""
    };
    
    // Use data URI with minimal JSON (no base64 encoding to save space)
    const uri = metadata.description 
      ? `data:application/json,${encodeURIComponent(JSON.stringify(minimalMetadata))}`
      : "";

    console.log('Creating token with metadata:', {
      name: metadata.name,
      symbol: metadata.symbol,
      decimals,
      supply,
    });

    // Create the token with initial mint with retry logic
    let retries = 3;
    let lastError;
    
    while (retries > 0) {
      try {
        const createTx = await createAndMint(umi, {
          mint,
          authority: umi.identity,
          name: metadata.name,
          symbol: metadata.symbol,
          uri: uri,
          sellerFeeBasisPoints: percentAmount(0), // 0% seller fee
          decimals: decimals,
          amount: BigInt(supply) * BigInt(10 ** decimals),
          tokenOwner: umi.identity.publicKey,
          tokenStandard: TokenStandard.Fungible,
        }).sendAndConfirm(umi, { 
          confirm: { 
            commitment: 'confirmed'
          },
          send: {
            skipPreflight: false
          }
        });

        console.log('Token created successfully!');
        console.log('Mint address:', mint.publicKey);
        console.log('Transaction signature:', createTx.signature);

        return {
          success: true,
          mintAddress: mint.publicKey,
          signature: createTx.signature,
        };
      } catch (error: any) {
        lastError = error;
        retries--;
        
        console.error(`Token creation attempt failed (${3 - retries}/3):`, error);
        
        if (retries > 0) {
          console.log(`Retrying in 2 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    throw lastError || new Error('Failed to create token after 3 attempts');
  } catch (error: any) {
    console.error('Error creating token:', error);
    
    // Provide more detailed error messages
    if (error.message?.includes('blockhash')) {
      throw new Error('网络连接超时，请检查您的网络连接并重试');
    } else if (error.message?.includes('insufficient')) {
      throw new Error('账户余额不足，请确保钱包中有足够的 SOL');
    } else if (error.message?.includes('User rejected')) {
      throw new Error('用户取消了交易');
    } else {
      throw new Error(`创建代币失败: ${error.message || '未知错误'}`);
    }
  }
}

export async function createTokenWithMetadataUpload({
  wallet,
  connection,
  metadata,
  supply,
  decimals,
  imageFile,
}: CreateTokenParams & { imageFile?: File }) {
  try {
    // Ensure wallet is connected
    if (!wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    // Create UMI instance
    const umi = createUmiCore(connection.rpcEndpoint)
      .use(mplTokenMetadata())
      .use(walletAdapterIdentity(wallet));

    // Generate a new mint keypair
    const mint = generateSigner(umi);

    // Create minimal metadata URI with description
    // Keep it short to avoid transaction size issues
    const minimalMetadata = {
      name: metadata.name,
      symbol: metadata.symbol,
      description: metadata.description || ""
    };
    
    // Use data URI with minimal JSON (no base64 encoding to save space)
    const uri = metadata.description 
      ? `data:application/json,${encodeURIComponent(JSON.stringify(minimalMetadata))}`
      : "";

    // Create the token
    const createTx = await createAndMint(umi, {
      mint,
      authority: umi.identity,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: uri,
      sellerFeeBasisPoints: percentAmount(0),
      decimals: decimals,
      amount: BigInt(supply) * BigInt(10 ** decimals),
      tokenOwner: umi.identity.publicKey,
      tokenStandard: TokenStandard.Fungible,
    }).sendAndConfirm(umi, { confirm: { commitment: 'confirmed' } });

    return {
      success: true,
      mintAddress: mint.publicKey,
      signature: createTx.signature,
    };
  } catch (error) {
    console.error('Error creating token:', error);
    throw error;
  }
}