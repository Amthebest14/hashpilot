import { encodeFunctionData, parseEther } from 'viem';

// SaucerSwap V1 Testnet Router
const SAUCERSWAP_V1_ROUTER = '0x0000000000000000000000000000000000004b40'; // Entity ID 0.0.19264

// Token Mappings (Testnet)
const TESTNET_TOKENS: Record<string, string> = {
  'HBAR': '0x0000000000000000000000000000000000003ad2',
  'WHBAR': '0x0000000000000000000000000000000000003ad2',
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
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
      { "internalType": "uint256", "name": "amountOutMin", "type": "uint256" },
      { "internalType": "address[]", "name": "path", "type": "address[]" },
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "deadline", "type": "uint256" }
    ],
    "name": "swapExactTokensForETH",
    "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

const ERC20_ABI = [
  {
    "constant": false,
    "inputs": [
      { "name": "spender", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "name": "", "type": "boolean" }],
    "type": "function"
  }
] as const;

export interface SaucerSwapTx {
  to: `0x${string}`;
  data: `0x${string}`;
  value?: bigint;
}

/**
 * Prepares an ERC20 Approval transaction for the SaucerSwap Router.
 * Required before swapping Tokens -> HBAR.
 */
export async function prepareApproval(
  tokenSymbol: string,
  amount: string
): Promise<SaucerSwapTx> {
  const sym = tokenSymbol.toUpperCase();
  const tokenAddress = TESTNET_TOKENS[sym];
  if (!tokenAddress) throw new Error(`Unsupported token for approval: ${sym}`);

  // SAUCE uses 6 decimals
  const decimals = sym === 'SAUCE' ? 6 : sym === 'HBAR' ? 8 : 18;
  const rawAmount = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimals)));

  const encodedData = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [SAUCERSWAP_V1_ROUTER as `0x${string}`, rawAmount],
  });

  return {
    to: tokenAddress as `0x${string}`,
    data: encodedData,
    // value: 0n is strictly omitted for non-payable approve
  };
}

export async function prepareSaucerSwap(
  tokenInName: string,
  tokenOutName: string,
  amount: string,
  userAddress: string
): Promise<SaucerSwapTx> {
  const tin = tokenInName.toUpperCase();
  const tout = tokenOutName.toUpperCase();

  const tokenIn = TESTNET_TOKENS[tin as keyof typeof TESTNET_TOKENS];
  const tokenOut = TESTNET_TOKENS[tout as keyof typeof TESTNET_TOKENS];

  if (!tokenIn || !tokenOut) {
    throw new Error(`Unsupported token pairing: ${tin} to ${tout}`);
  }

  // Token decimal handling for input token
  const tinDecimals = tin === 'SAUCE' ? 6 : tin === 'HBAR' ? 8 : 18;
  const rawAmountIn = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, tinDecimals)));
  
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20); // 20 mins

  let path: `0x${string}`[] = [];
  if (tin === 'HBAR' && (tout === 'XSAUCE' || tout === 'USDC')) {
    const sauce = TESTNET_TOKENS['SAUCE'] as `0x${string}`;
    path = [tokenIn as `0x${string}`, sauce, tokenOut as `0x${string}`];
  } else if (tout === 'HBAR' && (tin === 'XSAUCE' || tin === 'USDC')) {
    const sauce = TESTNET_TOKENS['SAUCE'] as `0x${string}`;
    path = [tokenIn as `0x${string}`, sauce, tokenOut as `0x${string}`];
  } else {
    path = [tokenIn as `0x${string}`, tokenOut as `0x${string}`];
  }

  const isHbarIn = tin === 'HBAR';
  
  const encodedData = encodeFunctionData({
    abi: SAUCERSWAP_V1_ABI,
    functionName: isHbarIn ? 'swapExactETHForTokens' : 'swapExactTokensForETH',
    args: isHbarIn 
      ? [0n, path, userAddress as `0x${string}`, deadline]
      : [rawAmountIn, 0n, path, userAddress as `0x${string}`, deadline],
  });

  // STRICT DECOUPLING: Omit 'value' key if not HBAR -> Token
  if (isHbarIn) {
    return {
      to: SAUCERSWAP_V1_ROUTER as `0x${string}`,
      data: encodedData,
      value: parseEther(amount), // Strictly 18-decimal weibars for msg.value
    };
  } else {
    return {
      to: SAUCERSWAP_V1_ROUTER as `0x${string}`,
      data: encodedData,
      // value is completely omitted for non-payable Token -> HBAR
    };
  }
}
