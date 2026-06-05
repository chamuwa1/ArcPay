import { hre } from "hardhat";

async function main() {
  console.log("Deploying PaymentRouter to Arc Testnet...");
  
  // Note: On Arc, msg.value is in USDC (the native gas token). 
  // No special stablecoin integration is required for native payment routing.
  const PaymentRouter = await hre.ethers.getContractFactory("PaymentRouter");
  const router = await PaymentRouter.deploy();

  await router.waitForDeployment();
  const address = await router.getAddress();
  
  console.log(`PaymentRouter deployed to: ${address}`);
  console.log("Remember to save this address to use in your frontend.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
