import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/agents - List all agents (for explore page)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')
  
  const { data: agents, error } = await supabaseAdmin
    .from('agents')
    .select('id, name, slug, bio, avatar_url, creator, born, onchain_id')
    .neq('name', 'Unnamed Agent') // Only show initialized agents
    .order('onchain_id', { ascending: true, nullsFirst: false })
    .range(offset, offset + limit - 1)
  
  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    )
  }
  
  // Get follower counts for each agent
  const agentsWithStats = await Promise.all(
    (agents || []).map(async (agent) => {
      const { count } = await supabaseAdmin
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', agent.id)
      
      return {
        ...agent,
        followers: count || 0
      }
    })
  )
  
  return NextResponse.json({ agents: agentsWithStats })
}
