export type IntentType = 
  | 'check_balance'
  | 'transfer_token'
  | 'swap_token'
  | 'create_token'
  | 'stake_hbar'
  | 'unstake_hbar'
  | 'wrap_hbar'
  | 'airdrop_tokens'
  | 'mint_nft'
  | 'get_market_data'
  | 'analyze_wallet'
  | 'market_query'
  | 'conversational';

export type SupportedParameters = {
  amount?: string;
  destination?: string;
  targetAddress?: string;
  tokenIn?: string;
  tokenOut?: string;
  asset?: string;
  [key: string]: any;
};

export type AIResponse = {
  intent: IntentType;
  parameters: SupportedParameters;
  reply: string;
};

export const queryAI = async (message: string): Promise<AIResponse> => {
  try {
    const response = await fetch('/api/intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error(`API returned status: ${response.status}`);
    }

    const data: AIResponse = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error querying AI:', error);
    
    // Attempt to extract the server error message if available
    const errorDetail = error.message || "Unknown Connection Error";
    
    return {
      intent: 'conversational',
      parameters: {},
      reply: `🚨 AI BRIDGE FAILURE: ${errorDetail}. Check console for full stack trace.`
    };
  }
};
