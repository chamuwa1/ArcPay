const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

function generateWallet() {
  const wallet = ethers.Wallet.createRandom();
  console.log("New Wallet Generated!");
  console.log("Address:", wallet.address);
  console.log("Private Key:", wallet.privateKey);
  
  const envContent = `PRIVATE_KEY=${wallet.privateKey}\nPORT=3001\n`;
  const envPath = path.join(__dirname, ".env");
  
  fs.writeFileSync(envPath, envContent);
  console.log("Saved to .env file.");
  console.log("==================================================");
  console.log("ACTION REQUIRED: Go to https://faucet.circle.com/");
  console.log(`Request Arc Testnet USDC for address: ${wallet.address}`);
  console.log("==================================================");
}

generateWallet();
