export interface TreasuryPayload {
  intent: string;
  tokenSymbol: 'HBAR' | 'USDC' | 'SAUCE';
  amount: string;
  targetAddress: string;
  isFiatDenominated: boolean;
  fiatAmountUsd?: string;
}

export interface TreasuryResult {
  status: 'SUCCESS' | 'FAILED';
  transactionId: string;
  explorerUrl: string;
  amount: string;
  fiatValueUsd: string;
  tokenSymbol: string;
  recipient: string;
  error?: string;
}

export async function executeTreasuryTransaction(payload: TreasuryPayload): Promise<TreasuryResult> {
  const response = await fetch('/api/execute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}
