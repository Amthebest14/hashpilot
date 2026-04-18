import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { data: clientData, query } = await req.json();

    if (!query) {
      return new Response(JSON.stringify({ error: 'Query is required' }), { status: 400 });
    }

    // Server-side fetch from CoinGecko to bypass CORS and Cloudflare bot protection
    let marketData = clientData;
    if (!marketData || Object.keys(marketData).length === 0) {
      try {
        const cgRes = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=hedera-ecosystem&order=volume_desc&per_page=10&page=1&sparkline=false');
        if (cgRes.ok) {
          const tokens = await cgRes.json();
          marketData = tokens.map((t: any) => ({
            symbol: t.symbol,
            name: t.name,
            current_price: t.current_price,
            price_change_percentage_24h: t.price_change_percentage_24h,
            total_volume: t.total_volume
          }));
        } else {
           console.error('CoinGecko API returned status:', cgRes.status);
        }
      } catch (err) {
        console.error('CoinGecko Fetch Error:', err);
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ summary: "Market data is available, but the summarization engine isn't configured." }), { status: 200 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are 'Hashpilot', an expert DeFi copilot for Hedera. 
    A user asked: "${query}". 
    
    Here is the live market data from CoinGecko (Hedera Ecosystem Top 10 by Volume):
    ${JSON.stringify(marketData, null, 2)}
    
    Please provide a very natural, concise, and conversational summary for the user. 
    Highlight the most relevant parts of the data (like prices or top volume) without being too technical.
    Keep it friendly and helpful.`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    return new Response(JSON.stringify({ summary }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Summarization Error:', error);
    return new Response(JSON.stringify({ summary: "I'm having trouble summarizing the market data right now, but things look active!" }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
