import { useAccount } from 'wagmi';
import { executeTreasuryTransaction } from './treasury';
import type { TreasuryPayload } from './treasury';

export function useActionRouter() {
  const { isConnected } = useAccount();

  const getExecutableFunction = (intent: string, parameters: any): (() => Promise<any>) | null => {
    // strictly enforce connection for identity / scoring / tracking
    if (!isConnected) {
      return async () => { 
        throw new Error('Please connect your HashPack or WalletConnect wallet to track score and execute.'); 
      };
    }

    switch (intent) {
      case 'pay_service':
      case 'transfer_token': {
        return async () => {
          // Extract variables mapped by api/intent.ts
          const { amount, targetAddress, tokenSymbol, isFiatDenominated, fiatAmountUsd } = parameters;
          
          const recipient = targetAddress || parameters.destination;
          const symbol = (tokenSymbol || 'HBAR').toUpperCase() as 'HBAR' | 'USDC' | 'SAUCE';

          if (!recipient) {
            throw new Error('No destination address found. Please retry and include the recipient\'s Hedera account ID (e.g. "send 1 HBAR to 0.0.12345").');
          }

          if (isFiatDenominated) {
            if (!fiatAmountUsd) {
              throw new Error('Fiat payment requested but USD amount is missing.');
            }
          } else {
            if (!amount) {
              throw new Error('Transaction amount is missing.');
            }
          }

          const payload: TreasuryPayload = {
            intent,
            tokenSymbol: symbol,
            amount: amount || '0',
            targetAddress: recipient,
            isFiatDenominated: !!isFiatDenominated,
            fiatAmountUsd: fiatAmountUsd || undefined
          };

          console.log('[ActionRouter] Routing request to server-side treasury:', payload);
          return await executeTreasuryTransaction(payload);
        };
      }

      case 'swap_token': {
        return async () => {
          throw new Error('Token swaps are currently disabled in the Server-Side Treasury architecture.');
        };
      }

      case 'wrap_hbar': {
        return async () => {
          throw new Error('HBAR wrapping is currently disabled in the Server-Side Treasury architecture.');
        };
      }

      default:
        return null;
    }
  };

  return { getExecutableFunction };
}
