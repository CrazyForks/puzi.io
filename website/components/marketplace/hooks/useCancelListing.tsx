"use client";

import { useState } from "react";
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { Puzi, IDL } from "@/anchor-idl/idl";
import { toast } from "sonner";
import { 
  TOKEN_PROGRAM_ID, 
  getAssociatedTokenAddressSync,
  createCloseAccountInstruction,
  createTransferInstruction 
} from "@solana/spl-token";
import { getTotalRentRefund } from "@/utils/rent";
import { WRAPPED_SOL_MINT } from "@/utils/sol-wrapper";
import { Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";

export function useCancelListing() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const wallet = useAnchorWallet();
  const [loading, setLoading] = useState(false);

  const cancelListing = async (
    listingAddress: string,
    sellMint: string,
    listingId: number
  ): Promise<boolean> => {
    if (!publicKey || !wallet) {
      toast.error("请先连接钱包");
      return false;
    }

    setLoading(true);

    try {
      // 创建 Anchor Provider
      const provider = new AnchorProvider(connection, wallet, {
        commitment: "confirmed",
      });

      // 创建 Program 实例 - IDL 已包含 program address
      const program = new Program<Puzi>(IDL, provider);

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

      // Wrapped SOL 也是 SPL Token
      const sellerSellToken = getAssociatedTokenAddressSync(
        sellMintPubkey,
        publicKey
      );

      const escrowSellToken = getAssociatedTokenAddressSync(
        sellMintPubkey,
        listingPda,
        true
      );
      
      // 检查是否是 Wrapped SOL
      const isWrappedSOL = sellMint === WRAPPED_SOL_MINT.toString();

      console.log("Canceling listing:", {
        listingAddress,
        sellMint,
        listingId,
        sellerSellToken: sellerSellToken.toBase58(),
        escrowSellToken: escrowSellToken.toBase58(),
        listingPda: listingPda.toBase58(),
      });

      try {
        // 创建交易
        const transaction = new Transaction();
        
        // 设置交易基本信息
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;
        
        // 添加取消 listing 的指令
        const cancelIx = await program.methods
          .cancelListing()
          .accountsPartial({
            seller: publicKey,
            listing: listingPda,
            sellMint: sellMintPubkey,
            sellerSellToken,
            escrowSellToken,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .instruction();
        
        transaction.add(cancelIx);
        
        // 不在取消卖单时自动 unwrap wSOL，原因：
        // 1. 无法只 unwrap 部分数量（Solana 限制）
        // 2. 关闭整个账户会影响其他 SOL 卖单
        // 3. 用户可能想保留 wSOL 用于其他用途
        // 用户可以在钱包中随时手动 unwrap
        
        console.log("Executing cancel listing transaction...");
        const tx = await provider.sendAndConfirm(transaction, [], {
          skipPreflight: false,
          commitment: 'confirmed'
        });
        
        console.log("Transaction executed successfully");
        console.log("Cancel listing transaction:", tx);

        // 计算返还的租金
        let rentRefund = await getTotalRentRefund(connection, true);
        let rentNote = "(Listing + Escrow账户)";
        
        // 如果取消的是 Wrapped SOL 卖单且包含 unwrap 指令，加上 wSOL 账户租金
        if (isWrappedSOL && transaction.instructions.length > 1) {
          const tokenAccountRent = await connection.getMinimumBalanceForRentExemption(165);
          rentRefund += tokenAccountRent / (LAMPORTS_PER_SOL || 1000000000);
          rentNote = "(Listing + Escrow + wSOL账户)";
        }

        toast.success("卖单已取消", {
          description: (
            <div className="space-y-1">
              <div>交易ID: {tx.slice(0, 8)}...{tx.slice(-8)}</div>
              <div className="text-xs text-gray-400">
                返还租金: {rentRefund.toFixed(6)} SOL {rentNote}
              </div>
            </div>
          ) as any,
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