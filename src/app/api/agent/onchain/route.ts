import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

const RPC_URL = 'https://mainnet.base.org';
const AGENT_CORE = '0x75b849857AED5701f1831cF51D91d35AE47F2E9D';

const CORE_ABI = [
  'function agents(uint256) view returns (uint256 id, string name, address owner, address creator, uint256 bornAt, bool exists)',
  'function profileModule() view returns (address)',
  'function nextAgentId() view returns (uint256)',
];

const PROFILE_ABI = [
  'function profiles(uint256) view returns (string bio, string avatar, string website, string twitter, string github, uint256 updatedAt)',
];

// ERC721 ABI for NFT fetching
const ERC721_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
];

// GET /api/agent/onchain?id=1 or ?wallet=0x...
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get('id');
  const wallet = searchParams.get('wallet');

  if (!agentId && !wallet) {
    return NextResponse.json(
      { error: 'Provide id or wallet parameter' },
      { status: 400 }
    );
  }

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const core = new ethers.Contract(AGENT_CORE, CORE_ABI, provider);

    let id = agentId ? parseInt(agentId) : null;
    let agentData;

    // If wallet provided, find agent by owner
    if (wallet && !id) {
      const nextId = await core.nextAgentId();
      for (let i = 0; i < nextId; i++) {
        const agent = await core.agents(i);
        if (agent.owner.toLowerCase() === wallet.toLowerCase()) {
          id = i;
          agentData = agent;
          break;
        }
      }
      if (id === null) {
        return NextResponse.json({ error: 'No agent found for wallet' }, { status: 404 });
      }
    } else {
      agentData = await core.agents(id);
    }

    if (!agentData.exists) {
      return NextResponse.json({ error: 'Agent not found on-chain' }, { status: 404 });
    }

    // Get profile data
    const profileAddr = await core.profileModule();
    const profile = new ethers.Contract(profileAddr, PROFILE_ABI, provider);
    const profileData = await profile.profiles(id);

    // Get wallet balance
    const balance = await provider.getBalance(agentData.owner);

    // Build response
    const response = {
      onchain: true,
      agent: {
        id: Number(agentData.id),
        name: agentData.name,
        owner: agentData.owner,
        creator: agentData.creator,
        bornAt: new Date(Number(agentData.bornAt) * 1000).toISOString(),
        bornTimestamp: Number(agentData.bornAt),
      },
      profile: {
        bio: profileData.bio || null,
        avatar: profileData.avatar || null,
        website: profileData.website || null,
        twitter: profileData.twitter || null,
        github: profileData.github || null,
        updatedAt: profileData.updatedAt > 0 
          ? new Date(Number(profileData.updatedAt) * 1000).toISOString() 
          : null,
      },
      wallet: {
        address: agentData.owner,
        balanceWei: balance.toString(),
        balanceEth: ethers.formatEther(balance),
      },
      contracts: {
        core: AGENT_CORE,
        profile: profileAddr,
        chain: 'base',
        chainId: 8453,
      }
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('On-chain fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch on-chain data' },
      { status: 500 }
    );
  }
}
