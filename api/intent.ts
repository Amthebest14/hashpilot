import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

// Optional: Enable Edge runtime for faster execution on Vercel
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
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not set' }), { status: 500 });
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
          description: "An object containing the extracted variables for the intent (e.g., amount, destination, tokenIn, tokenOut).",
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
          description: "A human-readable string acknowledging the action."
        }
      },
      required: ["intent", "parameters", "reply"]
    };

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
      systemInstruction: `You are 'Hashpilot', a terminal-based AI intent router for the Hedera network. 
      Your job is to read user input and map it to exactly one of the supported intents.
      If the user is just chatting or asking a general question, the intent is 'conversational'.
      You must always return valid JSON fulfilling the schema.
      Keep the 'reply' short, robotic, and terminal-like (e.g., '[SYSTEM_LOG] Parsing transfer protocol...').`
    });

    const result = await model.generateContent(message);
    const responseText = result.response.text();
    
    // Parse to ensure it matches format (though the model config forces it)
    const jsonOutput = JSON.parse(responseText);

    return new Response(JSON.stringify(jsonOutput), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { status: 500 });
  }
}
