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
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), { status: 400 });
    }

    let latestUserMessage = messages[messages.length - 1].content;
    const historyRaw = messages.slice(0, -1);
    
    // Strict Sanitizer: Remove empty, Map roles, Group Consecutive, Start with User
    const sanitizedHistory: any[] = [];
    
    for (const msg of historyRaw) {
      if (!msg.content || typeof msg.content !== 'string' || msg.content.trim() === '') {
        continue; // Rule: Skip empty text
      }
      
      const mappedRole = msg.role === 'ai' || msg.role === 'model' ? 'model' : 'user';
      
      // Rule 0: History must start with 'user'. Drop any leading 'model' messages.
      if (sanitizedHistory.length === 0 && mappedRole === 'model') {
        continue;
      }

      const lastEntry = sanitizedHistory[sanitizedHistory.length - 1];
      if (lastEntry && lastEntry.role === mappedRole) {
        // Ping-Pong: Conjoin consecutive messages of the same role.
        lastEntry.parts[0].text += `\n\n${msg.content}`;
      } else {
        sanitizedHistory.push({
          role: mappedRole,
          parts: [{ text: msg.content }]
        });
      }
    }

    // Rule: Ensure we don't end on a 'user' message before sendMessage()
    // If history ends on 'user', pop it and merge into the active prompt trigger.
    if (sanitizedHistory.length > 0) {
      const lastEntry = sanitizedHistory[sanitizedHistory.length - 1];
      if (lastEntry.role === 'user') {
         const popped = sanitizedHistory.pop();
         latestUserMessage = popped.parts[0].text + `\n\n` + latestUserMessage;
      }
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
            "mint_nft", "get_market_data", "analyze_wallet", "market_query", "cancel", "conversational"
          ],
          description: "The core intent detected from the user's message."
        },
        parameters: {
          type: SchemaType.OBJECT,
          description: "An object containing the extracted variables for the intent.",
          properties: {
             amount: { type: SchemaType.STRING },
             destination: { type: SchemaType.STRING },
             targetAddress: { type: SchemaType.STRING },
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

      When a user asks to perform an action:
      1. Map the request to a valid intent and extract parameters.
      2. For 'check_balance': If they mention a specific account (e.g. "What's the balance of 0.0.123?"), extract that into 'targetAddress'. Otherwise, leave it empty.
      3. For 'swap_token': Strictly extract 'tokenIn', 'tokenOut', and 'amount'.
         - IMPORTANT: When extracting 'tokenIn' and 'tokenOut', you must strictly use asset ticker symbols (e.g., HBAR, SAUCE, XSAUCE, USDC) and output them as UPPERCASE strings.
         - Do not extract or assume any other tokens.
      4. For 'transfer_token': Pay close attention to the destination address. Hedera users often use the format '0.0.xxxxx'. You MUST extract this exactly as provided. If they provide an EVM '0x' address, extract that instead.
      5. For 'analyze_wallet': If the user asks what is in their wallet, their balances, or asks for a portfolio analysis.
      6. For 'market_query': If the user asks for token prices, market updates, top tokens, or meme coins on Hedera.
      7. If the user asks to cancel, abort, or stop a pending transaction, or simply changes their mind and wants to clear the board, output the JSON intent literally as "cancel".
      8. In the 'reply' field, provide a natural, encouraging confirmation (e.g., "Sure! I've prepared that balance check for you.", "I've drafted that HBAR swap to SAUCE.", or "Got it, I've cancelled that transaction.")

      Avoid all technical prefixes. Just talk like a human expert.`
    });

    const chat = model.startChat({
      history: sanitizedHistory
    });

    const result = await chat.sendMessage(latestUserMessage);
    const responseText = result.response.text();
    const jsonOutput = JSON.parse(responseText);

    return new Response(JSON.stringify(jsonOutput), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Gemini SDK Crash:', errMsg, error.stack);
    return new Response(JSON.stringify({ 
      error: errMsg,
      reply: `🚨 AI BRIDGE FAILURE: ${errMsg}`
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
