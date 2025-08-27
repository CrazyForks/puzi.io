"use client";

import { useState } from "react";
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction
} from "@solana/spl-token";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { Puzi, IDL } from "@/anchor-idl/idl";
import { toast } from "sonner";
import { BN } from "@coral-xyz/anchor";
import { getTotalRentRefund } from "@/utils/rent";
import { WRAPPED_SOL_MINT } from "@/utils/sol-wrapper";
import { 
  sendAndConfirmTransaction, 
  showTransactionSuccess, 
  parseTransactionError,
  logTransactionError 
} from "@/utils/transaction-helper";

interface CreateListingParams {
  sellMint: string;
  buyMint: string;
  amount: number;
  pricePerToken: number;
  isNativeSOL?: boolean; // 指示是否是原生 SOL
}

export function useCreateListing() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const wallet = useAnchorWallet();
  const [loading, setLoading] = useState(false);

  const createListing = async (params: CreateListingParams): Promise<boolean> => {
    if (!publicKey || !wallet) {
      toast.error("请先连接钱包");
      return false;
    }

    setLoading(true);

    try {
      // 创建 Anchor Provider - 增加超时时间
      const provider = new AnchorProvider(connection, wallet, {
        commitment: "confirmed",
        preflightCommitment: "confirmed",
        skipPreflight: false
      });

      // 创建 Program 实例 - IDL 已包含 program address
      const program = new Program<Puzi>(IDL, provider);

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

      // 创建交易
      const transaction = new Transaction();
      
      // 如果是原生 SOL，需要先 wrap
      let sellMintPubkey: PublicKey;
      let sellerSellToken: PublicKey;
      let escrowSellToken: PublicKey;
      
      if (params.isNativeSOL) {
        // 使用 Wrapped SOL mint
        sellMintPubkey = WRAPPED_SOL_MINT;
        
        // 获取 wSOL token 账户
        sellerSellToken = await getAssociatedTokenAddress(
          WRAPPED_SOL_MINT,
          publicKey,
          false,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );
        
        // 检查 wSOL 账户是否存在
        const accountInfo = await connection.getAccountInfo(sellerSellToken);
        
        if (!accountInfo) {
          // 创建 wSOL 账户
          transaction.add(
            createAssociatedTokenAccountInstruction(
              publicKey, // payer
              sellerSellToken, // token account
              publicKey, // owner
              WRAPPED_SOL_MINT, // mint
              TOKEN_PROGRAM_ID,
              ASSOCIATED_TOKEN_PROGRAM_ID
            )
          );
        }
        
        // 转账 SOL 到 wSOL 账户
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: sellerSellToken,
            lamports: params.amount, // amount 已经是 lamports
          })
        );
        
        // 同步 native 账户余额
        transaction.add(
          createSyncNativeInstruction(
            sellerSellToken,
            TOKEN_PROGRAM_ID
          )
        );
        
        escrowSellToken = getAssociatedTokenAddressSync(
          WRAPPED_SOL_MINT,
          listingPda,
          true // allowOwnerOffCurve = true for PDA
        );
      } else {
        // 普通 SPL token
        sellMintPubkey = new PublicKey(params.sellMint);
        
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
      
      const buyMintPubkey = new PublicKey(params.buyMint);

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

      // 添加创建 listing 的指令
      const createListingIx = await (program as any).methods
        .createListing(
          new BN(params.pricePerToken),
          new BN(params.amount),
          listingId
        )
        .accountsPartial({
          seller: publicKey,
          listing: listingPda,
          sellMint: sellMintPubkey,
          buyMint: buyMintPubkey,
          sellerSellToken,
          escrowSellToken,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .instruction();
      
      transaction.add(createListingIx);
      
      // 发送交易
      const tx = await sendAndConfirmTransaction(provider, transaction);

      // 计算实际支付的租金
      let rentCost = await getTotalRentRefund(connection);
      let rentNote = "";
      
      // 如果是原生 SOL 且创建了 wSOL 账户，加上额外租金
      if (params.isNativeSOL) {
        // 检查交易中是否创建了 wSOL 账户
        const hasCreateWsolAccount = transaction.instructions.some(ix => 
          ix.programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID)
        );
        
        if (hasCreateWsolAccount) {
          const tokenAccountRent = await connection.getMinimumBalanceForRentExemption(165);
          rentCost += tokenAccountRent / LAMPORTS_PER_SOL;
          rentNote = " (含 wSOL 账户)";
        }
      }

      // 显示成功消息
      showTransactionSuccess(tx, "卖单创建成功!", (
        <div className="text-xs text-yellow-500">
          支付租金: {rentCost.toFixed(6)} SOL{rentNote}
        </div>
      ));

      return true;
    } catch (error: any) {
      logTransactionError(error, "Create listing");
      const errorMessage = parseTransactionError(error);
      toast.error(`创建卖单失败: ${errorMessage}`);
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