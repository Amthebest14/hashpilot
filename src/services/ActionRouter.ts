import { useSendTransaction, useAccount, usePublicClient } from 'wagmi';
import { parseEther } from 'viem';
import { 
  prepareSaucerSwap, 
  prepareApproval, 
  TESTNET_TOKENS, 
  SAUCERSWAP_V1_ROUTER, 
  ERC20_ABI 
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
          const tokenInAddress = TESTNET_TOKENS[tin] as `0x${string}`;
          
          const tinDecimals = tin === 'SAUCE' ? 6 : tin === 'HBAR' ? 8 : 18;
          const rawAmountIn = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, tinDecimals)));

          // STEP 1: Smart Allowance Check (Only for Tokens -> HBAR)
          if (tin !== 'HBAR' && publicClient && address) {
             console.log(`[ROUTER] Checking allowance for ${tin}...`);
             const currentAllowance = await publicClient.readContract({
                address: tokenInAddress,
                abi: ERC20_ABI,
                functionName: 'allowance',
                args: [address, SAUCERSWAP_V1_ROUTER as `0x${string}`],
             }) as bigint;

             if (currentAllowance < rawAmountIn) {
                console.log(`[ROUTER] Insufficient allowance (${currentAllowance} < ${rawAmountIn}). Requesting Infinite Approval...`);
                // Use 'max' for Infinite Approval (UX optimization)
                const approveTx = await prepareApproval(tin, 'max');
                
                // Explicitly built config to avoid 'value' back-filling
                const approveConfig: any = {
                   to: approveTx.to,
                   data: approveTx.data,
                   gas: 3000000n, // Override gas estimation
                };
                delete approveConfig.value;

                const approveHash = await sendTransactionAsync(approveConfig);
                console.log(`[ROUTER] Approval sent: ${approveHash}. Waiting for Hedera consensus...`);
                
                // WAIT FOR RECEIPT: Crucial to avoid nonce collisions/race conditions
                await publicClient.waitForTransactionReceipt({ hash: approveHash });
                console.log(`[ROUTER] Consensus reached. Proceeding to swap.`);
             } else {
                console.log(`[ROUTER] Sufficient allowance detected (${currentAllowance}). Skipping approve step.`);
             }
          }

          // STEP 2: Execute Swap (Strict Unification)
          console.log(`[ROUTER] Finalizing ${tin} -> ${tokenOut.toUpperCase()} swap execution...`);
          const swapTx = await prepareSaucerSwap(tokenIn, tokenOut, amount, address!);
          
          if (tin === 'HBAR') {
             // Path A: Payable (HBAR -> Token)
             return await sendTransactionAsync({
               to: swapTx.to,
               data: swapTx.data,
               value: swapTx.value, // parseEther 18-decimal weibars
               gas: 3000000n,
             });
          } else {
             // Path B: Non-Payable (Token -> HBAR)
             // We use a strictly clean object to prevent any Wagmi/Viem 'value' interpolation
             return await sendTransactionAsync({
               to: swapTx.to,
               data: swapTx.data,
               gas: 3000000n,
               // value key is surgically omitted to bypass HashPack panic
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
