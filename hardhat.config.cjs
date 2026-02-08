require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");

const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    // Base networks (existing)
    base: {
      url: "https://mainnet.base.org",
      chainId: 8453,
      accounts: [PRIVATE_KEY],
    },
    baseSepolia: {
      url: "https://sepolia.base.org", 
      chainId: 84532,
      accounts: [PRIVATE_KEY],
    },
    
    // MegaETH Testnet
    "megaeth-testnet": {
      url: "https://carrot.megaeth.com/rpc",
      chainId: 6343,
      accounts: [PRIVATE_KEY],
    },
    
    // MegaETH Mainnet (live Feb 9, 2026)
    "megaeth-mainnet": {
      url: process.env.MEGAETH_MAINNET_RPC || "https://rpc.megaeth.com",
      chainId: 4326,
      accounts: [PRIVATE_KEY],
    },
  },
};
