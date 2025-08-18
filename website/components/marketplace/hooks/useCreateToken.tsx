"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { 
  Keypair, 
  SystemProgram, 
  Transaction,
} from "@solana/web3.js";
import { 
  createInitializeMintInstruction,
  createMintToInstruction,
  createAssociatedTokenAccountInstruction,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { toast } from "sonner";
import { useTokenMetadata } from "./useTokenMetadata";

interface CreateTokenParams {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: number;
  description?: string;
}

interface CreateTokenResult {
  mintAddress: string;
  signature: string;
}

export function useCreateToken() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const { saveTokenMetadata } = useTokenMetadata();

  const createToken = async (params: CreateTokenParams): Promise<CreateTokenResult | null> => {
    if (!publicKey || !signTransaction) {
      toast.error("请先连接钱包");
      return null;
    }

    setLoading(true);

    try {
      // 生成新的mint keypair
      const mintKeypair = Keypair.generate();
      console.log("创建代币 Mint 地址:", mintKeypair.publicKey.toBase58());

      // 计算rent-exempt余额
      const rentExemptBalance = await getMinimumBalanceForRentExemptMint(connection);

      // 获取关联代币账户地址
      const associatedTokenAddress = getAssociatedTokenAddressSync(
        mintKeypair.publicKey,
        publicKey
      );

      // 创建交易
      const transaction = new Transaction().add(
        // 创建mint账户
        SystemProgram.createAccount({
          fromPubkey: publicKey,
          newAccountPubkey: mintKeypair.publicKey,
          space: MINT_SIZE,
          lamports: rentExemptBalance,
          programId: TOKEN_PROGRAM_ID,
        }),
        // 初始化mint
        createInitializeMintInstruction(
          mintKeypair.publicKey,
          params.decimals,
          publicKey, // mint authority
          publicKey  // freeze authority
        ),
        // 创建关联代币账户
        createAssociatedTokenAccountInstruction(
          publicKey, // payer
          associatedTokenAddress,
          publicKey, // owner
          mintKeypair.publicKey // mint
        ),
        // 铸造初始供应量
        createMintToInstruction(
          mintKeypair.publicKey,
          associatedTokenAddress,
          publicKey,
          BigInt(params.initialSupply * Math.pow(10, params.decimals))
        )
      );

      // 设置最新的blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // 签名交易（包括mint keypair）
      transaction.partialSign(mintKeypair);
      const signedTransaction = await signTransaction(transaction);

      // 发送并确认交易
      console.log("发送代币创建交易...");
      const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });

      // 确认交易
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, "confirmed");

      if (confirmation.value.err) {
        throw new Error(`交易失败: ${confirmation.value.err}`);
      }

      console.log("代币创建成功!", signature);

      // 保存代币元数据到本地存储
      saveTokenMetadata(mintKeypair.publicKey.toBase58(), {
        name: params.name,
        symbol: params.symbol,
        description: params.description,
      });

      toast.success("代币创建成功!", {
        description: `${params.symbol} 已成功创建并铸造 ${params.initialSupply.toLocaleString()} 个代币`,
      });

      return {
        mintAddress: mintKeypair.publicKey.toBase58(),
        signature,
      };

    } catch (error) {
      console.error("创建代币失败:", error);
      
      let errorMessage = "创建代币失败";
      if (error instanceof Error) {
        if (error.message.includes("insufficient funds")) {
          errorMessage = "余额不足，需要约 0.002 SOL 创建代币";
        } else if (error.message.includes("User rejected")) {
          errorMessage = "交易被取消";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    createToken,
    loading,
  };
}