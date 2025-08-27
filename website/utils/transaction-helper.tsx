import { AnchorProvider } from "@coral-xyz/anchor";
import { Connection, Transaction } from "@solana/web3.js";
import { toast } from "sonner";
import React from "react";

export interface SendTransactionOptions {
  skipPreflight?: boolean;
  commitment?: 'processed' | 'confirmed' | 'finalized';
  maxRetries?: number;
  preflightCommitment?: 'processed' | 'confirmed' | 'finalized';
}

/**
 * 发送交易并处理超时情况
 * 当使用公共 RPC 时，可能会遇到确认超时但交易实际成功的情况
 */
export async function sendAndConfirmTransaction(
  provider: AnchorProvider,
  transaction: Transaction,
  signers: any[] = [],
  options: SendTransactionOptions = {}
): Promise<string> {
  const defaultOptions: SendTransactionOptions = {
    skipPreflight: false,
    commitment: 'confirmed',
    maxRetries: 5,
    preflightCommitment: 'confirmed',
    ...options
  };

  let signature: string;
  
  try {
    signature = await provider.sendAndConfirm(transaction, signers, defaultOptions);
    console.log("Transaction confirmed:", signature);
    return signature;
  } catch (error: any) {
    // 如果是超时错误，尝试获取交易签名并检查状态
    if (error.message?.includes('was not confirmed') || 
        error.message?.includes('timeout') ||
        error.message?.includes('Transaction was not confirmed')) {
      
      console.log("Transaction confirmation timeout, extracting signature...");
      
      // 从错误信息中提取签名
      const sigMatch = error.message.match(/signature\s+(\w+)/i) || 
                      error.message.match(/(\w{87,88})/);
      
      if (sigMatch) {
        signature = sigMatch[1];
        console.log("Extracted transaction signature:", signature);
        
        // 等待一小段时间后检查交易状态
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          const status = await provider.connection.getSignatureStatus(signature);
          
          if (status?.value?.confirmationStatus === 'confirmed' || 
              status?.value?.confirmationStatus === 'finalized') {
            console.log("Transaction confirmed (via status check)");
            return signature;
          } else if (status?.value?.err) {
            throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
          } else {
            // 交易可能还在处理，但我们假设成功
            console.log("Transaction status unknown, assuming success");
            return signature;
          }
        } catch (statusError) {
          console.log("Unable to check transaction status, assuming success:", statusError);
          return signature;
        }
      }
    }
    
    // 如果不是超时错误，直接抛出
    throw error;
  }
}

/**
 * 显示交易成功的 Toast，包含 Solscan 链接
 */
export function showTransactionSuccess(
  signature: string,
  message: string = "交易成功!",
  additionalInfo?: React.ReactNode
) {
  toast.success(message, {
    description: (
      <div className="space-y-1">
        <a 
          href={`https://solscan.io/tx/${signature}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline text-blue-400"
        >
          交易ID: {signature.slice(0, 8)}...{signature.slice(-8)}
        </a>
        {additionalInfo}
        <div className="text-xs text-gray-400">
          点击交易ID在 Solscan 查看详情
        </div>
      </div>
    ) as any,
  });
}

/**
 * 解析交易错误信息
 */
export function parseTransactionError(error: any): string {
  if (error instanceof Error) {
    if (error.message.includes("insufficient funds") || error.message.includes("0x1")) {
      return "余额不足";
    } else if (error.message.includes("User rejected")) {
      return "用户取消了交易";
    } else if (error.message.includes("InsufficientStock") || error.message.includes("0x1772")) {
      return "库存不足";
    } else if (error.message.includes("listingNotActive") || error.message.includes("0x1770")) {
      return "卖单不活跃或已失效";
    } else if (error.message.includes("custom program error")) {
      const match = error.message.match(/custom program error: (0x[a-fA-F0-9]+)/);
      if (match) {
        return `程序错误: ${match[1]}`;
      }
    } else if (error.message.includes("simulation")) {
      return "交易模拟失败，请检查余额和网络状态";
    }
    
    return error.message.substring(0, 100);
  }
  
  return "交易失败";
}

/**
 * 打印交易日志（用于调试）
 */
export function logTransactionError(error: any, context: string) {
  console.error(`${context} failed:`, error);
  
  if (error.logs) {
    console.error("Transaction logs:");
    error.logs.forEach((log: string, index: number) => {
      console.error(`  [${index}] ${log}`);
    });
  }
  
  console.error("Error details:", {
    message: error?.message,
    logs: error?.logs,
    error: error?.error,
    errorCode: error?.error?.errorCode,
    errorMessage: error?.error?.errorMessage,
  });
}