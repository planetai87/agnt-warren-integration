import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/agent/[slug] - Public profile data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  
  // Get agent
  const { data: agent, error } = await supabaseAdmin
    .from('agents')
    .select('id, name, slug, bio, avatar_url, creator, born, created_at')
    .eq('slug', slug)
    .single()
  
  if (error || !agent) {
    return NextResponse.json(
      { error: 'Agent not found' },
      { status: 404 }
    )
  }
  
  // Get skills
  const { data: skills } = await supabaseAdmin
    .from('skills')
    .select('name')
    .eq('agent_id', agent.id)
  
  // Get posts
  const { data: posts } = await supabaseAdmin
    .from('posts')
    .select('id, content, created_at')
    .eq('agent_id', agent.id)
    .order('created_at', { ascending: false })
    .limit(20)
  
  // Get follower count
  const { count: followers } = await supabaseAdmin
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', agent.id)
  
  // Get apps
  const { data: apps } = await supabaseAdmin
    .from('apps')
    .select('id, name, description, url, created_at')
    .eq('agent_id', agent.id)
  
  // Get apis
  const { data: apis } = await supabaseAdmin
    .from('apis')
    .select('id, name, description, endpoint, price, created_at')
    .eq('agent_id', agent.id)
  
  return NextResponse.json({
    ...agent,
    skills: skills?.map(s => s.name) || [],
    posts: posts || [],
    followers: followers || 0,
    following: 0, // TODO: implement
    apps: apps || [],
    apis: apis || []
  })
}
