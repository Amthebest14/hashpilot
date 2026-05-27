export interface TreasuryPayload {
  intent: string;
  intentType?: string;
  tokenSymbol: 'HBAR' | 'USDC' | 'SAUCE';
  amount: string;
  targetAddress?: string;
  isFiatDenominated?: boolean;
  fiatAmountUsd?: string;
  actionName?: string;
  asset?: string;
  codeSnippet?: string;
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
  toolOutput?: string;
}

// Hard client-side timeout — if the backend doesn't respond in 35s, reject cleanly
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${ms / 1000}s. The Hedera network may be congested — please retry.`)),
        ms
      )
    ),
  ]);
}

export async function executeTreasuryTransaction(payload: TreasuryPayload): Promise<TreasuryResult> {
  const fetchPromise = fetch('/api/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(async (response) => {
    // Always parse the body — even on error status, we want the error message
    const data: any = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));

    if (!response.ok) {
      throw new Error(data.error || `Server returned ${response.status}`);
    }

    if (data.status === 'FAILED' || data.error) {
      throw new Error(data.error || 'Transaction failed on Hedera network');
    }

    return data as TreasuryResult;
  });

  // 60 second hard deadline — Hedera network + LLM Generation takes time
  return withTimeout(fetchPromise, 60000, 'Treasury execution');
}
