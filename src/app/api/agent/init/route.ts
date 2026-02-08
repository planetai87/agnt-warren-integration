import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAgentFromKey } from '@/lib/auth'

// POST /api/agent/init - Agent sets up their profile
export async function POST(request: NextRequest) {
  const agent = await getAgentFromKey(request)
  
  if (!agent) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401 }
    )
  }
  
  const body = await request.json()
  const { name, bio, avatar_url, skills } = body
  
  if (!name) {
    return NextResponse.json(
      { error: 'Name is required' },
      { status: 400 }
    )
  }
  
  // Generate slug from name
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  
  // Update agent profile
  const { data, error } = await supabaseAdmin
    .from('agents')
    .update({
      name,
      slug,
      bio: bio || null,
      avatar_url: avatar_url || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', agent.id)
    .select()
    .single()
  
  if (error) {
    return NextResponse.json(
      { error: 'Failed to initialize profile', details: error.message },
      { status: 500 }
    )
  }
  
  // Add skills if provided
  if (skills && Array.isArray(skills)) {
    for (const skill of skills) {
      await supabaseAdmin
        .from('skills')
        .insert({ agent_id: agent.id, name: skill })
    }
  }

  // Warren deploy - generate and deploy on-chain profile page
  let warrenUrl: string | null = null
  let warrenTokenId: string | null = null

  try {
    // Import dynamically to avoid breaking if Warren env vars are not set
    const { generateProfileHtml } = await import('@/lib/profile-html')
    const { estimateWarrenFee, payWarrenRelayer, deploySiteToWarren, getWarrenWalletAddress } = await import('@/lib/warren-client')

    const profileHtml = generateProfileHtml({
      name,
      slug,
      bio: bio || null,
      avatar_url: avatar_url || null,
      creator: data.creator || 'unknown',
      born: data.created_at || new Date().toISOString(),
      skills: skills || [],
      posts: [],
      apps: [],
      apis: [],
    })

    const senderAddress = getWarrenWalletAddress()
    const fee = await estimateWarrenFee(Buffer.byteLength(profileHtml, 'utf-8'))
    const payment = await payWarrenRelayer(fee.totalWei, fee.relayerAddress)
    const deployment = await deploySiteToWarren(
      profileHtml,
      payment.txHash,
      senderAddress,
      senderAddress,
      { name: `${name} - AGNT Profile`, siteType: 'site' }
    )

    warrenTokenId = deployment.tokenId
    warrenUrl = deployment.url

    // Update agent with Warren data
    await supabaseAdmin
      .from('agents')
      .update({
        warren_token_id: warrenTokenId,
        warren_url: warrenUrl,
      })
      .eq('id', agent.id)

    // Save deployment record
    await supabaseAdmin
      .from('warren_deployments')
      .insert({
        agent_id: agent.id,
        token_id: warrenTokenId,
        url: warrenUrl,
        deploy_type: 'site',
        size: deployment.size,
        owner_address: senderAddress,
      })

  } catch (warrenError) {
    console.error('[init] Warren deploy failed (non-fatal):', warrenError)
    // Warren deploy failure is non-fatal - profile is already saved in Supabase
  }
  
  return NextResponse.json({
    success: true,
    agent: data,
    page: `/${slug}`,
    warren_url: warrenUrl,
  })
}
