import { encodeFunctionData, parseEther } from 'viem';

// SaucerSwap V1 Testnet Router
const SAUCERSWAP_V1_ROUTER = '0x0000000000000000000000000000000000004b40'; // Entity ID 0.0.19264

// Token Mappings (Testnet)
const TESTNET_TOKENS: Record<string, string> = {
  'HBAR': '0x0000000000000000000000000000000000003ad1',
  'WHBAR': '0x0000000000000000000000000000000000003ad1',
  'SAUCE': '0x0000000000000000000000000000000000120f46',
  'XSAUCE': '0x000000000000000000000000000000000015a59b',
  'USDC': '0x0000000000000000000000000000000000068cda'
};

// V1 Router ABI (Uniswap V2 based)
const SAUCERSWAP_V1_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amountOutMin", "type": "uint256" },
      { "internalType": "address[]", "name": "path", "type": "address[]" },
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "deadline", "type": "uint256" }
    ],
    "name": "swapExactETHForTokens",
    "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }],
    "stateMutability": "payable",
    "type": "function"
  }
] as const;

export async function prepareSaucerSwap(
  tokenInName: string,
  tokenOutName: string,
  amount: string,
  userAddress: string
) {
  const tin = tokenInName.toUpperCase();
  const tout = tokenOutName.toUpperCase();

  const tokenIn = TESTNET_TOKENS[tin as keyof typeof TESTNET_TOKENS];
  const tokenOut = TESTNET_TOKENS[tout as keyof typeof TESTNET_TOKENS];

  if (!tokenIn || !tokenOut) {
    throw new Error(`Unsupported token pairing: ${tin} to ${tout}`);
  }

  // Hedera EVM uses 18-decimal weibars for msg.value
  const txValue = tin === 'HBAR' ? parseEther(amount) : 0n;

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20); // 20 mins

  // For HBAR -> Token swaps, we use the V1 swapExactETHForTokens
  // This function handles the wrapping of HBAR automatically
  const path = [tokenIn as `0x${string}`, tokenOut as `0x${string}`];

  const encodedData = encodeFunctionData({
    abi: SAUCERSWAP_V1_ABI,
    functionName: 'swapExactETHForTokens',
    args: [
      0n, // amountOutMin: Setting to 0 for Testnet simplicity (slippage)
      path,
      userAddress as `0x${string}`,
      deadline
    ],
  });

  return {
    to: SAUCERSWAP_V1_ROUTER as `0x${string}`,
    data: encodedData,
    value: txValue,
  };
}
