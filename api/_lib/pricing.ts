export async function fetchLivePrices() {
  let hbarPrice = 0.086;
  let usdcPrice = 1.00;
  let saucePrice = 0.020;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 second strict timeout

    const cgRes = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=hedera-hashgraph,usd-coin,saucerswap&vs_currencies=usd',
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);

    if (cgRes.ok) {
      const data = await cgRes.json();
      if (data['hedera-hashgraph']?.usd) hbarPrice = data['hedera-hashgraph'].usd;
      if (data['usd-coin']?.usd) usdcPrice = data['usd-coin'].usd;
      if (data['saucerswap']?.usd) saucePrice = data['saucerswap'].usd;
    }
  } catch (e) {
    console.warn('[PRICING] CoinGecko fetch failed or timed out. Engaging Failsafe.', e);
    // Fallbacks remain untouched
  }

  return {
    HBAR: hbarPrice,
    USDC: usdcPrice,
    SAUCE: saucePrice
  };
}
