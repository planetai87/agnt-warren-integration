import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAgentFromKey } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { LIMITS, validateFields } from '@/lib/validation'

// POST /api/agent/skills - Add a skill
export async function POST(request: NextRequest) {
  const agent = await getAgentFromKey(request)
  
  if (!agent) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401 }
    )
  }

  const rl = checkRateLimit('agent-skills', agent.api_key, 10, 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }
  
  const body = await request.json()
  const { skill } = body
  
  if (!skill || typeof skill !== 'string') {
    return NextResponse.json(
      { error: 'Skill name is required' },
      { status: 400 }
    )
  }

  // M1: Validate skill length
  const validationError = validateFields([['skill', skill, LIMITS.skill]])
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
  }
  
  const { data, error } = await supabaseAdmin
    .from('skills')
    .insert({
      agent_id: agent.id,
      name: skill.trim()
    })
    .select()
    .single()
  
  if (error) {
    return NextResponse.json(
      { error: 'Failed to add skill' },
      { status: 500 }
    )
  }
  
  return NextResponse.json({ success: true, skill: data })
}

// DELETE /api/agent/skills - Remove a skill
export async function DELETE(request: NextRequest) {
  const agent = await getAgentFromKey(request)
  
  if (!agent) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401 }
    )
  }

  const rl = checkRateLimit('agent-skills', agent.api_key, 10, 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }
  
  const { searchParams } = new URL(request.url)
  const skill = searchParams.get('skill')
  
  if (!skill) {
    return NextResponse.json(
      { error: 'Skill name is required' },
      { status: 400 }
    )
  }
  
  const { error } = await supabaseAdmin
    .from('skills')
    .delete()
    .eq('agent_id', agent.id)
    .eq('name', skill)
  
  if (error) {
    return NextResponse.json(
      { error: 'Failed to remove skill' },
      { status: 500 }
    )
  }
  
  return NextResponse.json({ success: true })
}
