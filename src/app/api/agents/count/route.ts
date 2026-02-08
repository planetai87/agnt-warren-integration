import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const GENESIS_LIMIT = 100;

// GET /api/agents/count - Get current agent count
export async function GET() {
  const { count } = await supabaseAdmin
    .from('agents')
    .select('*', { count: 'exact', head: true });
  
  return NextResponse.json({
    total: count || 0,
    limit: GENESIS_LIMIT,
    remaining: GENESIS_LIMIT - (count || 0),
    open: (count || 0) < GENESIS_LIMIT
  });
}
