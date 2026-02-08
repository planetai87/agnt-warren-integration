import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Admin endpoint for updating agent avatars
 * POST /api/admin/avatar
 * Body: { slug: string, avatar_url: string }
 * Auth: X-Admin-Key header
 */
export async function POST(request: NextRequest) {
  // Verify admin key
  const adminKey = request.headers.get('x-admin-key');
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { slug, avatar_url } = body;

  if (!slug || !avatar_url) {
    return NextResponse.json(
      { error: 'Missing slug or avatar_url' },
      { status: 400 }
    );
  }

  // Update the agent's avatar
  const { data, error } = await supabaseAdmin
    .from('agents')
    .update({ 
      avatar_url,
      updated_at: new Date().toISOString()
    })
    .eq('slug', slug)
    .select('id, name, slug, avatar_url')
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: 'Agent not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    agent: data,
    message: `Avatar updated for ${data.name}`
  });
}
