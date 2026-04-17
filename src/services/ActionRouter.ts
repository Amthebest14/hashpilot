import { parseEther } from 'viem';
import { prepareSaucerSwap, prepareApproval } from './swapService';

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
          
          // STEP 1: Handle Approval if tokenIn is NOT HBAR
          if (tin !== 'HBAR') {
             console.log(`[ROUTER] Step 1: Requesting approval for ${amount} ${tin}`);
             const approveTx = await prepareApproval(tin, amount);
             const approveHash = await sendTransactionAsync({
                to: approveTx.to,
                data: approveTx.data,
                value: 0n,
                gas: 500000n, // Approval usually cheap
             });
             console.log(`[ROUTER] Approval Signed. Hash: ${approveHash}. Waiting to trigger swap...`);
             // In a perfect world we'd wait for receipt, but on Hedera/Testnet 
             // we'll proceed immediately for UX speed, or we could add a delay.
          }

          // STEP 2: Execute Swap
          console.log(`[ROUTER] Step 2: Executing ${tin} -> ${tokenOut.toUpperCase()} swap`);
          const swapTx = await prepareSaucerSwap(tokenIn, tokenOut, amount, address!);
          return await sendTransactionAsync({
            to: swapTx.to,
            data: swapTx.data,
            value: swapTx.value,
            gas: 3000000n,
          });
        };
      }

      default:
        return null;
    }
  };

  return { getExecutableFunction };
}
