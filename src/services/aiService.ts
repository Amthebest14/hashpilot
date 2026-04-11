export type AIResponse = {
  text: string;
  intent?: {
    type: 'TRANSFER';
    amount: string;
    token: string;
    target: string;
  };
};

export const queryAI = async (message: string): Promise<AIResponse> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes('send') || lowerMsg.includes('transfer')) {
    // Mock parsing an intent
    return {
      text: "I've detected a transfer intent. Please confirm the details in the preview card below.",
      intent: {
        type: 'TRANSFER',
        amount: '10',
        token: 'HBAR',
        target: '0.0.123456'
      }
    };
  }

  return {
    text: "I am Hashpilot, your Hedera Copilot. How can I help you interact with the hashgraph today?"
  };
};
