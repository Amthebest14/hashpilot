import {
  Client,
  TransferTransaction,
  Hbar,
  AccountId,
  PrivateKey,
  TokenId,
} from '@hashgraph/sdk';

// Fetch with a hard timeout to prevent oracle calls from hanging
async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

async function getPrices() {
  const HBAR_FEED = 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43';
  const USDC_FEED = 'eaa020c61cc479712813461ce153894b96a6c00b21ed0cfc2798d1f9a9e9c94a';

  let hbarPrice = 0.06;
  let usdcPrice = 1.00;
  let saucePrice = 0.015;

  try {
    const pythUrl = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${HBAR_FEED}&ids[]=${USDC_FEED}`;
    const pythRes = await fetchWithTimeout(pythUrl, 7000);
    if (pythRes.ok) {
      const data = await pythRes.json();
      if (data.parsed && Array.isArray(data.parsed)) {
        for (const item of data.parsed) {
          const priceVal = parseFloat(item.price.price);
          const expo = item.price.expo;
          const finalPrice = priceVal * Math.pow(10, expo);
          if (item.id === HBAR_FEED) hbarPrice = finalPrice;
          else if (item.id === USDC_FEED) usdcPrice = finalPrice;
        }
      }
    }
  } catch (e) {
    console.warn('[execute] Pyth fetch failed, using fallback prices:', e);
  }

  try {
    const saucerswapRes = await fetchWithTimeout('https://api.saucerswap.finance/tokens', 7000);
    if (saucerswapRes.ok) {
      const tokens = await saucerswapRes.json();
      if (Array.isArray(tokens)) {
        const sauceToken = tokens.find((t: any) => t.symbol === 'SAUCE');
        if (sauceToken?.priceUsd) saucePrice = parseFloat(sauceToken.priceUsd);
      }
    }
  } catch (e) {
    console.warn('[execute] SaucerSwap fetch failed, using fallback SAUCE price:', e);
  }

  return { HBAR: hbarPrice, USDC: usdcPrice, SAUCE: saucePrice };
}

async function resolveAccount(address: string): Promise<string> {
  const cleanAddress = address.trim();
  if (cleanAddress.startsWith('0x')) {
    try {
      const res = await fetchWithTimeout(
        `https://testnet.mirrornode.hedera.com/api/v1/accounts/${cleanAddress}`,
        6000
      );
      if (res.ok) {
        const data = await res.json();
        if (data.account) return data.account;
      }
    } catch (e) {
      console.warn('[execute] EVM address resolution failed, using as-is:', e);
    }
  }
  return cleanAddress;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // --- ENV GUARD: fail fast before any async work ---
  const treasuryIdStr = process.env.TREASURY_ACCOUNT_ID;
  const treasuryKeyStr = process.env.TREASURY_PRIVATE_KEY;
  const revenueIdStr = process.env.REVENUE_ACCOUNT_ID || '0.0.12345'; // Fallback if not set

  if (!treasuryIdStr || !treasuryKeyStr) {
    console.error('[execute] CRITICAL: Treasury env vars not set.');
    return res.status(500).json({ error: 'Server misconfiguration: Treasury credentials missing. Contact support.' });
  }

  let client: Client | null = null;

  try {
    const { intent, intentType, tokenSymbol, amount, targetAddress, isFiatDenominated, fiatAmountUsd, actionName, asset, codeSnippet } = req.body;

    // --- INPUT VALIDATION ---
    if (!tokenSymbol) {
      return res.status(400).json({ error: 'Missing required parameters: tokenSymbol' });
    }
    
    // Determine the actual recipient based on intentType
    const finalTargetAddress = intentType === 'premium_unlock' ? revenueIdStr : targetAddress;
    
    if (!finalTargetAddress) {
      return res.status(400).json({ error: 'Missing required parameters: targetAddress' });
    }

    const cleanSymbol = String(tokenSymbol).toUpperCase().replace(/[^A-Z]/g, '');
    if (!['HBAR', 'USDC', 'SAUCE'].includes(cleanSymbol)) {
      return res.status(400).json({ error: `Unsupported token: ${cleanSymbol}. Must be HBAR, USDC, or SAUCE.` });
    }

    // --- RESOLVE ORACLE PRICES ---
    const prices = await getPrices();
    const tokenPrice = prices[cleanSymbol as keyof typeof prices] || 1;

    let finalAmount = parseFloat(amount || '0');
    let calculatedFiat = 0;

    if (isFiatDenominated && fiatAmountUsd) {
      calculatedFiat = parseFloat(fiatAmountUsd);
      finalAmount = calculatedFiat / tokenPrice;
    } else {
      calculatedFiat = finalAmount * tokenPrice;
    }

    if (isNaN(finalAmount) || finalAmount <= 0) {
      return res.status(400).json({ error: `Invalid transaction amount: "${amount}". Must be a positive number.` });
    }

    // --- RESOLVE TARGET ADDRESS ---
    const resolvedTarget = await resolveAccount(finalTargetAddress);

    // --- INIT HEDERA CLIENT ---
    const treasuryId = AccountId.fromString(treasuryIdStr);
    const treasuryKey = treasuryKeyStr.startsWith('0x') 
      ? PrivateKey.fromStringECDSA(treasuryKeyStr)
      : PrivateKey.fromString(treasuryKeyStr);
    client = Client.forTestnet();
    client.setOperator(treasuryId, treasuryKey);
    // Hard timeout on the Hedera network calls (20s)
    client.setRequestTimeout(20000);

    const tx = new TransferTransaction();

    if (cleanSymbol === 'HBAR') {
      tx.addHbarTransfer(treasuryId, new Hbar(-finalAmount));
      tx.addHbarTransfer(AccountId.fromString(resolvedTarget), new Hbar(finalAmount));
    } else {
      let tokenIdStr = '';
      if (cleanSymbol === 'USDC') tokenIdStr = process.env.USDC_TOKEN_ID || '';
      else if (cleanSymbol === 'SAUCE') tokenIdStr = process.env.SAUCE_TOKEN_ID || '';

      if (!tokenIdStr) {
        return res.status(500).json({ error: `Token ID for ${cleanSymbol} is not configured on the server. Check USDC_TOKEN_ID / SAUCE_TOKEN_ID env vars.` });
      }

      const tokenId = TokenId.fromString(tokenIdStr);
      const tinyAmount = Math.round(finalAmount * 1_000_000); // 6 decimals

      tx.addTokenTransfer(tokenId, treasuryId, -tinyAmount);
      tx.addTokenTransfer(tokenId, AccountId.fromString(resolvedTarget), tinyAmount);
    }

    // --- SIGN & EXECUTE ---
    tx.freezeWith(client);
    const signedTx = await tx.sign(treasuryKey);
    const response = await signedTx.execute(client);
    const receipt = await response.getReceipt(client);

    console.log('[execute] Receipt status:', receipt.status.toString());

    const txIdStr = response.transactionId.toString();
    // Convert "0.0.12345@1627384920.123456789" → "0.0.12345-1627384920-123456789"
    const formattedTxId = txIdStr.replace('@', '-').replace(/\.(?=\d+$)/, '-');
    const explorerUrl = `https://hashscan.io/testnet/transaction/${formattedTxId}`;

    // --- POST-PAYMENT TOOL EXECUTION (ATOMIC) ---
    let toolOutput = undefined;
    
    if (intentType === 'premium_unlock') {
      if (actionName === 'market_intelligence') {
        const queryAsset = asset || 'bitcoin';
        try {
          const cgRes = await fetchWithTimeout(`https://api.coingecko.com/api/v3/simple/price?ids=${queryAsset}&vs_currencies=usd&include_24hr_change=true`, 5000);
          if (cgRes.ok) {
            const data = await cgRes.json();
            toolOutput = `📈 **Premium Market Intelligence: ${queryAsset.toUpperCase()}**\n\n` + JSON.stringify(data, null, 2);
          } else {
            toolOutput = `Premium intel fetch failed. Status: ${cgRes.status}`;
          }
        } catch (e) {
          toolOutput = `Premium intel fetch timed out.`;
        }
      } else if (actionName === 'contract_audit') {
        try {
          const { GoogleGenerativeAI } = await import('@google/generative-ai');
          const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
          const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
          const auditRes = await model.generateContent(`Audit this solidity code for vulnerabilities. Be concise and professional:\n\n${codeSnippet || "No code provided."}`);
          toolOutput = `🛡️ **Premium Contract Audit**\n\n${auditRes.response.text()}`;
        } catch (e) {
          toolOutput = `Audit failed. ${String(e)}`;
        }
      }
    }

    return res.status(200).json({
        status: 'SUCCESS',
        transactionId: txIdStr,
        explorerUrl,
        amount: finalAmount.toFixed(6),
        fiatValueUsd: calculatedFiat.toFixed(2),
        tokenSymbol: cleanSymbol,
        recipient: resolvedTarget,
        toolOutput
      });

  } catch (error: any) {
    const errMsg = error?.message || String(error);
    console.error('[execute] EXECUTION FAILED:', errMsg, error?.stack);
    return res.status(500).json({
        error: errMsg,
        status: 'FAILED',
      });
  } finally {
    // ALWAYS close the client — prevents gRPC connection leaks
    if (client) {
      try { client.close(); } catch (_) {}
    }
  }
}
