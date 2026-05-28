import { fetchLivePrices } from './_lib/pricing.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const prices = await fetchLivePrices();

    res.setHeader('Cache-Control', 'public, max-age=10');
    return res.status(200).json({ prices, timestamp: Date.now() });

  } catch (error: any) {
    return res.status(500).json({ error: error.message || String(error) });
  }
}
