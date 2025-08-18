"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { PuziContracts, IDL } from "@/anchor-idl/idl";
import { toast } from "sonner";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";

export function useCancelListing() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [loading, setLoading] = useState(false);

  const cancelListing = async (
    listingAddress: string,
    sellMint: string,
    listingId: number
  ): Promise<boolean> => {
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

      const sellMintPubkey = new PublicKey(sellMint);
      
      // 重新计算正确的 listing PDA
      const listingIdBN = new BN(listingId);
      const [listingPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("listing"),
          publicKey.toBuffer(),
          listingIdBN.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );
      
      // 验证计算出的 PDA 是否与传入的地址匹配
      if (listingPda.toBase58() !== listingAddress) {
        console.warn("PDA mismatch:", {
          calculated: listingPda.toBase58(),
          provided: listingAddress,
          listingId
        });
      }

      // 验证 listing 账户是否存在
      try {
        const listingAccount = await program.account.listing.fetch(listingPda);
        console.log("Listing account found:", listingAccount);
        
        // 验证这是当前用户的 listing
        if (listingAccount.seller.toBase58() !== publicKey.toBase58()) {
          throw new Error("只能取消自己创建的卖单");
        }
      } catch (accountError) {
        console.error("Failed to fetch listing account:", accountError);
        throw new Error("卖单不存在或已被取消");
      }

      // 检查是否是SOL
      const isSellingSOL = sellMint === "So11111111111111111111111111111111111111112";
      
      let sellerSellToken: PublicKey;
      let escrowSellToken: PublicKey;
      
      if (isSellingSOL) {
        sellerSellToken = publicKey;
        escrowSellToken = listingPda;
      } else {
        sellerSellToken = getAssociatedTokenAddressSync(
          sellMintPubkey,
          publicKey
        );

        escrowSellToken = getAssociatedTokenAddressSync(
          sellMintPubkey,
          listingPda,
          true
        );
      }

      console.log("Canceling listing:", {
        listingAddress,
        sellMint,
        listingId,
        sellerSellToken: sellerSellToken.toBase58(),
        escrowSellToken: escrowSellToken.toBase58(),
        listingPda: listingPda.toBase58(),
      });

      try {
        // 构建取消卖单交易
        console.log("Building cancel listing instruction...");
        const instruction = await program.methods
          .cancelListing()
          .accounts({
            seller: publicKey,
            listing: listingPda,
            sellerSellToken,
            escrowSellToken,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .instruction();

        console.log("Instruction built successfully");

        // 创建交易
        console.log("Getting latest blockhash...");
        const { blockhash } = await connection.getLatestBlockhash();
        const transaction = new Transaction({
          recentBlockhash: blockhash,
          feePayer: publicKey,
        });
        
        transaction.add(instruction);
        console.log("Transaction created successfully");

        // 签名交易
        console.log("Signing transaction...");
        const signedTransaction = await signTransaction(transaction);
        console.log("Transaction signed successfully");

        // 发送交易
        console.log("Sending transaction...");
        const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
          skipPreflight: false,
          preflightCommitment: 'confirmed'
        });
        console.log("Transaction sent, signature:", signature);

        // 确认交易
        console.log("Confirming transaction...");
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${confirmation.value.err}`);
        }
        console.log("Transaction confirmed successfully");

        const tx = signature;

        console.log("Cancel listing transaction:", tx);

        toast.success("卖单已取消", {
          description: `交易ID: ${tx.slice(0, 8)}...${tx.slice(-8)}`,
        });

        return true;
      } catch (innerError) {
        console.error("Error in transaction process:", innerError);
        throw innerError; // 重新抛出错误给外层 catch 处理
      }
    } catch (error) {
      console.error("Failed to cancel listing:", error);
      console.error("Error details:", {
        listingAddress,
        sellMint,
        listingId,
        publicKey: publicKey?.toBase58(),
        error: error instanceof Error ? error.message : String(error)
      });
      
      let errorMessage = "取消卖单失败";
      if (error instanceof Error) {
        if (error.message.includes("User rejected")) {
          errorMessage = "交易被取消";
        } else if (error.message.includes("Unauthorized")) {
          errorMessage = "无权限取消此卖单";
        } else if (error.message.includes("0x1") || error.message.includes("InsufficientFunds")) {
          errorMessage = "余额不足支付交易费用";
        } else if (error.message.includes("0x7d1")) {
          errorMessage = "账户不存在或已被关闭";
        } else if (error.message.includes("0x7d0")) {
          errorMessage = "无效的账户数据";
        } else if (error.message.includes("seeds constraint")) {
          errorMessage = "无效的卖单地址";
        } else if (error.message.includes("A raw constraint was violated")) {
          errorMessage = "权限验证失败，只能取消自己的卖单";
        } else {
          errorMessage = `取消失败: ${error.message}`;
        }
      }
      
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    cancelListing,
    loading,
  };
}