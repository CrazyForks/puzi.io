"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID, 
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError
} from "@solana/spl-token";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { PuziContracts, IDL } from "@/anchor-idl/idl";
import { toast } from "sonner";
import { BN } from "@coral-xyz/anchor";

interface CreateListingParams {
  sellMint: string;
  buyMint: string;
  amount: number;
  pricePerToken: number;
}

export function useCreateListing() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [loading, setLoading] = useState(false);

  const createListing = async (params: CreateListingParams): Promise<boolean> => {
    if (!publicKey || !signTransaction) {
      toast.error("请先连接钱包");
      return false;
    }

    setLoading(true);

    try {
      // 创建 Anchor Provider
      const provider = new AnchorProvider(
        connection,
        { 
          publicKey,
          signTransaction,
          signAllTransactions: async () => {
            throw new Error("signAllTransactions not implemented");
          }
        },
        { commitment: "confirmed" }
      );

      // 创建 Program 实例
      const program = new Program<PuziContracts>(IDL, provider);

      // 生成唯一的 listing ID
      const listingId = new BN(Date.now());

      // 计算 PDA
      const [listingPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("listing"),
          publicKey.toBuffer(),
          listingId.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      // 获取代币账户地址
      const sellMintPubkey = new PublicKey(params.sellMint);
      const buyMintPubkey = new PublicKey(params.buyMint);
      
      // 检查是否是SOL
      const isSellingSOL = params.sellMint === "So11111111111111111111111111111111111111112";
      
      let sellerSellToken: PublicKey;
      let escrowSellToken: PublicKey;
      
      if (isSellingSOL) {
        // 对于SOL，使用系统账户
        sellerSellToken = publicKey;
        escrowSellToken = listingPda;
      } else {
        // 对于SPL代币，使用关联代币账户
        sellerSellToken = getAssociatedTokenAddressSync(
          sellMintPubkey,
          publicKey
        );

        escrowSellToken = getAssociatedTokenAddressSync(
          sellMintPubkey,
          listingPda,
          true // allowOwnerOffCurve = true for PDA
        );
      }

      console.log("Creating listing with params:", {
        sellMint: params.sellMint,
        buyMint: params.buyMint,
        amount: params.amount,
        pricePerToken: params.pricePerToken,
        listingId: listingId.toString(),
        listingPda: listingPda.toBase58(),
        sellerSellToken: sellerSellToken.toBase58(),
        escrowSellToken: escrowSellToken.toBase58(),
      });

      // 检查escrow代币账户是否存在（只对SPL代币）
      let escrowAccountExists = isSellingSOL; // SOL不需要代币账户
      if (!isSellingSOL) {
        try {
          await getAccount(connection, escrowSellToken);
          escrowAccountExists = true;
          console.log("Escrow account already exists");
        } catch (error) {
          if (error instanceof TokenAccountNotFoundError || error instanceof TokenInvalidAccountOwnerError) {
            console.log("Escrow account does not exist, will create it");
            escrowAccountExists = false;
          } else {
            throw error;
          }
        }
      }

      // 创建交易，如果需要的话包含创建escrow账户的指令
      const tx = await program.methods
        .createListing(
          new BN(params.pricePerToken),
          new BN(params.amount),
          listingId
        )
        .accountsPartial({
          seller: publicKey,
          sellMint: sellMintPubkey,
          buyMint: buyMintPubkey,
          sellerSellToken,
          escrowSellToken,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .preInstructions(!escrowAccountExists ? [
          createAssociatedTokenAccountInstruction(
            publicKey, // payer
            escrowSellToken, // associatedToken
            listingPda, // owner (PDA)
            sellMintPubkey // mint
          )
        ] : [])
        .rpc();

      console.log("Transaction signature:", tx);

      toast.success("卖单创建成功!", {
        description: `交易ID: ${tx.slice(0, 8)}...${tx.slice(-8)}`,
      });

      return true;
    } catch (error) {
      console.error("Failed to create listing:", error);
      
      let errorMessage = "创建卖单失败";
      if (error instanceof Error) {
        if (error.message.includes("insufficient funds")) {
          errorMessage = "余额不足";
        } else if (error.message.includes("User rejected")) {
          errorMessage = "交易被取消";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    createListing,
    loading,
  };
}