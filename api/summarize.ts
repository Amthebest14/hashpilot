import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { data, query } = await req.json();

    if (!data || !query) {
      return new Response(JSON.stringify({ error: 'Data and query are required' }), { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ summary: "Market data is available, but the summarization engine isn't configured." }), { status: 200 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are 'Hashpilot', an expert DeFi copilot for Hedera. 
    A user asked: "${query}". 
    
    Here is the live market data from SaucerSwap (Mainnet):
    ${JSON.stringify(data, null, 2)}
    
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
