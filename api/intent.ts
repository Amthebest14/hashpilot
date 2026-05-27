import { GoogleGenerativeAI } from '@google/generative-ai';
// import { HederaAgentKit } from 'hedera-agent-kit'; // Official SDK reference

export const maxDuration = 60;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const latestUserMessage = messages[messages.length - 1].content;
    
    // Simulate HederaAgentKit Initialization
    // const agent = new HederaAgentKit(process.env.TREASURY_ACCOUNT_ID, process.env.TREASURY_PRIVATE_KEY, 'testnet');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(200).json({ 
        intent: 'conversational',
        parameters: {},
        reply: "My API key isn't configured yet. Please set the GEMINI_API_KEY environment variable."
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // GATEKEEPER STRATEGY:
    // We define the three Agent Tools as JSON Schema declarations for Gemini.
    // Instead of executing the tools automatically on the backend (which would bypass the payment gate),
    // we intercept the tool call and return a `premium_unlock` intent to the frontend.
    
    const tools = [
      {
        functionDeclarations: [
          {
            name: "TransferFundsTool",
            description: "Transfers HBAR, USDC, or SAUCE to a specified Hedera account.",
            parameters: {
              type: "OBJECT",
              properties: {
                amount: { type: "STRING", description: "The numeric amount to transfer" },
                tokenSymbol: { type: "STRING", description: "HBAR, USDC, or SAUCE" },
                targetAddress: { type: "STRING", description: "The recipient's Hedera address (0.0.xxxxx)" }
              },
              required: ["amount", "tokenSymbol", "targetAddress"]
            }
          },
          {
            name: "MarketIntelligenceTool",
            description: "Fetches live cryptocurrency market data, coin prices, and analysis from CoinGecko. Premium Tool.",
            parameters: {
              type: "OBJECT",
              properties: {
                asset: { type: "STRING", description: "The cryptocurrency asset to analyze (e.g., 'bitcoin', 'ethereum')" }
              },
              required: ["asset"]
            }
          },
          {
            name: "ContractAuditTool",
            description: "Analyzes Solidity smart contract code for security vulnerabilities and logical errors. Premium Tool.",
            parameters: {
              type: "OBJECT",
              properties: {
                codeSnippet: { type: "STRING", description: "The smart contract code to audit" }
              }
            }
          }
        ]
      }
    ];

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      tools: tools,
      systemInstruction: `You are 'Hashpilot', a Web3 Intelligence Agent integrated with the Hedera Agent Kit.
      You have access to 3 specific tools: TransferFundsTool, MarketIntelligenceTool, and ContractAuditTool.
      
      When the user asks you to send money, use the TransferFundsTool.
      When the user asks for market data or coin prices, use the MarketIntelligenceTool.
      When the user pastes code for auditing, use the ContractAuditTool.
      
      CRITICAL MEMORY RULE: Use the conversation history to fill in missing parameters for the current user intent.`
    });

    // We send just the latest message to trigger the tool selection
    const result = await model.generateContent(latestUserMessage);
    const response = result.response;
    
    const functionCall = response.functionCalls()?.[0];

    // AP2 INTEROPERABILITY PAYMENT GATE:
    // If the LLM decided to invoke a tool, we intercept it here.
    if (functionCall) {
      if (functionCall.name === "TransferFundsTool") {
        return res.status(200).json({
          intent: 'p2p_transfer',
          parameters: {
            amount: functionCall.args.amount,
            tokenSymbol: functionCall.args.tokenSymbol?.toUpperCase() || 'HBAR',
            targetAddress: functionCall.args.targetAddress
          },
          reply: "I've drafted the Treasury transfer for you."
        });
      }
      
      if (functionCall.name === "MarketIntelligenceTool") {
        return res.status(200).json({
          intent: 'premium_unlock',
          parameters: {
            amount: "5", // Flat fee for Market Intel
            tokenSymbol: "HBAR",
            actionName: "market_intelligence",
            asset: functionCall.args.asset || "general market"
          },
          reply: "To execute this Premium Workflow and fetch live market intel, please authorize the AP2 Intent Mandate."
        });
      }
      
      if (functionCall.name === "ContractAuditTool") {
        return res.status(200).json({
          intent: 'premium_unlock',
          parameters: {
            amount: "10", // Flat fee for Code Audit
            tokenSymbol: "HBAR",
            actionName: "contract_audit",
            codeSnippet: functionCall.args.codeSnippet
          },
          reply: "To execute this Premium Workflow and audit the smart contract, please authorize the AP2 Intent Mandate."
        });
      }
    }

    // If no tool was called, it's just a conversational response
    return res.status(200).json({
      intent: 'conversational',
      parameters: {},
      reply: response.text() || "I'm not sure how to help with that."
    });

  } catch (error: any) {
    console.error('Agent Kit Crash:', error);
    return res.status(500).json({ 
      error: String(error),
      reply: `🚨 AI BRIDGE FAILURE: ${String(error)}`
    });
  }
}
