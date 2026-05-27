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

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  // --- ENV GUARD: fail fast before any async work ---
  const treasuryIdStr = process.env.TREASURY_ACCOUNT_ID;
  const treasuryKeyStr = process.env.TREASURY_PRIVATE_KEY;

  if (!treasuryIdStr || !treasuryKeyStr) {
    console.error('[execute] CRITICAL: Treasury env vars not set.');
    return new Response(
      JSON.stringify({ error: 'Server misconfiguration: Treasury credentials missing. Contact support.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let client: Client | null = null;

  try {
    const { intent, tokenSymbol, amount, targetAddress, isFiatDenominated, fiatAmountUsd } =
      await req.json();

    // --- INPUT VALIDATION ---
    if (!intent || !tokenSymbol || !targetAddress) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: intent, tokenSymbol, targetAddress' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const cleanSymbol = String(tokenSymbol).toUpperCase().replace(/[^A-Z]/g, '');
    if (!['HBAR', 'USDC', 'SAUCE'].includes(cleanSymbol)) {
      return new Response(
        JSON.stringify({ error: `Unsupported token: ${cleanSymbol}. Must be HBAR, USDC, or SAUCE.` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
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
      return new Response(
        JSON.stringify({ error: `Invalid transaction amount: "${amount}". Must be a positive number.` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // --- RESOLVE TARGET ADDRESS ---
    const resolvedTarget = await resolveAccount(targetAddress);

    // --- INIT HEDERA CLIENT ---
    const treasuryId = AccountId.fromString(treasuryIdStr);
    const treasuryKey = PrivateKey.fromString(treasuryKeyStr);
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
        return new Response(
          JSON.stringify({ error: `Token ID for ${cleanSymbol} is not configured on the server. Check USDC_TOKEN_ID / SAUCE_TOKEN_ID env vars.` }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
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
    // Convert "0.0.12345@1627384920.123456789" → "0-0-12345-1627384920-123456789"
    const formattedTxId = txIdStr.replace('@', '-').replace(/\./g, '-');
    const explorerUrl = `https://hashscan.io/testnet/transaction/${formattedTxId}`;

    return new Response(
      JSON.stringify({
        status: 'SUCCESS',
        transactionId: txIdStr,
        explorerUrl,
        amount: finalAmount.toFixed(6),
        fiatValueUsd: calculatedFiat.toFixed(2),
        tokenSymbol: cleanSymbol,
        recipient: resolvedTarget,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    const errMsg = error?.message || String(error);
    console.error('[execute] EXECUTION FAILED:', errMsg, error?.stack);
    return new Response(
      JSON.stringify({
        error: errMsg,
        status: 'FAILED',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  } finally {
    // ALWAYS close the client — prevents gRPC connection leaks
    if (client) {
      try { client.close(); } catch (_) {}
    }
  }
}
