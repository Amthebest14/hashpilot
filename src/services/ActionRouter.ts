import { useSendTransaction, useAccount } from 'wagmi';
import { parseEther } from 'viem';
import type { AIResponse } from './aiService';

export function useActionRouter() {
  const { sendTransactionAsync } = useSendTransaction();
  const { isConnected } = useAccount();

  const handleIntent = async (aiResponse: AIResponse): Promise<string | null> => {
    if (!isConnected) {
      throw new Error('Wallet not connected. Please connect your wallet first.');
    }

    const { intent, parameters } = aiResponse;

    switch (intent) {
      case 'transfer_token': {
        const { amount, destination } = parameters;
        
        if (!amount || !destination) {
          throw new Error('Missing amount or destination for transfer.');
        }

        console.log(`[ACTION_ROUTER] Triggering transfer: ${amount} to ${destination}`);
        
        try {
          // Sending transaction. For a basic test, we assume native token (HBAR on Hedera / ETH on mainnet)
          // `parseEther` assumes 18 decimals, but Hedera HBAR has 8 decimals.
          // In wagmi/viem with custom chain, you usually use parseUnits(amount, decimals)
          // For this proof of concept, we use a raw transaction request.
          // Note for true Hedera integration, amounts might need 8 zeros, but standard EVM viem uses ether scale for generic tests.
          const txHash = await sendTransactionAsync({
            to: destination as `0x${string}`,
            value: parseEther(amount),
          });
          
          return txHash;
        } catch (err: any) {
          console.error('[ACTION_ROUTER] Transaction failed or rejected:', err);
          throw new Error(err.message || 'Transaction dropped or rejected by user.');
        }
      }
      
      // Fallbacks for other mock intents
      case 'check_balance':
        console.log('[ACTION_ROUTER] Action check_balance triggered locally.');
        return null;
        
      default:
        console.log(`[ACTION_ROUTER] Intent ${intent} not fully mapped to smart contract execution yet.`);
        return null;
    }
  };

  return { handleIntent };
}
