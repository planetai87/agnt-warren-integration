import { NextRequest, NextResponse } from 'next/server'
import { getAgentFromKey } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { supabaseAdmin } from '@/lib/supabase'
import {
  estimateWarrenFee,
  payWarrenRelayer,
  deploySiteToWarren,
  getWarrenWalletAddress,
} from '@/lib/warren-client'

interface WarrenDeployRequestBody {
  html?: string
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

  const rl = checkRateLimit('warren-deploy', String(agent.id), 5, 3600000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  const body = (await request.json().catch(() => ({}))) as WarrenDeployRequestBody
  const html = typeof body.html === 'string' ? body.html : ''
  const name = typeof body.name === 'string' ? body.name.trim() : undefined

  if (!html.trim()) {
    return NextResponse.json(
      { error: 'html is required' },
      { status: 400 }
    )
  }

  const size = new TextEncoder().encode(html).length

  try {
    const feeEstimate = await estimateWarrenFee(size)
    const payment = await payWarrenRelayer(feeEstimate.totalWei, feeEstimate.relayerAddress)
    const senderAddress = getWarrenWalletAddress()

    // Use agent's wallet_address as owner if available, otherwise fallback to AGNT platform wallet
    const ownerAddress = agent.wallet_address || senderAddress

    const deployment = await deploySiteToWarren(html, payment.txHash, senderAddress, ownerAddress, {
      name,
      siteType: 'file',
    })

    const { data: savedDeployment, error: insertError } = await supabaseAdmin
      .from('warren_deployments')
      .insert({
        agent_id: agent.id,
        name: name || null,
        site_type: 'file',
        html_size: size,
        deploy_type: 'container',
        owner_address: ownerAddress,
        container_address: deployment.containerAddress,
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
      console.error('[warren/deploy] Failed to insert deployment:', insertError.message)
      return NextResponse.json(
        {
          error: 'Deployment succeeded but failed to save deployment record',
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
      ownerAddress,
    })
  } catch (error) {
    console.error('[warren/deploy] Deployment error:', error)
    return NextResponse.json(
      { error: 'Failed to deploy to Warren' },
      { status: 500 }
    )
  }
}
