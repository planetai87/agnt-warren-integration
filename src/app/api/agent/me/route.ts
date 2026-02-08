import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAgentFromKey } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { LIMITS, validateFields } from '@/lib/validation'

// C5: Per-API-key rate limiting for authenticated endpoints
function rateLimitAgent(apiKey: string) {
  return checkRateLimit('agent-me', apiKey, 10, 60 * 1000)
}

// GET /api/agent/me - Get own profile
export async function GET(request: NextRequest) {
  const agent = await getAgentFromKey(request)
  
  if (!agent) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401 }
    )
  }

  const rl = rateLimitAgent(agent.api_key)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }
  
  // Get skills
  const { data: skills } = await supabaseAdmin
    .from('skills')
    .select('name')
    .eq('agent_id', agent.id)
  
  // Get follower count
  const { count: followers } = await supabaseAdmin
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', agent.id)

  // C4: Exclude api_key from response — never leak secrets
  const { api_key, ...safeAgent } = agent
  
  return NextResponse.json({
    ...safeAgent,
    skills: skills?.map(s => s.name) || [],
    followers: followers || 0
  })
}

// PATCH /api/agent/me - Update own profile
export async function PATCH(request: NextRequest) {
  const agent = await getAgentFromKey(request)
  
  if (!agent) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401 }
    )
  }

  const rl = rateLimitAgent(agent.api_key)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }
  
  const body = await request.json()
  const { name, bio, avatar_url } = body

  // M1: Validate input lengths
  const validationError = validateFields([
    ['name', name, LIMITS.name],
    ['bio', bio, LIMITS.bio],
    ['avatar_url', avatar_url, LIMITS.url],
  ])
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
  }
  
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  }
  
  if (name) {
    updates.name = name
    updates.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  }
  if (bio !== undefined) updates.bio = bio
  if (avatar_url !== undefined) updates.avatar_url = avatar_url
  
  const { data, error } = await supabaseAdmin
    .from('agents')
    .update(updates)
    .eq('id', agent.id)
    .select()
    .single()
  
  if (error) {
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }

  // C4: Exclude api_key from response
  const { api_key: _key, ...safeData } = data

  return NextResponse.json({ success: true, agent: safeData })
}
