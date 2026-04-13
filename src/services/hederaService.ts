export const resolveHederaAddress = async (evmAddress: string): Promise<string> => {
  if (!evmAddress || !evmAddress.startsWith('0x')) return evmAddress;

  try {
    const response = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/accounts/${evmAddress}`);
    if (!response.ok) return evmAddress;
    
    const data = await response.json();
    return data.account || evmAddress;
  } catch (error) {
    console.error('Error resolving Hedera address:', error);
    return evmAddress;
  }
};

export const getHederaBalance = async (address: string): Promise<{ hbar: string; formattedTokens: string[] }> => {
  try {
    const response = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/balances?account.id=${address}`);
    if (!response.ok) throw new Error('Could not fetch balance');

    const data = await response.json();
    if (!data.balances || data.balances.length === 0) {
      return { hbar: '0.00', formattedTokens: [] };
    }
    
    const accountBalance = data.balances[0];
    const hbarBalance = (accountBalance.balance / 100_000_000).toFixed(2);
    
    const tokenBalances = accountBalance.tokens || [];
    
    // Resolve metadata (symbol/decimals) for each token in parallel
    const formattedTokens = await Promise.all(tokenBalances.map(async (t: any) => {
      try {
        const tMetaRes = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/tokens/${t.token_id}`);
        if (!tMetaRes.ok) return `${t.balance} (Unknown Token ${t.token_id})`;
        
        const tMeta = await tMetaRes.json();
        const decimals = parseInt(tMeta.decimals) || 0;
        const symbol = tMeta.symbol || '???';
        const humanBalance = (t.balance / Math.pow(10, decimals)).toFixed(2);
        
        return `${humanBalance} ${symbol}`;
      } catch {
        return `${t.balance} (ID: ${t.token_id})`;
      }
    }));
    
    return {
      hbar: hbarBalance,
      formattedTokens
    };
  } catch (error) {
    console.error('Error fetching Hedera balance:', error);
    throw error;
  }
};
