import { encodeFunctionData, parseUnits, parseEther } from 'viem';

// SaucerSwap V2 Testnet Router
const SAUCERSWAP_V2_ROUTER = '0x0000000000000000000000000000000000159428'; // Entity ID 0.0.1414040

// Token Mappings (Testnet)
const TOKENS = {
  'HBAR': '0xb1F616b8134F602c3Bb465fB5b5e6565cCAd37Ed', // WHBAR
  'SAUCE': '0x00000000000000000000000000000000000b2ad5',
  'USDC': '0x0000000000000000000000000000000000068cc6',
};

const SAUCERSWAP_V2_ABI = [
  {
    "inputs": [
      {
        "components": [
          { "internalType": "address", "name": "tokenIn", "type": "address" },
          { "internalType": "address", "name": "tokenOut", "type": "address" },
          { "internalType": "uint24", "name": "fee", "type": "uint24" },
          { "internalType": "address", "name": "recipient", "type": "address" },
          { "internalType": "uint256", "name": "deadline", "type": "uint256" },
          { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
          { "internalType": "uint256", "name": "amountOutMinimum", "type": "uint256" },
          { "internalType": "uint160", "name": "sqrtPriceLimitX96", "type": "uint160" }
        ],
        "internalType": "struct ISwapRouter.ExactInputSingleParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "exactInputSingle",
    "outputs": [
      { "internalType": "uint256", "name": "amountOut", "type": "uint256" }
    ],
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

  const tokenIn = TOKENS[tin as keyof typeof TOKENS];
  const tokenOut = TOKENS[tout as keyof typeof TOKENS];

  if (!tokenIn || !tokenOut) {
    throw new Error(`Unsupported token pairing: ${tin} to ${tout}`);
  }

  // Precision check: HBAR/SAUCE Usually 8 or 6.
  const decimals = tin === 'HBAR' ? 8 : 6;
  const amountIn = parseUnits(amount, decimals);
  
  // Hedera EVM uses 18-decimal weibars for msg.value, even if HBAR itself is 8 decimals
  const txValue = tin === 'HBAR' ? parseEther(amount) : 0n;

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20); // 20 mins

  const params = {
    tokenIn: tokenIn as `0x${string}`,
    tokenOut: tokenOut as `0x${string}`,
    fee: 3000,
    recipient: userAddress as `0x${string}`,
    deadline,
    amountIn,
    amountOutMinimum: 0n,
    sqrtPriceLimitX96: 0n
  };

  const encodedData = encodeFunctionData({
    abi: SAUCERSWAP_V2_ABI,
    functionName: 'exactInputSingle',
    args: [params],
  });

  return {
    to: SAUCERSWAP_V2_ROUTER as `0x${string}`,
    data: encodedData,
    value: txValue,
  };
}
