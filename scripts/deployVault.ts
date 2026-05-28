import {
  Client,
  AccountId,
  PrivateKey,
  FileCreateTransaction,
  ContractCreateTransaction,
  Hbar
} from '@hashgraph/sdk';
import * as fs from 'fs';
import * as path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  console.log("🚀 Starting HashpilotVault deployment to Hedera Testnet...");

  const operatorIdStr = process.env.TREASURY_ACCOUNT_ID;
  const operatorKeyStr = process.env.TREASURY_PRIVATE_KEY;

  if (!operatorIdStr || !operatorKeyStr) {
    throw new Error("Must set TREASURY_ACCOUNT_ID and TREASURY_PRIVATE_KEY in .env.local");
  }

  const operatorId = AccountId.fromString(operatorIdStr);
  const operatorKey = operatorKeyStr.startsWith('0x')
    ? PrivateKey.fromStringECDSA(operatorKeyStr)
    : PrivateKey.fromString(operatorKeyStr);

  const client = Client.forTestnet();
  client.setOperator(operatorId, operatorKey);

  // 1. Compile the Smart Contract
  console.log("⏳ Compiling HashpilotVault.sol...");
  const contractPath = path.resolve(process.cwd(), 'contracts/HashpilotVault.sol');
  const sourceCode = fs.readFileSync(contractPath, 'utf8');

  const input = {
    language: 'Solidity',
    sources: {
      'HashpilotVault.sol': {
        content: sourceCode
      }
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['*']
        }
      }
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  
  if (output.errors) {
    let hasError = false;
    output.errors.forEach((err: any) => {
      console.log(err.formattedMessage);
      if (err.severity === 'error') hasError = true;
    });
    if (hasError) {
      console.error("❌ Compilation failed.");
      process.exit(1);
    }
  }

  const contractFile = output.contracts['HashpilotVault.sol']['HashpilotVault'];
  const bytecode = contractFile.evm.bytecode.object;
  const abi = contractFile.abi;

  console.log("✅ Compiled successfully!");

  // 2. Store the bytecode on Hedera using a FileCreateTransaction
  console.log("⏳ Uploading bytecode to Hedera file service...");
  const fileCreateTx = new FileCreateTransaction()
    .setKeys([operatorKey])
    .setContents(bytecode);
    
  const submitTx = await fileCreateTx.execute(client);
  const fileReceipt = await submitTx.getReceipt(client);
  const bytecodeFileId = fileReceipt.fileId;

  if (!bytecodeFileId) {
     throw new Error("Failed to upload bytecode.");
  }
  
  console.log(`✅ Bytecode uploaded. File ID: ${bytecodeFileId.toString()}`);

  // 3. Deploy the smart contract
  console.log("⏳ Deploying HashpilotVault Smart Contract...");
  const contractTx = new ContractCreateTransaction()
    .setBytecodeFileId(bytecodeFileId)
    .setGas(4000000)
    .setAdminKey(operatorKey); // Admin key so we can update/delete if needed

  const contractSubmit = await contractTx.execute(client);
  const contractReceipt = await contractSubmit.getReceipt(client);
  const newContractId = contractReceipt.contractId;

  if (!newContractId) {
      throw new Error("Failed to deploy contract.");
  }

  console.log(`\n🎉 SUCCESS! HashpilotVault Deployed! 🎉`);
  console.log(`===========================================`);
  console.log(`CONTRACT ID: ${newContractId.toString()}`);
  console.log(`===========================================\n`);
  
  console.log(`Please copy the Contract ID above and set it as your REVENUE_CONTRACT_ID in .env.local and Vercel.\n`);

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Deployment Error:", err);
  process.exit(1);
});
