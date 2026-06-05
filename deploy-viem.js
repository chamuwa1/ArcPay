import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import solc from 'solc';
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function deploy() {
  console.log("Compiling PaymentRouter.sol...");
  const contractPath = path.join(__dirname, 'contracts', 'PaymentRouter.sol');
  const source = fs.readFileSync(contractPath, 'utf8');

  const input = {
    language: 'Solidity',
    sources: {
      'PaymentRouter.sol': {
        content: source
      }
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode']
        }
      }
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  
  if (output.errors) {
    output.errors.forEach(err => console.error(err.formattedMessage));
    if (output.errors.some(e => e.severity === 'error')) {
      process.exit(1);
    }
  }

  const contract = output.contracts['PaymentRouter.sol']['PaymentRouter'];
  const abi = contract.abi;
  const bytecode = contract.evm.bytecode.object;

  console.log("Compilation successful!");
  
  // Set up Viem clients for Arc Testnet
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) throw new Error("PRIVATE_KEY not found in .env");
  
  const account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`);
  
  // Define Arc Testnet explicitly as a custom chain
  const arcTestnet = {
    id: 5042002,
    name: 'Arc Testnet',
    network: 'arc-testnet',
    nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://rpc.testnet.arc.network'] },
      public: { http: ['https://rpc.testnet.arc.network'] },
    }
  };

  const publicClient = createPublicClient({
    chain: arcTestnet,
    transport: http()
  });

  const walletClient = createWalletClient({
    account,
    chain: arcTestnet,
    transport: http()
  });

  console.log(`Deploying to Arc Testnet from address: ${account.address}`);
  
  try {
    const hash = await walletClient.deployContract({
      abi,
      bytecode: `0x${bytecode}`,
    });

    console.log(`Deployment transaction submitted: ${hash}`);
    console.log("Waiting for confirmation (sub-second finality)...");

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    console.log(`\n🎉 Success! PaymentRouter deployed to: ${receipt.contractAddress}`);
    console.log(`View on Explorer: https://testnet.arcscan.app/address/${receipt.contractAddress}`);
  } catch (err) {
    console.error("Deployment failed:", err);
  }
}

deploy();
