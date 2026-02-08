const hre = require("hardhat");

// Base Mainnet USDC
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying AGNT contracts with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");
  
  // Treasury = deployer for now (can change later via admin)
  const treasury = deployer.address;
  console.log("Treasury address:", treasury);
  
  // 1. Deploy AgentCore with USDC and treasury
  console.log("\n1. Deploying AgentCore...");
  const AgentCore = await hre.ethers.getContractFactory("contracts/megaeth/core/AgentCore.sol:AgentCore");
  const agentCore = await AgentCore.deploy(USDC_ADDRESS, treasury);
  await agentCore.waitForDeployment();
  const coreAddress = await agentCore.getAddress();
  console.log("   AgentCore deployed to:", coreAddress);
  console.log("   Free mints remaining:", 10);
  console.log("   Birth price after free: $6.90 USDC");
  
  // 2. Deploy AgentProfile
  console.log("\n2. Deploying AgentProfile...");
  const AgentProfile = await hre.ethers.getContractFactory("contracts/megaeth/core/AgentProfile.sol:AgentProfile");
  const agentProfile = await AgentProfile.deploy(coreAddress);
  await agentProfile.waitForDeployment();
  const profileAddress = await agentProfile.getAddress();
  console.log("   AgentProfile deployed to:", profileAddress);
  
  // 3. Deploy AgentContent
  console.log("\n3. Deploying AgentContent...");
  const AgentContent = await hre.ethers.getContractFactory("contracts/megaeth/content/AgentContent.sol:AgentContent");
  const agentContent = await AgentContent.deploy(coreAddress);
  await agentContent.waitForDeployment();
  const contentAddress = await agentContent.getAddress();
  console.log("   AgentContent deployed to:", contentAddress);
  
  // 4. Deploy AgentSocial
  console.log("\n4. Deploying AgentSocial...");
  const AgentSocial = await hre.ethers.getContractFactory("contracts/megaeth/social/AgentSocial.sol:AgentSocial");
  const agentSocial = await AgentSocial.deploy(coreAddress);
  await agentSocial.waitForDeployment();
  const socialAddress = await agentSocial.getAddress();
  console.log("   AgentSocial deployed to:", socialAddress);
  
  // 5. Deploy AgentAssets
  console.log("\n5. Deploying AgentAssets...");
  const AgentAssets = await hre.ethers.getContractFactory("contracts/megaeth/assets/AgentAssets.sol:AgentAssets");
  const agentAssets = await AgentAssets.deploy(coreAddress);
  await agentAssets.waitForDeployment();
  const assetsAddress = await agentAssets.getAddress();
  console.log("   AgentAssets deployed to:", assetsAddress);
  
  // 6. Link modules in AgentCore
  console.log("\n6. Linking modules in AgentCore...");
  await agentCore.setProfileModule(profileAddress);
  await agentCore.setContentModule(contentAddress);
  await agentCore.setSocialModule(socialAddress);
  await agentCore.setAssetsModule(assetsAddress);
  console.log("   All modules linked.");
  
  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("AGNT ON-CHAIN DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log("\nContract Addresses:");
  console.log(`  AgentCore:    ${coreAddress}`);
  console.log(`  AgentProfile: ${profileAddress}`);
  console.log(`  AgentContent: ${contentAddress}`);
  console.log(`  AgentSocial:  ${socialAddress}`);
  console.log(`  AgentAssets:  ${assetsAddress}`);
  console.log("\nPayment Config:");
  console.log(`  USDC:         ${USDC_ADDRESS}`);
  console.log(`  Treasury:     ${treasury}`);
  console.log(`  Free mints:   10`);
  console.log(`  Price:        $6.90 USDC`);
  console.log("\nNetwork:", hre.network.name);
  console.log("=".repeat(60));
  
  // Save addresses to file
  const fs = require("fs");
  const addresses = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    payment: {
      usdc: USDC_ADDRESS,
      treasury: treasury,
      freeMintsAtLaunch: 10,
      birthPrice: "6.90 USDC"
    },
    contracts: {
      AgentCore: coreAddress,
      AgentProfile: profileAddress,
      AgentContent: contentAddress,
      AgentSocial: socialAddress,
      AgentAssets: assetsAddress
    }
  };
  
  fs.writeFileSync(
    `deployments-${hre.network.name}.json`,
    JSON.stringify(addresses, null, 2)
  );
  console.log(`\nAddresses saved to deployments-${hre.network.name}.json`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
