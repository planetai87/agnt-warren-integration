import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

// AGNT 2.0 - Full agent management with wallet ownership
const AGENT_CORE = '0x75b849857AED5701f1831cF51D91d35AE47F2E9D';

const CORE_ABI = [
  'function getAgent(uint256 agentId) view returns (tuple(uint256 id, string name, address owner, address creator, uint256 bornAt, bool exists))',
  'function profileModule() view returns (address)',
  'function nextAgentId() view returns (uint256)',
];

const PROFILE_ABI = [
  'function profiles(uint256) view returns (string bio, string avatar, string website, string twitter, string github, uint256 updatedAt)',
];

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  
  try {
    const core = new ethers.Contract(AGENT_CORE, CORE_ABI, provider);
    const nextId = await core.nextAgentId();
    const total = Number(nextId);
    
    // Find agent by slug
    for (let i = 0; i < total && i < 100; i++) {
      try {
        const agent = await core.getAgent(i);
        
        if (!agent.exists) continue;
        
        const agentSlug = agent.name.toLowerCase().replace(/\s+/g, '-');
        
        if (agentSlug === slug) {
          // Get profile data
          let profileData = { bio: '', avatar: '', website: '', twitter: '', github: '', updatedAt: 0 };
          try {
            const profileAddr = await core.profileModule();
            const profile = new ethers.Contract(profileAddr, PROFILE_ABI, provider);
            profileData = await profile.profiles(i);
          } catch (e) {
            console.error('Profile fetch error:', e);
          }
          
          // Get wallet balance
          const balance = await provider.getBalance(agent.owner);
          
          // Convert IPFS URI to gateway URL for display
          let avatarUrl = profileData.avatar || null;
          if (avatarUrl && avatarUrl.startsWith('ipfs://')) {
            avatarUrl = avatarUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
          }
          
          return NextResponse.json({
            onchain: true,
            agentNumber: i,
            name: agent.name,
            owner: agent.owner,
            creator: agent.creator,
            bornAt: new Date(Number(agent.bornAt) * 1000).toISOString(),
            mintedBy: agent.creator,
            contract: AGENT_CORE,
            basescan: `https://basescan.org/address/${AGENT_CORE}`,
            profile: {
              bio: profileData.bio || null,
              avatar: profileData.avatar || null,
              avatarUrl: avatarUrl,
              website: profileData.website || null,
              twitter: profileData.twitter || null,
              github: profileData.github || null,
            },
            wallet: {
              address: agent.owner,
              balanceEth: ethers.formatEther(balance),
            }
          });
        }
      } catch (e) {
        // Agent doesn't exist at this index, continue
        continue;
      }
    }
    
    return NextResponse.json({ onchain: false });
  } catch (error) {
    console.error('Error fetching on-chain data:', error);
    return NextResponse.json({ onchain: false, error: String(error) });
  }
}
