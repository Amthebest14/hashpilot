import { useSendTransaction, useAccount } from 'wagmi';
import { parseEther } from 'viem';
import type { AIResponse } from './aiService';
import { getHederaBalance, resolveHederaAddress } from './hederaService';

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
          // Resolve current address to native ID for the balance lookup if needed
          // Mirror Node API handles EVM addresses too, but resolve for safety
          const nativeId = await resolveHederaAddress(address!);
          const balance = await getHederaBalance(nativeId);
          return `[SYS_MSG] Current Balance: ${balance.hbar} HBAR`;
        } catch (err: any) {
          console.error('[ACTION_ROUTER] Balance check failed:', err);
          throw new Error('I could not retrieve your balance at this moment.');
        }
      }

      case 'transfer_token': {
        const { amount, destination } = parameters;
        
        if (!amount) throw new Error('Missing amount for transfer.');
        if (!destination) throw new Error('I couldn\'t identify where you want to send the tokens. Please provide an account ID or address.');

        try {
          const toAddress = await ensureEvmAddress(destination);
          
          const txHash = await sendTransactionAsync({
            to: toAddress,
            value: parseEther(amount),
          });
          
          return `[TX_HASH] ${txHash}`;
        } catch (err: any) {
          // Surface specific "User Rejected" messages
          if (err.message?.includes('User rejected') || err.name === 'UserRejectedRequestError') {
             throw new Error('Transaction rejected by user.');
          }
          console.error('[ACTION_ROUTER] Transaction failed:', err);
          throw new Error(err.message || 'Transaction failed.');
        }
      }
      
      default:
        return null;
    }
  };

  return { handleIntent };
}
