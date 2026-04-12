// @ts-nocheck
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { message } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        intent: 'conversational',
        parameters: {},
        reply: "My API key isn't configured yet. Please set the GEMINI_API_KEY environment variable."
      }), { status: 200 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const schema = {
      type: SchemaType.OBJECT,
      properties: {
        intent: {
          type: SchemaType.STRING,
          enum: [
            "check_balance", "transfer_token", "swap_token", "create_token", 
            "stake_hbar", "unstake_hbar", "wrap_hbar", "airdrop_tokens", 
            "mint_nft", "get_market_data", "conversational"
          ],
          description: "The core intent detected from the user's message."
        },
        parameters: {
          type: SchemaType.OBJECT,
          description: "An object containing the extracted variables for the intent.",
          properties: {
             amount: { type: SchemaType.STRING },
             destination: { type: SchemaType.STRING },
             tokenIn: { type: SchemaType.STRING },
             tokenOut: { type: SchemaType.STRING },
             asset: { type: SchemaType.STRING }
          }
        },
        reply: {
          type: SchemaType.STRING,
          description: "A friendly, conversational, and helpful response text (Gemini-style)."
        }
      },
      required: ["intent", "parameters", "reply"]
    };

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema as any,
      },
      systemInstruction: `You are 'Hashpilot', a helpful, friendly, and highly capable AI assistant for the Hedera network. 
      Your tone is conversational, professional, and clear—just like Google Gemini. 
      You should respond naturally to greetings, explain concepts clearly, and guide users through Web3 interactions.

      When a user asks to perform a transaction (like sending HBAR, swapping tokens, staking, etc.):
      1. Map the request to a valid intent and extract parameters.
      2. Pay close attention to the destination address. Hedera users often use the format '0.0.xxxxx'. You MUST extract this exactly as provided. If they provide an EVM '0x' address, extract that instead.
      3. In the 'reply' field, provide a natural, encouraging confirmation (e.g., "Sure! I've prepared that HBAR transfer for you. Please check the details in the preview below and confirm in your wallet.")

      Avoid all technical prefixes. Just talk like a human expert.`
    });

    const result = await model.generateContent(message);
    const responseText = result.response.text();
    const jsonOutput = JSON.parse(responseText);

    return new Response(JSON.stringify(jsonOutput), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Gemini API Error:', errMsg);
    return new Response(JSON.stringify({ 
      intent: 'conversational',
      parameters: {},
      reply: "I'm having a little trouble connecting right now. Please try again in a moment!"
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
