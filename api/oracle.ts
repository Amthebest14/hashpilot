export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Failsafe / Hardcoded Fallbacks
    let hbarPrice = 0.086; 
    let usdcPrice = 1.00;
    let saucePrice = 0.020;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second strict timeout

      const saucerswapRes = await fetch('https://api.saucerswap.finance/tokens', {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (saucerswapRes.ok) {
        const tokens = await saucerswapRes.json();
        if (Array.isArray(tokens)) {
          const hbarToken = tokens.find(t => t.symbol === 'HBAR');
          const usdcToken = tokens.find(t => t.symbol === 'USDC');
          const sauceToken = tokens.find(t => t.symbol === 'SAUCE');

          if (hbarToken && hbarToken.priceUsd) hbarPrice = parseFloat(hbarToken.priceUsd);
          if (usdcToken && usdcToken.priceUsd) usdcPrice = parseFloat(usdcToken.priceUsd);
          if (sauceToken && sauceToken.priceUsd) saucePrice = parseFloat(sauceToken.priceUsd);
        }
      }
    } catch (e) {
      console.warn('[ORACLE] SaucerSwap fetch failed or timed out. Engaging Failsafe.', e);
      // Fallbacks remain untouched
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
