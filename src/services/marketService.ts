const SAUCERSWAP_API = 'https://api.saucerswap.finance/tokens';

export interface TokenMarketData {
  symbol: string;
  name: string;
  priceUsd: number;
  volume24hUsd: number;
  liquidityUsd: number;
  tokenAddress: string;
}

export const getTopTokensByVolume = async (limit: number = 10): Promise<TokenMarketData[]> => {
  try {
    const response = await fetch(SAUCERSWAP_API);
    if (!response.ok) throw new Error('Failed to fetch SaucerSwap tokens');
    
    const tokens: any[] = await response.json();
    
    return tokens
      .map(t => ({
        symbol: t.symbol,
        name: t.name,
        priceUsd: parseFloat(t.priceUsd) || 0,
        volume24hUsd: parseFloat(t.volume24hUsd) || 0,
        liquidityUsd: parseFloat(t.liquidity) || 0,
        tokenAddress: t.address
      }))
      .sort((a, b) => b.volume24hUsd - a.volume24hUsd)
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching market data:', error);
    return [];
  }
};

export const getTokenPrice = async (symbol: string): Promise<TokenMarketData | null> => {
  try {
    const response = await fetch(SAUCERSWAP_API);
    if (!response.ok) throw new Error('Failed to fetch SaucerSwap tokens');
    
    const tokens: any[] = await response.json();
    const token = tokens.find(t => t.symbol.toUpperCase() === symbol.toUpperCase());
    
    if (!token) return null;
    
    return {
      symbol: token.symbol,
      name: token.name,
      priceUsd: parseFloat(token.priceUsd) || 0,
      volume24hUsd: parseFloat(token.volume24hUsd) || 0,
      liquidityUsd: parseFloat(token.liquidity) || 0,
      tokenAddress: token.address
    };
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return null;
  }
};
