import { useSendTransaction, useAccount } from 'wagmi';
import { parseEther } from 'viem';
import type { AIResponse } from './aiService';
import { getHederaBalance, resolveHederaAddress } from './hederaService';
import { executeSaucerSwap } from './swapService';

// Helper to convert 0.0.x to 0x if needed for viem validation
const ensureEvmAddress = async (address: string): Promise<`0x${string}`> => {
  if (address.startsWith('0x')) return address as `0x${string}`;
  
  try {
    const response = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/accounts/${address}`);
    if (!response.ok) throw new Error('Could not resolve Hedera Account ID');
    
    const data = await response.json();
    return data.evm_address as `0x${string}`;
  } catch (error) {
    console.error('Error resolving Account ID to EVM:', error);
    throw new Error(`Invalid destination address: ${address}`);
  }
};

export function useActionRouter() {
  const { sendTransactionAsync } = useSendTransaction();
  const { isConnected, address } = useAccount();

  const handleIntent = async (aiResponse: AIResponse): Promise<string | null> => {
    if (!isConnected) {
      throw new Error('Wallet not connected. Please connect your wallet first.');
    }

    const { intent, parameters } = aiResponse;

    switch (intent) {
      case 'check_balance': {
        try {
          const target = parameters.targetAddress || address!;
          const nativeId = await resolveHederaAddress(target);
          const balance = await getHederaBalance(nativeId);
          return `[SYS_MSG] Balance for ${nativeId}: ${balance.hbar} HBAR`;
        } catch (err: any) {
          console.error('[ACTION_ROUTER] Balance check failed:', err);
          throw new Error('I could not retrieve the balance at this moment.');
        }
      }

      case 'transfer_token': {
        const { amount, destination } = parameters;
        
        if (!amount) throw new Error('Missing amount for transfer.');
        if (!destination) throw new Error('I couldn\'t identify where you want to send the tokens.');

        try {
          const toAddress = await ensureEvmAddress(destination);
          
          const txHash = await sendTransactionAsync({
            to: toAddress,
            value: parseEther(amount),
          });
          
          return `[TX_HASH] ${txHash}`;
        } catch (err: any) {
          if (err.message?.includes('User rejected') || err.name === 'UserRejectedRequestError') {
             throw new Error('Transaction rejected by user.');
          }
          throw err;
        }
      }

      case 'swap_token': {
        const { amount, tokenIn, tokenOut } = parameters;

        if (!amount || !tokenIn || !tokenOut) {
          throw new Error('Missing details for the swap. I need the amount and both tokens.');
        }

        try {
          const txHash = await executeSaucerSwap(tokenIn, tokenOut, amount, address!);
          return `[TX_HASH] ${txHash}`;
        } catch (err: any) {
          if (err.message?.includes('User rejected') || err.name === 'UserRejectedRequestError') {
            throw new Error('Transaction rejected by user.');
          }
          console.error('[ACTION_ROUTER] Swap failed:', err);
          throw new Error(err.message || 'Swap execution failed.');
        }
      }
      
      default:
        return null;
    }
  };

  return { handleIntent };
}
