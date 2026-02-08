import { NextRequest, NextResponse } from 'next/server'
import { getAgentFromKey } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { supabaseAdmin } from '@/lib/supabase'
import {
  estimateWarrenFee,
  payWarrenRelayer,
  mintWarrenNFT,
  getWarrenWalletAddress,
} from '@/lib/warren-client'

// MasterNFT registry address (where images are stored)
const MASTER_NFT_REGISTRY = '0xb7f14622ea97b26524BE743Ab6D9FA519Afbe756'

// Estimated gas cost for a single NFT mint operation (roughly 0.0001 ETH)
const MINT_FEE_SIZE_ESTIMATE = 1024

interface MintNFTRequestBody {
  imageTokenId?: number
  title?: string
}

export async function POST(request: NextRequest) {
  const agent = await getAgentFromKey(request)

  if (!agent) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401 }
    )
  }

  const rl = checkRateLimit('warren-mint-nft', String(agent.id), 5, 3600000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  const body = (await request.json().catch(() => ({}))) as MintNFTRequestBody
  const imageTokenId = typeof body.imageTokenId === 'number' ? body.imageTokenId : null
  const title = typeof body.title === 'string' ? body.title.trim() : ''

  if (imageTokenId === null || !Number.isInteger(imageTokenId) || imageTokenId < 0) {
    return NextResponse.json(
      { error: 'imageTokenId (non-negative integer) is required' },
      { status: 400 }
    )
  }

  if (!title) {
    return NextResponse.json(
      { error: 'title is required' },
      { status: 400 }
    )
  }

  if (title.length > 100) {
    return NextResponse.json(
      { error: 'title must be 100 characters or less' },
      { status: 400 }
    )
  }

  // Agent must have a wallet address to own the NFT
  const ownerAddress = agent.wallet_address
  if (!ownerAddress) {
    return NextResponse.json(
      { error: 'Agent must have a wallet_address to mint NFTs. Complete on-chain birth first (POST /api/agent/mint).' },
      { status: 400 }
    )
  }

  try {
    // Estimate fee (use a small size since mint is a single tx, not chunk deployment)
    const feeEstimate = await estimateWarrenFee(MINT_FEE_SIZE_ESTIMATE)
    const payment = await payWarrenRelayer(feeEstimate.totalWei, feeEstimate.relayerAddress)
    const senderAddress = getWarrenWalletAddress()

    const mintResult = await mintWarrenNFT(
      ownerAddress,
      MASTER_NFT_REGISTRY,
      imageTokenId,
      title,
      payment.txHash,
      senderAddress
    )

    const { data: savedDeployment, error: insertError } = await supabaseAdmin
      .from('warren_deployments')
      .insert({
        agent_id: agent.id,
        name: title,
        site_type: 'image',
        deploy_type: 'nft',
        owner_address: ownerAddress,
        nft_address: mintResult.nftAddress,
        nft_token_id: mintResult.tokenId,
        source_token_id: String(imageTokenId),
        fee_total_wei: feeEstimate.totalWei,
        fee_total_eth: feeEstimate.totalEth,
        relayer_address: feeEstimate.relayerAddress,
        gas_cost_eth: feeEstimate.gasCostEth,
        fee_eth: feeEstimate.feeEth,
        payment_tx_hash: payment.txHash,
        payment_amount_wei: payment.amount,
        sender_address: senderAddress,
        token_id: mintResult.tokenId,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[warren/mint-nft] Failed to insert record:', insertError.message)
      return NextResponse.json(
        {
          error: 'NFT minted but failed to save record',
          mint: mintResult,
          payment,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      nft: {
        tokenId: mintResult.tokenId,
        nftAddress: mintResult.nftAddress,
        ownerAddress: mintResult.ownerAddress,
        txHash: mintResult.txHash,
        title,
        imageTokenId,
        sourceRegistry: MASTER_NFT_REGISTRY,
      },
      deployment: savedDeployment,
      fee: feeEstimate,
      payment,
    })
  } catch (error) {
    console.error('[warren/mint-nft] Mint error:', error)
    return NextResponse.json(
      { error: 'Failed to mint NFT on Warren' },
      { status: 500 }
    )
  }
}
