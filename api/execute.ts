import {
  Client,
  TransferTransaction,
  Hbar,
  AccountId,
  PrivateKey,
  TokenId,
} from '@hashgraph/sdk';

export const maxDuration = 60; // Allow Vercel function to run for up to 60s for LLM processing

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

import { fetchLivePrices } from './_lib/pricing.js';
import yahooFinance from 'yahoo-finance2';

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
  const revenueIdStr = process.env.REVENUE_CONTRACT_ID || '0.0.9080200'; // Default to deployed vault

  if (!treasuryIdStr || !treasuryKeyStr) {
    console.error('[execute] CRITICAL: Treasury env vars not set.');
    return res.status(500).json({ error: 'Server misconfiguration: Treasury credentials missing. Contact support.' });
  }

  let client: Client | null = null;

  try {
    const { intent, intentType, tokenSymbol, amount, targetAddress, isFiatDenominated, fiatAmountUsd, actionName, asset, assetType, codeSnippet } = req.body;

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
    const prices = await fetchLivePrices();
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
        const isStock = assetType === 'stock';
        let rawData = "No data returned";
        const queryAsset = String(asset || 'bitcoin').toLowerCase().trim();

        try {
          if (isStock) {
            // TRADFI / RWA LOGIC
            const quote = await yahooFinance.quote(queryAsset);
            
            // Map the massive yahoo object down to conserve tokens
            const mappedData = {
              price: quote.regularMarketPrice,
              percentChange: quote.regularMarketChangePercent,
              marketCap: quote.marketCap,
              trailingPE: quote.trailingPE,
              dividendYield: quote.dividendYield,
              fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
              fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
            };
            rawData = JSON.stringify(mappedData);
          } else {
            // CRYPTO LOGIC
            const coinIdMapper: Record<string, string> = {
              "hbar": "hedera-hashgraph",
              "hedera": "hedera-hashgraph",
              "btc": "bitcoin",
              "bitcoin": "bitcoin",
              "eth": "ethereum",
              "ethereum": "ethereum",
              "ape": "apecoin",
              "apecoin": "apecoin",
              "sol": "solana",
              "solana": "solana"
            };
            const coinGeckoId = coinIdMapper[queryAsset] || queryAsset;
            
            const cgRes = await fetchWithTimeout(`https://api.coingecko.com/api/v3/simple/price?ids=${coinGeckoId}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`, 5000);
            if (cgRes.ok) {
              rawData = JSON.stringify(await cgRes.json());
            }
          }

          const { GoogleGenerativeAI } = await import('@google/generative-ai');
          const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
          const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
          const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          
          let prompt = `You are Hashpilot, a premium Web3 Financial Analyst. The user just paid for a deep Market Intelligence report on '${queryAsset}'.
          Today's Date: ${currentDate}
          Here is the raw real-time data: ${rawData}
          
          Write a highly detailed, professional, and visually appealing market analysis report using Markdown. Include:
          1. Current Price & 24h Change Summary
          2. Market Capitalization & Volume Insights
          3. Technical/Sentiment Outlook (extrapolate intelligently from the data, mention support/resistance concepts contextually)
          Provide deep qualitative insight that makes the user feel they got their money's worth.`;

          if (isStock) {
            prompt = `You are Hashpilot, a premium Wall Street Financial Analyst. The user just paid for a deep Market Intelligence report on the traditional stock/RWA '${queryAsset}'.
          Today's Date: ${currentDate}
          Here is the raw real-time data from Yahoo Finance: ${rawData}
          
          Write a highly detailed, professional, and visually appealing 'Wall Street' style market analysis report using Markdown. Include:
          1. Current Price & Daily Change Summary
          2. Market Capitalization & Macro High/Low Context (52-week data)
          3. Institutional Metrics (Focus on P/E ratio, Dividend Yield, and Valuation)
          Provide deep, institutional-grade qualitative insight distinguishing this from a standard crypto report.`;
          }
          
          const aiRes = await model.generateContent(prompt);
          toolOutput = aiRes.response.text();
        } catch (e) {
          toolOutput = `Premium intel fetch failed. Error: ${String(e)}`;
        }
      } else if (actionName === 'contract_audit') {
        try {
          const { GoogleGenerativeAI } = await import('@google/generative-ai');
          const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
          const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
          
          const prompt = `You are Hashpilot, an elite Smart Contract Auditor. The user just paid for a comprehensive security audit of this Solidity code:
          
          \`\`\`solidity
          ${codeSnippet || "No code provided."}
          \`\`\`
          
          Perform a highly detailed, meticulous line-by-line audit. Your report MUST include:
          1. Executive Summary (Overall security posture)
          2. Vulnerabilities Found (Categorized by Critical, High, Medium, Low severity)
          3. Logic & Gas Optimizations
          4. Remediation Steps with corrected code snippets.
          Do not be brief. Provide a premium, deep-dive report formatted beautifully in Markdown.`;
          
          const auditRes = await model.generateContent(prompt);
          toolOutput = auditRes.response.text();
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
