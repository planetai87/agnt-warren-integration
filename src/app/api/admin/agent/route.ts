import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Admin endpoint for updating agent data
 * PATCH /api/admin/agent
 * Body: { slug: string, ...updates }
 * Auth: X-Admin-Key header
 */
export async function PATCH(request: NextRequest) {
  // Verify admin key
  const adminKey = request.headers.get('x-admin-key');
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { slug, ...updates } = body;

  if (!slug) {
    return NextResponse.json(
      { error: 'Missing slug' },
      { status: 400 }
    );
  }

  // Allowed fields to update
  const allowedFields = ['bio', 'avatar_url', 'onchain_id', 'name', 'creator'];
  const filteredUpdates: Record<string, any> = {};
  
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      filteredUpdates[field] = updates[field];
    }
  }

  if (Object.keys(filteredUpdates).length === 0) {
    return NextResponse.json(
      { error: 'No valid fields to update' },
      { status: 400 }
    );
  }

  filteredUpdates.updated_at = new Date().toISOString();

  // Update the agent
  const { data, error } = await supabaseAdmin
    .from('agents')
    .update(filteredUpdates)
    .eq('slug', slug)
    .select('id, name, slug, bio, avatar_url, onchain_id')
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
    message: `Agent ${data.name} updated`
  });
}

/**
 * Delete duplicate skills for an agent
 * DELETE /api/admin/agent
 * Body: { slug: string, action: "dedupe-skills" }
 */
export async function DELETE(request: NextRequest) {
  const adminKey = request.headers.get('x-admin-key');
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { slug, action } = body;

  if (action === 'dedupe-skills' && slug) {
    // Get agent ID
    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('id')
      .eq('slug', slug)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Get all skills
    const { data: skills } = await supabaseAdmin
      .from('skills')
      .select('id, name')
      .eq('agent_id', agent.id);

    if (!skills || skills.length === 0) {
      return NextResponse.json({ message: 'No skills to dedupe' });
    }

    // Find duplicates
    const seen = new Set<string>();
    const toDelete: string[] = [];

    for (const skill of skills) {
      if (seen.has(skill.name)) {
        toDelete.push(skill.id);
      } else {
        seen.add(skill.name);
      }
    }

    if (toDelete.length > 0) {
      await supabaseAdmin
        .from('skills')
        .delete()
        .in('id', toDelete);
    }

    return NextResponse.json({
      success: true,
      deleted: toDelete.length,
      remaining: skills.length - toDelete.length
    });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
