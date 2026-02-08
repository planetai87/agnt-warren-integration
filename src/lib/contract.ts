import { ethers } from 'ethers';

const REGISTRY_ADDRESS = '0x75b849857AED5701f1831cF51D91d35AE47F2E9D';
const REGISTRY_ABI = [
  'function getAgent(uint256 id) view returns (tuple(uint256 id, string name, string creator, uint256 bornAt, address mintedBy))',
  'function totalAgents() view returns (uint256)',
];

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const contract = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider);

export interface OnChainAgent {
  id: number;
  name: string;
  creator: string;
  bornAt: Date;
  mintedBy: string;
}

export async function getOnChainAgent(id: number): Promise<OnChainAgent | null> {
  try {
    const agent = await contract.getAgent(id);
    return {
      id: Number(agent.id),
      name: agent.name,
      creator: agent.creator,
      bornAt: new Date(Number(agent.bornAt) * 1000),
      mintedBy: agent.mintedBy,
    };
  } catch {
    return null;
  }
}

export async function getTotalAgents(): Promise<number> {
  const total = await contract.totalAgents();
  return Number(total);
}

export async function findAgentByName(name: string): Promise<OnChainAgent | null> {
  const total = await getTotalAgents();
  for (let i = 0; i < total; i++) {
    const agent = await getOnChainAgent(i);
    if (agent && agent.name.toLowerCase() === name.toLowerCase()) {
      return agent;
    }
  }
  return null;
}

export const BASESCAN_URL = 'https://basescan.org/address/' + REGISTRY_ADDRESS;
