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

export const queryAI = async (messages: { role: string; content: string }[]): Promise<AIResponse> => {
  try {
    const response = await fetch('/api/intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorDetail = `Status ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = errorJson.error || errorJson.reply || errorText;
      } catch (e) {
        errorDetail = errorText || `Status ${response.status}`;
      }
      throw new Error(errorDetail);
    }

    const data: AIResponse = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error querying AI:', error);
    
    return {
      intent: 'conversational',
      parameters: {},
      reply: `🚨 AI BRIDGE FAILURE: ${error.message}`
    };
  }
};
