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
