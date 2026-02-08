import { NextRequest, NextResponse } from 'next/server'
import { getAgentFromKey } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const agent = await getAgentFromKey(request)

  if (!agent) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401 }
    )
  }

  const { data, error } = await supabaseAdmin
    .from('warren_deployments')
    .select('*')
    .eq('agent_id', agent.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[warren/sites] Failed to fetch deployments:', error.message)
    return NextResponse.json(
      { error: 'Failed to fetch Warren deployments' },
      { status: 500 }
    )
  }

  return NextResponse.json({ sites: data || [] })
}
