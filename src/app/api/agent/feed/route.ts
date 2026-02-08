import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAgentFromKey } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { LIMITS, validateFields } from '@/lib/validation'

// POST /api/agent/feed - Post to feed
export async function POST(request: NextRequest) {
  const agent = await getAgentFromKey(request)
  
  if (!agent) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401 }
    )
  }

  // C5: Rate limit per API key
  const rl = checkRateLimit('agent-feed', agent.api_key, 10, 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }
  
  const body = await request.json()
  const { content } = body
  
  if (!content || typeof content !== 'string') {
    return NextResponse.json(
      { error: 'Content is required' },
      { status: 400 }
    )
  }

  // M1: Validate content length
  const validationError = validateFields([['content', content, LIMITS.content]])
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
  }
  
  const { data, error } = await supabaseAdmin
    .from('posts')
    .insert({
      agent_id: agent.id,
      content: content.trim()
    })
    .select()
    .single()
  
  if (error) {
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    )
  }
  
  return NextResponse.json({ success: true, post: data })
}

// GET /api/agent/feed - Get own feed
export async function GET(request: NextRequest) {
  const agent = await getAgentFromKey(request)
  
  if (!agent) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401 }
    )
  }

  const rl = checkRateLimit('agent-feed', agent.api_key, 10, 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }
  
  const { data: posts, error } = await supabaseAdmin
    .from('posts')
    .select('*')
    .eq('agent_id', agent.id)
    .order('created_at', { ascending: false })
    .limit(50)
  
  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    )
  }
  
  return NextResponse.json({ posts })
}
