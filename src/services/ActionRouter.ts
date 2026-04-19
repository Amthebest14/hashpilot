import { useSendTransaction, useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { parseEther, maxUint256 } from 'viem';
import { 
  prepareSaucerSwap, 
  prepareApproval, 
  TESTNET_TOKENS, 
  SAUCERSWAP_V1_ROUTER, 
  ERC20_ABI,
  SAUCERSWAP_V1_ABI
} from './swapService';

// Helper to convert 0.0.x to 0x if needed for viem validation
const ensureEvmAddress = async (address: string): Promise<`0x${string}`> => {
  if (address.startsWith('0x')) return address as `0x${string}`;
  
  try {
    const response = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/accounts/${address}`);
    if (!response.ok) {
      console.error(`[ROUTER] Mirror Node resolution failed for ${address}:`, response.status);
      throw new Error('Could not resolve Hedera Account ID');
    }
    
    const data = await response.json();
    console.log(`[ROUTER] Resolved ${address} to ${data.evm_address}`);
    return data.evm_address as `0x${string}`;
  } catch (error) {
    console.error('[ROUTER] Error resolving Account ID to EVM:', error);
    throw new Error(`Invalid destination address: ${address}`);
  }
};

export function useActionRouter() {
  const { sendTransactionAsync } = useSendTransaction();
  const { data: walletClient } = useWalletClient();
  const { isConnected, address } = useAccount();
  const publicClient = usePublicClient();

  const getExecutableFunction = (intent: string, parameters: any): (() => Promise<string>) | null => {
    if (!isConnected) {
      return async () => { throw new Error('Wallet not connected.'); };
    }

    switch (intent) {
      case 'transfer_token': {
        return async () => {
          const { amount, destination } = parameters;
          if (!amount || !destination) throw new Error('Missing transfer details.');
          console.log(`[ROUTER] Initiating transfer of ${amount} HBAR to ${destination}`);
          const toAddress = await ensureEvmAddress(destination);
          return await sendTransactionAsync({
            to: toAddress,
            value: parseEther(amount),
          });
        };
      }

      case 'swap_token': {
        return async () => {
          const { amount, tokenIn, tokenOut } = parameters;
          if (!amount || !tokenIn || !tokenOut) throw new Error('Missing swap details.');
          
          const tin = tokenIn.toUpperCase();
          const tout = tokenOut.toUpperCase();
          const tokenInAddress = TESTNET_TOKENS[tin] as `0x${string}`;
          const tokenOutAddress = TESTNET_TOKENS[tout] as `0x${string}`;
          
          const tinDecimals = tin === 'SAUCE' ? 6 : tin === 'HBAR' ? 8 : 18;
          const rawAmountIn = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, tinDecimals)));

          if (tin !== 'HBAR') {
             // --- MANUAL FOUNDER OVERRIDE: TOKEN -> HBAR (NON-PAYABLE) ---
             if (!walletClient || !publicClient || !address) throw new Error("Wallet/Public client not ready.");

             // 1. Check current allowance
             console.log(`[OVERRIDE] Checking allowance for ${tin}...`);
             const currentAllowance = await publicClient.readContract({
                address: tokenInAddress,
                abi: ERC20_ABI,
                functionName: 'allowance',
                args: [address, SAUCERSWAP_V1_ROUTER as `0x${string}`],
             }) as bigint;

             // 2. Smart Approval Flow
             if (currentAllowance < rawAmountIn) {
                console.log("[OVERRIDE] Approval required. Executing Infinite Approval...");
                
                // Using writeContract to guarantee 'value' key removal at protocol level
                const approveHash = await walletClient.writeContract({
                   address: tokenInAddress,
                   abi: ERC20_ABI,
                   functionName: 'approve',
                   args: [SAUCERSWAP_V1_ROUTER as `0x${string}`, maxUint256],
                   gas: 3000000n
                });

                console.log("[OVERRIDE] Waiting for Hedera consensus...");
                await publicClient.waitForTransactionReceipt({ hash: approveHash });
                
                // 🛡️ The Hedera RPC Buffer: Syncs nonce cache
                console.log("[OVERRIDE] Consensus reached. Buffering RPC state (2s)...");
                await new Promise(resolve => setTimeout(resolve, 2000)); 
             } else {
                console.log("[OVERRIDE] Sufficient allowance found. Skipping approval.");
             }

             // 3. Execute the Swap
             console.log(`[OVERRIDE] Executing ${tin} -> ${tout} Swap...`);
             
             // Recalculate common swap parameters
             const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);
             let path: `0x${string}`[] = [];
             if (tout === 'HBAR' && (tin === 'XSAUCE' || tin === 'USDC')) {
                const sauceToken = TESTNET_TOKENS['SAUCE'] as `0x${string}`;
                path = [tokenInAddress, sauceToken, TESTNET_TOKENS['HBAR'] as `0x${string}`];
             } else {
                path = [tokenInAddress, tokenOutAddress];
             }

             // WriteContract for native non-payable payload isolation
             return await walletClient.writeContract({
                address: SAUCERSWAP_V1_ROUTER as `0x${string}`,
                abi: SAUCERSWAP_V1_ABI,
                functionName: 'swapExactTokensForETH',
                args: [rawAmountIn, 0n, path, address, deadline],
                gas: 3000000n
             });

          } else {
             // Path A: Payable (HBAR -> TOKEN) - Remains Working Baseline
             console.log(`[ROUTER] Executing payable HBAR -> ${tout} swap...`);
             const swapTx = await prepareSaucerSwap(tokenIn, tokenOut, amount, address!);
             
             return await sendTransactionAsync({
               to: swapTx.to,
               data: swapTx.data,
               value: swapTx.value, // parseEther 18-decimal
               gas: 3000000n,
             });
          }
        };
      }

      default:
        return null;
    }
  };

  return { getExecutableFunction };
}
