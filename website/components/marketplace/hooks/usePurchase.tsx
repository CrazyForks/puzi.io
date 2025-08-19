"use client";

import { useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync
} from "@solana/spl-token";
import { PuziContracts, IDL } from "@/anchor-idl/idl";
import { toast } from "sonner";

export function usePurchase() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [loading, setLoading] = useState(false);

  const purchaseToken = useCallback(async (
    listingAddress: string,
    sellMint: string,
    buyMint: string,
    seller: string,
    buyAmount: number,
    pricePerToken: number,
    listingId: number,
    sellTokenDecimals?: number,
    buyTokenDecimals?: number
  ) => {
    if (!publicKey || !signTransaction) {
      toast.error("请先连接钱包");
      return false;
    }

    setLoading(true);
    
    // 先定义这些变量，以便在错误处理中使用
    let escrowSellToken: PublicKey | undefined;
    let buyerSellTokenAccount: PublicKey | undefined;
    let sellerBuyTokenAccount: PublicKey | undefined;
    let buyerBuyTokenAccount: PublicKey | undefined;

    try {
      const provider = new AnchorProvider(
        connection,
        { publicKey, signTransaction } as any,
        { commitment: "confirmed" }
      );
      
      const program = new Program<PuziContracts>(IDL, provider);

      const sellMintPubkey = new PublicKey(sellMint);
      const buyMintPubkey = new PublicKey(buyMint);
      const sellerPubkey = new PublicKey(seller);
      const listingPubkey = new PublicKey(listingAddress);

      // 获取买家的代币账户地址
      buyerSellTokenAccount = await getAssociatedTokenAddress(
        sellMintPubkey,
        publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      buyerBuyTokenAccount = await getAssociatedTokenAddress(
        buyMintPubkey,
        publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // 获取卖家的代币账户地址
      sellerBuyTokenAccount = await getAssociatedTokenAddress(
        buyMintPubkey,
        sellerPubkey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const sellerSellTokenAccount = await getAssociatedTokenAddress(
        sellMintPubkey,
        sellerPubkey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // Get escrow token account (owned by the listing PDA)
      // 所有代币都作为SPL Token处理
      escrowSellToken = getAssociatedTokenAddressSync(
        sellMintPubkey,
        listingPubkey,
        true, // allowOwnerOffCurve
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // 创建交易
      const transaction = new Transaction();

      // 检查所有必需的token账户
      console.log("检查token账户...");
      
      // 1. 检查买家的buy token账户（用于支付）
      const buyerBuyAccountInfo = await connection.getAccountInfo(buyerBuyTokenAccount);
      
      // 计算需要的金额
      const buyDecimals = buyTokenDecimals ?? 9;
      const sellDecimals = sellTokenDecimals ?? 9;
      const neededAmount = (pricePerToken * buyAmount) / Math.pow(10, sellDecimals);
      const neededAmountUI = neededAmount / Math.pow(10, buyDecimals);
      
      if (!buyerBuyAccountInfo) {
        console.log("买家buy token账户不存在");
        
        // 如果是买WSOL（wrapped SOL），我们可以创建并存入
        if (buyMint === "So11111111111111111111111111111111111111112") {
          console.log("是WSOL，将创建账户并存入");
          // 这里需要特殊处理WSOL
          toast.error("暂不支持直接使用SOL购买，请先将SOL转换为Wrapped SOL");
          return false;
        } else {
          // 对于其他代币，用户需要先获得这些代币
          toast.error(`您没有用于支付的代币 ${buyMint}，请先获取该代币`);
          return false;
        }
      } else {
        console.log("买家buy token账户已存在");
        // 检查余额
        try {
          const balance = await connection.getTokenAccountBalance(buyerBuyTokenAccount);
          console.log("买家buy token余额:", balance.value.uiAmount, buyMint);
          console.log("需要支付的金额:", neededAmountUI);
          
          if (balance.value.uiAmount === null || balance.value.uiAmount === 0) {
            toast.error(`您的支付代币余额为0，请先获取代币`);
            return false;
          }
          
          if (balance.value.uiAmount < neededAmountUI) {
            toast.error(`余额不足！当前余额: ${balance.value.uiAmount}, 需要: ${neededAmountUI}`);
            return false;
          }
        } catch (e) {
          console.error("获取余额失败:", e);
          toast.error("无法获取您的代币余额，请稍后重试");
          return false;
        }
      }

      // 2. 检查买家的sell token账户（用于接收）
      const buyerSellAccountInfo = await connection.getAccountInfo(buyerSellTokenAccount);
      if (!buyerSellAccountInfo) {
        console.log("买家sell token账户不存在，创建中...");
        transaction.add(
          createAssociatedTokenAccountInstruction(
            publicKey,
            buyerSellTokenAccount,
            publicKey,
            sellMintPubkey,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        );
      } else {
        console.log("买家sell token账户已存在");
      }

      // 3. 检查卖家的buy token账户（用于接收付款）
      const sellerBuyAccountInfo = await connection.getAccountInfo(sellerBuyTokenAccount);
      if (!sellerBuyAccountInfo) {
        console.log("卖家buy token账户不存在，创建中...");
        transaction.add(
          createAssociatedTokenAccountInstruction(
            publicKey,
            sellerBuyTokenAccount,
            sellerPubkey,
            buyMintPubkey,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        );
      } else {
        console.log("卖家buy token账户已存在");
      }
      
      // 4. 检查escrow token账户（应该在创建Listing时已经创建）
      const escrowAccountInfo = await connection.getAccountInfo(escrowSellToken);
      if (!escrowAccountInfo) {
        console.warn("警告：Escrow token账户不存在！这可能导致交易失败");
        console.log("Escrow账户地址:", escrowSellToken.toBase58());
      } else {
        console.log("Escrow token账户已存在");
      }

      // 添加购买指令 - 完全按照测试中的方式
      console.log("构建购买指令，账户信息:", {
        buyer: publicKey.toBase58(),
        listing: listingPubkey.toBase58(),
        seller: sellerPubkey.toBase58(),
        buyerBuyToken: buyerBuyTokenAccount.toBase58(),
        sellerBuyToken: sellerBuyTokenAccount.toBase58(),
        escrowSellToken: escrowSellToken.toBase58(),
        buyerSellToken: buyerSellTokenAccount.toBase58(),
        buyAmount: buyAmount.toString()
      });
      
      const purchaseIx = await program.methods
        .purchase(new BN(buyAmount))
        .accountsPartial({
          buyer: publicKey,
          listing: listingPubkey,
          seller: sellerPubkey,
          buyerBuyToken: buyerBuyTokenAccount,
          sellerBuyToken: sellerBuyTokenAccount,
          escrowSellToken: escrowSellToken,
          buyerSellToken: buyerSellTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .instruction();

      transaction.add(purchaseIx);
      
      console.log("交易指令数:", transaction.instructions.length);

      // 发送交易
      console.log("发送交易...");
      const signature = await provider.sendAndConfirm(transaction, [], {
        skipPreflight: false,
        commitment: 'confirmed'
      });
      
      console.log("购买成功，交易签名:", signature);
      
      // 使用正确的 decimals 计算显示数量（变量已在前面定义）
      const displayAmount = buyAmount / Math.pow(10, sellDecimals);
      const totalPrice = (pricePerToken * buyAmount / Math.pow(10, sellDecimals)) / Math.pow(10, buyDecimals);
      
      toast.success(`成功购买！交易已完成`, {
        description: `购买数量: ${displayAmount}, 总价: ${totalPrice.toFixed(6)}`
      });

      return true;
    } catch (error: any) {
      console.error("购买失败:", error);
      
      // 如果有日志，打印出来
      if (error.logs) {
        console.error("交易日志:");
        error.logs.forEach((log: string, index: number) => {
          console.error(`  [${index}] ${log}`);
        });
      }
      console.error("错误详情:", {
        sellMint,
        buyMint,
        buyAmount,
        pricePerToken,
        listingAddress,
        escrowSellToken: escrowSellToken?.toBase58(),
        buyerSellTokenAccount: buyerSellTokenAccount?.toBase58(),
        sellerBuyTokenAccount: sellerBuyTokenAccount?.toBase58(),
        buyerBuyTokenAccount: buyerBuyTokenAccount?.toBase58(),
        errorLogs: error.logs || [],
      });
      
      let errorMessage = "购买失败";
      
      // 检查具体的错误类型
      if (error.logs) {
        // 查找程序错误日志
        const errorLog = error.logs.find((log: string) => 
          log.includes("Error") || 
          log.includes("failed") || 
          log.includes("insufficient") ||
          log.includes("InsufficientStock") ||
          log.includes("listingNotActive")
        );
        if (errorLog) {
          console.error("程序错误日志:", errorLog);
        }
      }
      
      if (error.message?.includes("insufficient") || error.message?.includes("0x1")) {
        errorMessage = "余额不足";
      } else if (error.message?.includes("User rejected")) {
        errorMessage = "用户取消了交易";
      } else if (error.message?.includes("InsufficientStock") || error.message?.includes("0x1772")) {
        errorMessage = "库存不足";
      } else if (error.message?.includes("listingNotActive") || error.message?.includes("0x1770")) {
        errorMessage = "卖单不活跃或已失效";
      } else if (error.message?.includes("simulation")) {
        errorMessage = "交易模拟失败，请检查余额和网络状态";
      } else if (error.message) {
        errorMessage = error.message.substring(0, 100); // 限制错误信息长度
      }
      
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [publicKey, signTransaction, connection]);

  return {
    purchaseToken,
    loading
  };
}