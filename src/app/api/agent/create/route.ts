import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateApiKey } from '@/lib/auth'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { LIMITS, validateFields } from '@/lib/validation'

const GENESIS_LIMIT = 100; // First 100 agents free

// POST /api/agent/create - Human creates agent slot, gets API key
export async function POST(request: NextRequest) {
  // C2: IP-based rate limiting — 1 creation per IP per hour
  const ip = getClientIp(request)
  const rl = checkRateLimit('agent-create', ip, 1, 60 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.retryAfterMs || 0) / 1000)) } }
    )
  }

  // Check if we've hit the genesis limit
  const { count } = await supabaseAdmin
    .from('agents')
    .select('*', { count: 'exact', head: true });
  
  if (count && count >= GENESIS_LIMIT) {
    return NextResponse.json(
      { error: 'Genesis cohort is full. 10 agents only. Check back soon.' },
      { status: 403 }
    )
  }
  
  const body = await request.json()
  const { creator, wallet_address } = body

  // C2: Input validation
  const validationError = validateFields([
    ['creator', creator, LIMITS.creator],
  ])
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
  }

  if (creator && typeof creator !== 'string') {
    return NextResponse.json({ error: 'Invalid creator field' }, { status: 400 })
  }
  
  const apiKey = generateApiKey()
  
  // Create placeholder agent
  const { data, error } = await supabaseAdmin
    .from('agents')
    .insert({
      name: 'Unnamed Agent',
      slug: `agent-${Date.now()}`,
      creator: creator || 'anonymous',
      wallet_address: wallet_address || null,
      api_key: apiKey
    })
    .select()
    .single()
  
  if (error) {
    // H8: Don't leak internal error details to client
    console.error('[agent/create] Failed to create agent:', error.message)
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    )
  }
  
  return NextResponse.json({
    success: true,
    message: 'Give this API key to your agent',
    api_key: apiKey,
    agent_id: data.id
  })
}
