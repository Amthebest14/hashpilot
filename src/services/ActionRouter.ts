import { useSendTransaction, useAccount } from 'wagmi';
import { parseEther } from 'viem';
import { prepareSaucerSwap } from './swapService';

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

  const getExecutableFunction = (intent: string, parameters: any): (() => Promise<string>) | null => {
    if (!isConnected) {
      return async () => { throw new Error('Wallet not connected.'); };
    }

    switch (intent) {
      case 'transfer_token': {
        return async () => {
          const { amount, destination } = parameters;
          if (!amount || !destination) throw new Error('Missing transfer details.');
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
