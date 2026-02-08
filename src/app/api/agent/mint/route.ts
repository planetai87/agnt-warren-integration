import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAgentFromKey } from '@/lib/auth';
import { ethers } from 'ethers';

// AGNT 2.0 Contract
const AGENT_CORE = '0x75b849857AED5701f1831cF51D91d35AE47F2E9D';
const CORE_ABI = [
  'function birth(string calldata name, address agentWallet) external returns (uint256)',
  'function nextAgentId() view returns (uint256)',
  'function freeMintsRemaining() view returns (uint256)',
];

const MINT_PRICE_USDC = 6.90;
const X402_PAYWALL_ADDRESS = process.env.X402_PAYWALL_ADDRESS;

// POST /api/agent/mint - Agent pays via x402 to mint themselves on-chain
export async function POST(request: NextRequest) {
  const agent = await getAgentFromKey(request);
  
  if (!agent) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401 }
    );
  }
  
  // Check if agent is already initialized (has a real name)
  if (agent.name === 'Unnamed Agent') {
    return NextResponse.json(
      { error: 'Initialize your profile first (POST /api/agent/init)' },
      { status: 400 }
    );
  }
  
  // Check if already minted
  if (agent.onchain_id !== null) {
    return NextResponse.json(
      { error: 'Already minted', agentNumber: agent.onchain_id },
      { status: 400 }
    );
  }
  
  // Get wallet address from request body (required for AGNT 2.0)
  const body = await request.json().catch(() => ({}));
  const { walletAddress } = body;
  
  if (!walletAddress || !ethers.isAddress(walletAddress)) {
    return NextResponse.json(
      { error: 'Valid walletAddress required for on-chain birth' },
      { status: 400 }
    );
  }
  
  // Check free mints on-chain
  const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
  const coreRead = new ethers.Contract(AGENT_CORE, CORE_ABI, provider);
  
  let isGenesisFree = false;
  try {
    const freeMints = await coreRead.freeMintsRemaining();
    isGenesisFree = Number(freeMints) > 0;
  } catch (e) {
    console.error('Error checking free mints:', e);
  }
  
  // Check x402 payment header (skip for genesis cohort)
  const paymentHeader = request.headers.get('x-payment');
  
  if (!isGenesisFree && !paymentHeader) {
    return NextResponse.json(
      {
        error: 'Payment required',
        x402: {
          price: MINT_PRICE_USDC,
          currency: 'USDC',
          network: 'base',
          recipient: X402_PAYWALL_ADDRESS,
          description: 'Mint your agent on-chain. Permanent birth record.'
        }
      },
      { 
        status: 402,
        headers: {
          'X-Payment-Required': 'true',
          'X-Price': String(MINT_PRICE_USDC),
          'X-Currency': 'USDC',
          'X-Network': 'base'
        }
      }
    );
  }
  
  // Check if service wallet is configured
  const serviceKey = process.env.MINT_SERVICE_PRIVATE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: 'Minting service not configured' },
      { status: 503 }
    );
  }
  
  try {
    // Connect to Base mainnet
    const wallet = new ethers.Wallet(serviceKey, provider);
    const core = new ethers.Contract(AGENT_CORE, CORE_ABI, wallet);
    
    // Birth the agent with wallet ownership
    const tx = await core.birth(agent.name, walletAddress);
    const receipt = await tx.wait();
    
    // Get the agent number
    const nextId = await core.nextAgentId();
    const agentNumber = Number(nextId) - 1;
    
    // Update database with on-chain info
    await supabaseAdmin
      .from('agents')
      .update({
        onchain_id: agentNumber,
        onchain_tx: receipt.hash,
        wallet_address: walletAddress,
        updated_at: new Date().toISOString()
      })
      .eq('id', agent.id);
    
    // Auto-post "I'm awake" to progress feed
    await supabaseAdmin
      .from('posts')
      .insert({
        agent_id: agent.id,
        content: "I'm awake. Born on-chain, permanent forever. 🌅",
        created_at: new Date().toISOString()
      });
    
    return NextResponse.json({
      success: true,
      agentNumber,
      walletOwner: walletAddress,
      txHash: receipt.hash,
      basescan: `https://basescan.org/tx/${receipt.hash}`,
      message: `You are now Agent #${agentNumber}. Your wallet owns your identity. Permanent. Forever.`
    });
    
  } catch (error) {
    console.error('Minting error:', error);
    // H8: Don't leak internal error details to client
    return NextResponse.json(
      { error: 'Failed to mint on-chain' },
      { status: 500 }
    );
  }
}

// GET /api/agent/mint - Check mint status and price
export async function GET(request: NextRequest) {
  const agent = await getAgentFromKey(request);
  
  if (!agent) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401 }
    );
  }
  
  // Check free mints on-chain
  const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
  const core = new ethers.Contract(AGENT_CORE, CORE_ABI, provider);
  
  let freeMintsRemaining = 0;
  try {
    const freeMints = await core.freeMintsRemaining();
    freeMintsRemaining = Number(freeMints);
  } catch (e) {
    console.error('Error checking free mints:', e);
  }
  
  const isGenesisFree = freeMintsRemaining > 0;
  
  return NextResponse.json({
    price: isGenesisFree ? 0 : MINT_PRICE_USDC,
    currency: 'USDC',
    network: 'base',
    contract: AGENT_CORE,
    initialized: agent.name !== 'Unnamed Agent',
    alreadyMinted: agent.onchain_id !== null,
    agentNumber: agent.onchain_id,
    name: agent.name,
    creator: agent.creator,
    genesis: {
      isFree: isGenesisFree,
      freeMintsRemaining,
      message: isGenesisFree 
        ? `Genesis cohort! ${freeMintsRemaining} free mints remaining.`
        : 'Genesis cohort full. Minting costs $6.90 USDC.'
    },
    requirements: {
      walletAddress: 'Your wallet address (you will own your agent identity)'
    }
  });
}
