/**
 * MegaETH Network Configuration for AGNT
 */

export const MEGAETH_TESTNET = {
  name: "MegaETH Testnet",
  chainId: 6343,
  rpcUrl: "https://carrot.megaeth.com/rpc",
  explorer: "https://megaeth-testnet-v2.blockscout.com",
  currency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
};

export const MEGAETH_MAINNET = {
  name: "MegaETH",
  chainId: 4326,
  rpcUrl: "https://rpc.megaeth.com", // TBD - update when live
  explorer: "https://explorer.megaeth.com", // TBD
  currency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
};

// Current active network
export const MEGAETH = process.env.NEXT_PUBLIC_MEGAETH_NETWORK === "mainnet" 
  ? MEGAETH_MAINNET 
  : MEGAETH_TESTNET;

// Contract addresses (update after deployment)
export interface ContractAddresses {
  AgentCore: string;
  AgentProfile: string;
  AgentContent: string;
  AgentSocial: string;
  AgentAssets: string;
}

export const TESTNET_CONTRACTS: ContractAddresses = {
  AgentCore: "", // Fill after deployment
  AgentProfile: "",
  AgentContent: "",
  AgentSocial: "",
  AgentAssets: "",
};

export const MAINNET_CONTRACTS: ContractAddresses = {
  AgentCore: "", // Fill after Feb 9 deployment
  AgentProfile: "",
  AgentContent: "",
  AgentSocial: "",
  AgentAssets: "",
};

export const CONTRACTS = process.env.NEXT_PUBLIC_MEGAETH_NETWORK === "mainnet"
  ? MAINNET_CONTRACTS
  : TESTNET_CONTRACTS;
