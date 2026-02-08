import { NextRequest, NextResponse } from 'next/server'
import { getAgentFromKey } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { supabaseAdmin } from '@/lib/supabase'
import {
  estimateWarrenFee,
  payWarrenRelayer,
  deployMediaToWarren,
  getWarrenWalletAddress,
} from '@/lib/warren-client'

const MEDIA_TYPE_MAP: Record<string, string> = {
  image: 'image',
  video: 'video',
  audio: 'audio',
}

const MAX_MEDIA_SIZE = 5 * 1024 * 1024 // 5MB

interface DeployMediaRequestBody {
  data?: string
  mediaType?: string
  name?: string
}

export async function POST(request: NextRequest) {
  const agent = await getAgentFromKey(request)

  if (!agent) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401 }
    )
  }

  const rl = checkRateLimit('warren-deploy-media', String(agent.id), 5, 3600000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  const body = (await request.json().catch(() => ({}))) as DeployMediaRequestBody
  const base64Data = typeof body.data === 'string' ? body.data : ''
  const mediaType = typeof body.mediaType === 'string' ? body.mediaType : ''
  const name = typeof body.name === 'string' ? body.name.trim() : undefined

  if (!base64Data) {
    return NextResponse.json(
      { error: 'data (base64) is required' },
      { status: 400 }
    )
  }

  const siteType = MEDIA_TYPE_MAP[mediaType]
  if (!siteType) {
    return NextResponse.json(
      { error: 'mediaType must be one of: image, video, audio' },
      { status: 400 }
    )
  }

  // Decode to check size
  let decodedSize: number
  try {
    decodedSize = Buffer.from(base64Data, 'base64').length
  } catch {
    return NextResponse.json(
      { error: 'Invalid base64 data' },
      { status: 400 }
    )
  }

  if (decodedSize > MAX_MEDIA_SIZE) {
    return NextResponse.json(
      { error: `Media exceeds 5MB limit (${(decodedSize / 1024 / 1024).toFixed(2)}MB)` },
      { status: 400 }
    )
  }

  try {
    const feeEstimate = await estimateWarrenFee(decodedSize)
    const payment = await payWarrenRelayer(feeEstimate.totalWei, feeEstimate.relayerAddress)
    const senderAddress = getWarrenWalletAddress()
    const deployment = await deployMediaToWarren(base64Data, payment.txHash, senderAddress, {
      name,
      siteType,
    })

    const { data: savedDeployment, error: insertError } = await supabaseAdmin
      .from('warren_deployments')
      .insert({
        agent_id: agent.id,
        name: name || null,
        site_type: siteType,
        html_size: decodedSize,
        deploy_type: 'media',
        fee_total_wei: feeEstimate.totalWei,
        fee_total_eth: feeEstimate.totalEth,
        relayer_address: feeEstimate.relayerAddress,
        chunk_count: feeEstimate.chunkCount,
        gas_cost_eth: feeEstimate.gasCostEth,
        fee_eth: feeEstimate.feeEth,
        payment_tx_hash: payment.txHash,
        payment_amount_wei: payment.amount,
        sender_address: senderAddress,
        token_id: deployment.tokenId,
        url: deployment.url,
        root_chunk: deployment.rootChunk,
        depth: deployment.depth,
        size: deployment.size,
        gas_used: deployment.gasUsed,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[warren/deploy-media] Failed to insert deployment:', insertError.message)
      return NextResponse.json(
        {
          error: 'Deployment succeeded but failed to save record',
          deployment,
          payment,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      deployment: savedDeployment,
      fee: feeEstimate,
      payment,
      senderAddress,
    })
  } catch (error) {
    console.error('[warren/deploy-media] Deployment error:', error)
    return NextResponse.json(
      { error: 'Failed to deploy media to Warren' },
      { status: 500 }
    )
  }
}
