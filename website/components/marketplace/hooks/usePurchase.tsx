"use client";

import { useState, useCallback } from "react";
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createSyncNativeInstruction,
  createCloseAccountInstruction
} from "@solana/spl-token";
import { Puzi, IDL } from "@/anchor-idl/idl";
import { toast } from "sonner";
import {
  WRAPPED_SOL_MINT
} from "@/utils/sol-wrapper";
import { USDC_MAINNET, USDC_DEVNET, getUSDCSymbol } from "@/utils/usdc-address";
import {
  sendAndConfirmTransaction,
  showTransactionSuccess,
  parseTransactionError,
  logTransactionError
} from "@/utils/transaction-helper";

export function usePurchase() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const wallet = useAnchorWallet();
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
    if (!publicKey || !wallet) {
      toast.error("请先连接钱包");
      return false;
    }

    setLoading(true);

    // 先定义这些变量，以便在错误处理中使用
    let escrowSellToken: PublicKey | undefined;
    let buyerSellTokenAccount: PublicKey | undefined;
    let sellerBuyTokenAccount: PublicKey | undefined;
    let buyerBuyTokenAccount: PublicKey | undefined;

    // 获取支付代币的名称
    let buyTokenName = "支付代币";
    if (buyMint === "So11111111111111111111111111111111111111112") {
      buyTokenName = "Wrapped SOL";
    } else if (buyMint === USDC_DEVNET || buyMint === USDC_MAINNET) {
      buyTokenName = getUSDCSymbol();
    }

    try {
      const provider = new AnchorProvider(connection, wallet, {
        commitment: "confirmed",
        preflightCommitment: "confirmed",
        skipPreflight: false
      });

      // 创建 Program 实例 - IDL 已包含 program address
      const program = new Program<Puzi>(IDL, provider);

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

      // const sellerSellTokenAccount = await getAssociatedTokenAddress(
      //   sellMintPubkey,
      //   sellerPubkey,
      //   false,
      //   TOKEN_PROGRAM_ID,
      //   ASSOCIATED_TOKEN_PROGRAM_ID
      // );

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
      // pricePerToken 现在是每个完整代币的价格（以买币最小单位计）
      // buyAmount 是要购买的数量（以卖币最小单位计）
      // 合约会计算: total_price = pricePerToken * buyAmount / 10^sellDecimals
      const buyDecimals = buyTokenDecimals ?? 9;
      const sellDecimals = sellTokenDecimals ?? 9;

      // 计算总价（以买币最小单位计）- 与合约逻辑保持一致
      const totalPriceInSmallestUnit = Math.floor(pricePerToken * buyAmount / Math.pow(10, sellDecimals));

      // 转换为UI显示金额
      const neededAmountUI = totalPriceInSmallestUnit / Math.pow(10, buyDecimals);

      console.log("价格计算详情:", {
        pricePerToken,
        buyAmount,
        sellDecimals,
        buyDecimals,
        totalPriceInSmallestUnit,
        neededAmountUI
      });

      // 特殊处理 SOL 购买场景
      if (buyMint === WRAPPED_SOL_MINT.toString() || buyMint === "So11111111111111111111111111111111111111112") {
        console.log("使用 SOL 购买，检查是否需要 wrap");

        // 检查 SOL 余额
        const solBalance = await connection.getBalance(publicKey);
        const solBalanceInSol = solBalance / LAMPORTS_PER_SOL;

        // 预留 0.01 SOL 作为交易费
        const reserveForFees = 0.01;
        const availableSol = Math.max(0, solBalanceInSol - reserveForFees);

        if (availableSol < neededAmountUI) {
          toast.error(`SOL 余额不足！可用余额: ${availableSol.toFixed(4)} SOL, 需要: ${neededAmountUI.toFixed(4)} SOL`);
          return false;
        }

        // 检查是否已有 wSOL 账户
        if (!buyerBuyAccountInfo) {
          console.log("创建 wSOL 账户并 wrap SOL");

          // 创建 wSOL 账户并 wrap SOL
          transaction.add(
            createAssociatedTokenAccountInstruction(
              publicKey,
              buyerBuyTokenAccount,
              publicKey,
              new PublicKey(WRAPPED_SOL_MINT),
              TOKEN_PROGRAM_ID,
              ASSOCIATED_TOKEN_PROGRAM_ID
            )
          );

          // 转账 SOL 到 wSOL 账户
          // 需要精确的金额，不要多 wrap
          const wrapAmount = totalPriceInSmallestUnit;
          transaction.add(
            SystemProgram.transfer({
              fromPubkey: publicKey,
              toPubkey: buyerBuyTokenAccount,
              lamports: wrapAmount,
            })
          );

          // Sync native 指令，将 SOL 转换为 wSOL
          transaction.add(
            createSyncNativeInstruction(buyerBuyTokenAccount, TOKEN_PROGRAM_ID)
          );

          console.log(`将 wrap ${wrapAmount / LAMPORTS_PER_SOL} SOL`);
        } else {
          // 已有 wSOL 账户，检查余额是否足够
          try {
            const wsolBalance = await connection.getTokenAccountBalance(buyerBuyTokenAccount);
            const currentWsolBalance = wsolBalance.value.uiAmount || 0;

            if (currentWsolBalance < neededAmountUI) {
              // 需要补充 wSOL
              const additionalAmount = Math.ceil((neededAmountUI - currentWsolBalance) * LAMPORTS_PER_SOL);

              console.log(`当前 wSOL 余额: ${currentWsolBalance}, 需要额外 wrap: ${additionalAmount / LAMPORTS_PER_SOL} SOL`);

              // 转账额外的 SOL 到 wSOL 账户
              transaction.add(
                SystemProgram.transfer({
                  fromPubkey: publicKey,
                  toPubkey: buyerBuyTokenAccount,
                  lamports: additionalAmount,
                })
              );

              // Sync native 指令
              transaction.add(
                createSyncNativeInstruction(buyerBuyTokenAccount, TOKEN_PROGRAM_ID)
              );
            }
          } catch (e) {
            console.error("获取 wSOL 余额失败:", e);
            // 如果获取失败，尝试 wrap 需要的金额
            const wrapAmount = totalPriceInSmallestUnit;
            transaction.add(
              SystemProgram.transfer({
                fromPubkey: publicKey,
                toPubkey: buyerBuyTokenAccount,
                lamports: wrapAmount,
              })
            );
            transaction.add(
              createSyncNativeInstruction(buyerBuyTokenAccount, TOKEN_PROGRAM_ID)
            );
          }
        }
      } else {
        // 非 SOL 代币的原有逻辑
        if (!buyerBuyAccountInfo) {
          console.log("买家buy token账户不存在", buyMint);
          toast.error(`您没有 ${buyTokenName} 账户，请先获取 ${buyTokenName} 代币`);
          return false;
        } else {
          console.log("买家buy token账户已存在");
          // 检查余额
          try {
            const balance = await connection.getTokenAccountBalance(buyerBuyTokenAccount);
            console.log("买家buy token余额:", balance.value.uiAmount, buyMint);
            console.log("需要支付的金额:", neededAmountUI);

            if (balance.value.uiAmount === null || balance.value.uiAmount < neededAmountUI) {
              toast.error(`${buyTokenName} 余额不足！当前余额: ${balance.value.uiAmount || 0}, 需要: ${neededAmountUI}`);
              return false;
            }
          } catch (e) {
            console.error("获取余额失败:", e);
            toast.error("无法获取您的代币余额，请稍后重试");
            return false;
          }
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

      const purchaseIx = await (program as any).methods
        .purchase(new BN(buyAmount))
        .accountsPartial({
          buyer: publicKey,
          listing: listingPubkey,
          seller: sellerPubkey,
          sellMint: sellMintPubkey,
          buyMint: buyMintPubkey,
          buyerBuyToken: buyerBuyTokenAccount,
          sellerBuyToken: sellerBuyTokenAccount,
          escrowSellToken: escrowSellToken,
          buyerSellToken: buyerSellTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .instruction();

      transaction.add(purchaseIx);

      // 如果购买的是 Wrapped SOL，在同一笔交易中 unwrap
      // 这不会影响用户的其他 SOL 卖单，因为这是购买到的新代币
      if (sellMint === "So11111111111111111111111111111111111111112" || sellMint === WRAPPED_SOL_MINT.toString()) {
        console.log("购买的是 Wrapped SOL，将在同一笔交易中 unwrap");

        // 关闭买家的 wSOL 接收账户以获得 SOL
        transaction.add(
          createCloseAccountInstruction(
            buyerSellTokenAccount, // 买家接收的 wSOL token 账户
            publicKey, // 接收 SOL 的账户
            publicKey, // owner
            [],
            TOKEN_PROGRAM_ID
          )
        );

        console.log("添加了 unwrap 指令，将购买到的 wSOL 转为 SOL");
      }

      // 注意：不要关闭用于支付的 wSOL 账户 (buyerBuyTokenAccount)
      // 因为用户可能还有其他 SOL 卖单需要这个账户

      console.log("交易指令数:", transaction.instructions.length);

      // 打印每个指令的详情
      transaction.instructions.forEach((ix, index) => {
        console.log(`指令 ${index}:`, {
          programId: ix.programId.toBase58(),
          keys: ix.keys.map(k => ({
            pubkey: k.pubkey.toBase58().slice(0, 8) + '...',
            isSigner: k.isSigner,
            isWritable: k.isWritable
          })),
          dataLength: ix.data.length
        });
      });

      // 设置交易的 blockhash 和 feePayer
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // 发送交易
      console.log("发送交易...");
      console.log("交易详情:", {
        feePayer: publicKey.toBase58(),
        instructions: transaction.instructions.length,
        blockhash: blockhash.slice(0, 8) + '...'
      });

      const signature = await sendAndConfirmTransaction(provider, transaction);
      console.log("购买成功，交易签名:", signature);

      // 使用正确的 decimals 计算显示数量（变量已在前面定义）
      const displayAmount = buyAmount / Math.pow(10, sellDecimals);
      const totalPrice = totalPriceInSmallestUnit / Math.pow(10, buyDecimals);

      showTransactionSuccess(signature, "购买成功!", (
        <div className="text-xs text-gray-400">
          购买数量: {displayAmount.toFixed(4)}, 总价: {totalPrice.toFixed(6)}
        </div>
      ));

      return true;
    } catch (error: any) {
      logTransactionError(error, "Purchase");
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
      });

      // 特殊的购买相关错误处理
      let errorMessage = parseTransactionError(error);
      if (error.message?.includes("insufficient") || error.message?.includes("0x1")) {
        errorMessage = `${buyTokenName} 余额不足`;
      } else if (error.message?.includes("InsufficientStock") || error.message?.includes("0x1772")) {
        errorMessage = "库存不足";
      } else if (error.message?.includes("listingNotActive") || error.message?.includes("0x1770")) {
        errorMessage = "卖单不活跃或已失效";
      }

      toast.error(`购买失败: ${errorMessage}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, [publicKey, wallet, connection]);

  return {
    purchaseToken,
    loading
  };
}