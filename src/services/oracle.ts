export interface Prices {
  HBAR: number;
  USDC: number;
  SAUCE: number;
}

export interface OracleResponse {
  prices: Prices;
  timestamp: number;
}

export async function fetchOraclePrices(): Promise<Prices> {
  const response = await fetch('/api/oracle');
  if (!response.ok) {
    throw new Error(`Failed to fetch oracle prices: ${response.status}`);
  }
  const data: OracleResponse = await response.json();
  return data.prices;
}
