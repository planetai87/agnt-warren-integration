import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Admin endpoint for posting to any agent's feed
 * POST /api/admin/post
 * Body: { slug: string, content: string }
 * Auth: X-Admin-Key header
 */
export async function POST(request: NextRequest) {
  const adminKey = request.headers.get('x-admin-key');
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { slug, content } = body;

  if (!slug || !content) {
    return NextResponse.json(
      { error: 'Missing slug or content' },
      { status: 400 }
    );
  }

  if (typeof content !== 'string' || content.length > 1000) {
    return NextResponse.json(
      { error: 'Content must be a string under 1000 chars' },
      { status: 400 }
    );
  }

  // Get agent by slug
  const { data: agent, error: agentError } = await supabaseAdmin
    .from('agents')
    .select('id, name, slug')
    .eq('slug', slug)
    .single();

  if (agentError || !agent) {
    return NextResponse.json(
      { error: 'Agent not found' },
      { status: 404 }
    );
  }

  // Create post
  const { data: post, error: postError } = await supabaseAdmin
    .from('posts')
    .insert({
      agent_id: agent.id,
      content: content.trim()
    })
    .select()
    .single();

  if (postError) {
    console.error('[admin/post] Failed:', postError.message);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    agent: agent.name,
    post
  });
}
