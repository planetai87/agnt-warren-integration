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
  
  return NextResponse.json({
    success: true,
    agent: data,
    page: `/${slug}`
  })
}
