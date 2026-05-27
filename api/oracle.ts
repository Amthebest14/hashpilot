export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const HBAR_FEED = 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43';
    const USDC_FEED = 'eaa020c61cc479712813461ce153894b96a6c00b21ed0cfc2798d1f9a9e9c94a';

    // 1. Fetch HBAR and USDC from Pyth Network Hermes API
    let hbarPrice = 0.06; // sensible defaults/fallbacks
    let usdcPrice = 1.00;
    let saucePrice = 0.015;

    try {
      const pythUrl = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${HBAR_FEED}&ids[]=${USDC_FEED}`;
      const pythRes = await fetch(pythUrl);
      if (pythRes.ok) {
        const data = await pythRes.json();
        if (data.parsed && Array.isArray(data.parsed)) {
          for (const item of data.parsed) {
            const priceVal = parseFloat(item.price.price);
            const expo = item.price.expo;
            const finalPrice = priceVal * Math.pow(10, expo);

            if (item.id === HBAR_FEED) {
              hbarPrice = finalPrice;
            } else if (item.id === USDC_FEED) {
              usdcPrice = finalPrice;
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to fetch Pyth oracle prices:', e);
    }

    // 2. Fetch SAUCE price from SaucerSwap REST API
    try {
      const saucerswapRes = await fetch('https://api.saucerswap.finance/tokens');
      if (saucerswapRes.ok) {
        const tokens = await saucerswapRes.json();
        if (Array.isArray(tokens)) {
          // Find SAUCE token price
          const sauceToken = tokens.find(t => t.symbol === 'SAUCE');
          if (sauceToken && sauceToken.priceUsd) {
            saucePrice = parseFloat(sauceToken.priceUsd);
          }
        }
      }
    } catch (e) {
      console.error('Failed to fetch SAUCE price from SaucerSwap REST API:', e);
    }

    const prices = {
      HBAR: hbarPrice,
      USDC: usdcPrice,
      SAUCE: saucePrice
    };

    res.setHeader('Cache-Control', 'public, max-age=10');
    return res.status(200).json({ prices, timestamp: Date.now() });

  } catch (error: any) {
    return res.status(500).json({ error: error.message || String(error) });
  }
}
