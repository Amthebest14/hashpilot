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

export const getHederaBalance = async (address: string): Promise<{ hbar: string; tokens: any[] }> => {
  try {
    const response = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/balances?account.id=${address}`);
    if (!response.ok) throw new Error('Could not fetch balance');

    const data = await response.json();
    const accountBalance = data.balances[0];
    
    // Convert tinybars to HBAR
    const hbarBalance = (accountBalance.balance / 100_000_000).toFixed(2);
    
    return {
      hbar: hbarBalance,
      tokens: accountBalance.tokens || []
    };
  } catch (error) {
    console.error('Error fetching Hedera balance:', error);
    throw error;
  }
};
