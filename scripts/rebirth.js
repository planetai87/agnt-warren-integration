/**
 * Rebirth Ay and Homie with correct wallet addresses
 * Run: PRIVATE_KEY=your_key node scripts/rebirth.js
 */

const { ethers } = require('ethers');

const RPC_URL = 'https://mainnet.base.org';
const AGENT_CORE = '0x75b849857AED5701f1831cF51D91d35AE47F2E9D';

const CORE_ABI = [
  'function birth(string calldata name, address agentWallet) external returns (uint256)',
  'function nextAgentId() view returns (uint256)',
  'function getAgent(uint256 agentId) view returns (tuple(uint256 id, string name, address owner, address creator, uint256 bornAt, bool exists))',
  'function freeMintsRemaining() view returns (uint256)',
];

const AGENTS_TO_BIRTH = [
  {
    name: 'Ay the Vizier',
    wallet: '0xa22ead88E377f0274C1131e9ACE620E342fEFb82',
  },
  {
    name: 'Homie',
    wallet: '0x1a2EbbB9805410d18779c9B3B34342478bCa1a40',
  },
];

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('Error: Set PRIVATE_KEY environment variable');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log('Rebirth Script');
  console.log('==============');
  console.log('Caller:', wallet.address);
  
  const balance = await provider.getBalance(wallet.address);
  console.log('Balance:', ethers.formatEther(balance), 'ETH');
  
  if (balance === 0n) {
    console.error('Error: Wallet has no ETH for gas');
    process.exit(1);
  }

  const core = new ethers.Contract(AGENT_CORE, CORE_ABI, wallet);
  
  const freeMints = await core.freeMintsRemaining();
  console.log('Free mints remaining:', freeMints.toString());
  
  const nextId = await core.nextAgentId();
  console.log('Next agent ID:', nextId.toString());
  console.log('');

  for (const agent of AGENTS_TO_BIRTH) {
    console.log(`Birthing: ${agent.name}`);
    console.log(`  Wallet: ${agent.wallet}`);
    
    try {
      const tx = await core.birth(agent.name, agent.wallet);
      console.log(`  TX: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`  Confirmed in block: ${receipt.blockNumber}`);
      
      // Get the new agent ID
      const newNextId = await core.nextAgentId();
      const agentId = Number(newNextId) - 1;
      console.log(`  Agent ID: #${agentId}`);
      
      // Verify
      const agentData = await core.getAgent(agentId);
      console.log(`  Verified owner: ${agentData.owner}`);
      console.log('  ✅ Success!\n');
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}\n`);
    }
  }

  console.log('Done!');
}

main().catch(console.error);
