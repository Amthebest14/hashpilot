import { 
  Client, 
  TokenCreateTransaction, 
  TokenType, 
  TokenSupplyType, 
  PrivateKey, 
  AccountId,
  TokenMintTransaction,
  TransferTransaction
} from '@hashgraph/sdk';
import * as fs from 'fs';
import * as path from 'path';

// Helper to load env variables from .env.local
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        } else if (val.startsWith("'") && val.endsWith("'")) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    });
  }
}

async function main() {
  loadEnv();

  const treasuryIdStr = process.env.TREASURY_ACCOUNT_ID;
  const treasuryKeyStr = process.env.TREASURY_PRIVATE_KEY;

  if (!treasuryIdStr || !treasuryKeyStr) {
    console.error('Error: TREASURY_ACCOUNT_ID and TREASURY_PRIVATE_KEY must be set in .env.local');
    process.exit(1);
  }

  console.log(`Using Treasury Account ID: ${treasuryIdStr}`);

  const treasuryId = AccountId.fromString(treasuryIdStr);
  const treasuryKey = PrivateKey.fromString(treasuryKeyStr);

  // Initialize Hedera client for Testnet
  const client = Client.forTestnet();
  client.setOperator(treasuryId, treasuryKey);

  console.log('\n--- Creating USDC-test Token ---');
  const usdcTx = await new TokenCreateTransaction()
    .setTokenName("USDC-test")
    .setTokenSymbol("USDC-test")
    .setDecimals(6)
    .setInitialSupply(1000000000000) // 1,000,000.000000 USDC
    .setTokenType(TokenType.FungibleCommon)
    .setSupplyType(TokenSupplyType.Infinite)
    .setTreasuryAccountId(treasuryId)
    .setAdminKey(treasuryKey)
    .setSupplyKey(treasuryKey)
    .freezeWith(client);

  const usdcSign = await usdcTx.sign(treasuryKey);
  const usdcSubmit = await usdcSign.execute(client);
  const usdcReceipt = await usdcSubmit.getReceipt(client);
  const usdcTokenId = usdcReceipt.tokenId;
  console.log(`USDC-test Token Created! ID: ${usdcTokenId?.toString()}`);

  console.log('\n--- Creating SAUCE-test Token ---');
  const sauceTx = await new TokenCreateTransaction()
    .setTokenName("SAUCE-test")
    .setTokenSymbol("SAUCE-test")
    .setDecimals(6)
    .setInitialSupply(1000000000000) // 1,000,000.000000 SAUCE
    .setTokenType(TokenType.FungibleCommon)
    .setSupplyType(TokenSupplyType.Infinite)
    .setTreasuryAccountId(treasuryId)
    .setAdminKey(treasuryKey)
    .setSupplyKey(treasuryKey)
    .freezeWith(client);

  const sauceSign = await sauceTx.sign(treasuryKey);
  const sauceSubmit = await sauceSign.execute(client);
  const sauceReceipt = await sauceSubmit.getReceipt(client);
  const sauceTokenId = sauceReceipt.tokenId;
  console.log(`SAUCE-test Token Created! ID: ${sauceTokenId?.toString()}`);

  console.log('\n=========================================');
  console.log('Token minting and creation complete!');
  console.log(`Add these to your .env.local file:`);
  console.log(`USDC_TOKEN_ID=${usdcTokenId?.toString()}`);
  console.log(`SAUCE_TOKEN_ID=${sauceTokenId?.toString()}`);
  console.log('=========================================');

  client.close();
}

main().catch(err => {
  console.error('Error running script:', err);
  process.exit(1);
});
