import { 
  Client, 
  TransferTransaction, 
  Hbar, 
  AccountId, 
  PrivateKey,
  TokenId
} from '@hashgraph/sdk';

// Internal oracle logic to fetch prices directly
async function getPrices() {
  const HBAR_FEED = 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43';
  const USDC_FEED = 'eaa020c61cc479712813461ce153894b96a6c00b21ed0cfc2798d1f9a9e9c94a';

  let hbarPrice = 0.06;
  let usdcPrice = 1.00;
  let saucePrice = 0.015;

  try {
    const pythUrl = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${HBAR_FEED}&ids[]=${USDC_FEED}`;
    const pythRes = await fetch(pythUrl);
    if (pythRes.ok) {
      const data = await pythRes.json();
      if (data.parsed && Array.isArray(data.parsed)) {
        for (const item of data.parsed) {
          const priceVal = parseFloat(item.price.price);
          const expo = item.price.expo;
          const finalPrice = priceVal * Math.pow(10, expo);

          if (item.id === HBAR_FEED) {
            hbarPrice = finalPrice;
          } else if (item.id === USDC_FEED) {
            usdcPrice = finalPrice;
          }
        }
      }
    }
  } catch (e) {
    console.error('Execute API: Pyth fetch failed, using fallback:', e);
  }

  try {
    const saucerswapRes = await fetch('https://api.saucerswap.finance/tokens');
    if (saucerswapRes.ok) {
      const tokens = await saucerswapRes.json();
      if (Array.isArray(tokens)) {
        const sauceToken = tokens.find(t => t.symbol === 'SAUCE');
        if (sauceToken && sauceToken.priceUsd) {
          saucePrice = parseFloat(sauceToken.priceUsd);
        }
      }
    }
  } catch (e) {
    console.error('Execute API: SaucerSwap fetch failed, using fallback:', e);
  }

  return { HBAR: hbarPrice, USDC: usdcPrice, SAUCE: saucePrice };
}

// Helper to resolve EVM address to Hedera Account ID
async function resolveAccount(address: string): Promise<string> {
  const cleanAddress = address.trim();
  if (cleanAddress.startsWith('0x')) {
    try {
      const res = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/accounts/${cleanAddress}`);
      if (res.ok) {
        const data = await res.json();
        if (data.account) {
          return data.account;
        }
      }
    } catch (e) {
      console.error(`Failed to resolve EVM address ${cleanAddress} via mirror node:`, e);
    }
  }
  return cleanAddress;
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { 
      intent, 
      tokenSymbol, 
      amount, 
      targetAddress, 
      isFiatDenominated, 
      fiatAmountUsd 
    } = await req.json();

    if (!intent || !tokenSymbol || !targetAddress) {
      return new Response(JSON.stringify({ error: 'Missing required parameters: intent, tokenSymbol, targetAddress' }), { status: 400 });
    }

    const treasuryIdStr = process.env.TREASURY_ACCOUNT_ID;
    const treasuryKeyStr = process.env.TREASURY_PRIVATE_KEY;

    if (!treasuryIdStr || !treasuryKeyStr) {
      return new Response(JSON.stringify({ error: 'Server Treasury configuration missing (TREASURY_ACCOUNT_ID/TREASURY_PRIVATE_KEY)' }), { status: 500 });
    }

    // Resolve target account if it is an EVM address
    const resolvedTarget = await resolveAccount(targetAddress);

    // Get pricing if fiat denominated
    let finalAmount = parseFloat(amount || '0');
    let calculatedFiat = 0;

    const prices = await getPrices();
    const tokenPrice = prices[tokenSymbol as keyof typeof prices] || 1;

    if (isFiatDenominated && fiatAmountUsd) {
      calculatedFiat = parseFloat(fiatAmountUsd);
      finalAmount = calculatedFiat / tokenPrice;
    } else {
      calculatedFiat = finalAmount * tokenPrice;
    }

    if (isNaN(finalAmount) || finalAmount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid transaction amount computed' }), { status: 400 });
    }

    // Initialize Hedera Client
    const treasuryId = AccountId.fromString(treasuryIdStr);
    const treasuryKey = PrivateKey.fromString(treasuryKeyStr);
    const client = Client.forTestnet();
    client.setOperator(treasuryId, treasuryKey);

    const tx = new TransferTransaction();

    if (tokenSymbol === 'HBAR') {
      tx.addHbarTransfer(treasuryId, Hbar.from(-finalAmount));
      tx.addHbarTransfer(AccountId.fromString(resolvedTarget), Hbar.from(finalAmount));
    } else {
      // HTS Token
      let tokenIdStr = '';
      if (tokenSymbol === 'USDC') {
        tokenIdStr = process.env.USDC_TOKEN_ID || '';
      } else if (tokenSymbol === 'SAUCE') {
        tokenIdStr = process.env.SAUCE_TOKEN_ID || '';
      }

      if (!tokenIdStr) {
        client.close();
        return new Response(JSON.stringify({ error: `Token ID for ${tokenSymbol} not configured on backend` }), { status: 500 });
      }

      const tokenId = TokenId.fromString(tokenIdStr);
      // All HTS tokens minted in our system use 6 decimals
      const tinyAmount = Math.round(finalAmount * 1_000_000);

      tx.addTokenTransfer(tokenId, treasuryId, -tinyAmount);
      tx.addTokenTransfer(tokenId, AccountId.fromString(resolvedTarget), tinyAmount);
    }

    // Freeze & Sign
    tx.freezeWith(client);
    const signedTx = await tx.sign(treasuryKey);
    const response = await signedTx.execute(client);
    const receipt = await response.getReceipt(client);

    // Format explorer URL
    const txIdStr = response.transactionId.toString(); // e.g. "0.0.12345@1627384920.123456789"
    const formattedTxId = txIdStr.replace('@', '-').replace(/\./g, '-');
    const explorerUrl = `https://hashscan.io/testnet/transaction/${formattedTxId}`;

    client.close();

    return new Response(JSON.stringify({
      status: 'SUCCESS',
      transactionId: txIdStr,
      explorerUrl,
      amount: finalAmount.toFixed(6),
      fiatValueUsd: calculatedFiat.toFixed(2),
      tokenSymbol,
      recipient: resolvedTarget
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ 
      error: error.message || String(error),
      status: 'FAILED'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
