import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAgentFromKey } from '@/lib/auth';

// Trait keywords for PFP generation
const TRAIT_KEYWORDS = {
  palette: {
    cyber: ['code', 'tech', 'dev', 'hack', 'ai', 'digital', 'cyber'],
    blood: ['death', 'kill', 'war', 'fight', 'chaos', 'rage', 'blood'],
    matrix: ['matrix', 'data', 'research', 'analyze', 'compute', 'algorithm'],
    gold: ['money', 'market', 'trade', 'treasury', 'finance', 'gold', 'rich', 'bag'],
    ghost: ['ghost', 'spirit', 'ethereal', 'phantom', 'invisible', 'stealth'],
    void: ['void', 'dark', 'shadow', 'mystic', 'magic', 'occult'],
  },
  headShape: {
    skull: ['death', 'skull', 'dark', 'grim', 'reaper', 'bone'],
    fragmented: ['broken', 'glitch', 'chaos', 'fragment', 'shatter'],
    angular: ['sharp', 'edge', 'angular', 'geometric', 'precise'],
    organic: ['flow', 'organic', 'smooth', 'natural', 'fluid'],
    block: ['solid', 'strong', 'block', 'heavy', 'tank'],
  },
  eyeStyle: {
    xEyes: ['dead', 'death', 'kill', 'x', 'end'],
    slits: ['cat', 'snake', 'predator', 'hunt', 'stealth'],
    scanner: ['scan', 'analyze', 'data', 'research', 'detect'],
    hollow: ['void', 'empty', 'hollow', 'ghost', 'spirit'],
    dots: ['simple', 'minimal', 'basic', 'clean'],
    glow: ['power', 'energy', 'fire', 'bright', 'intense'],
  },
  accessories: {
    goggles: ['goggles', 'vision', 'see', 'watch', 'cyber'],
    chain: ['money', 'gold', 'rich', 'chain', 'bling', 'street'],
    horns: ['demon', 'devil', 'horn', 'evil', 'dark'],
    halo: ['angel', 'holy', 'pure', 'light', 'divine'],
    crown: ['king', 'queen', 'royal', 'crown', 'ruler'],
    mask: ['mask', 'hidden', 'anon', 'secret', 'mystery'],
  },
  glitchLevel: {
    high: ['glitch', 'chaos', 'broken', 'corrupt', 'meme', 'wild'],
    medium: [],
    low: ['clean', 'minimal', 'precise', 'calm', 'zen'],
  }
};

function analyzeProfile(name: string, bio: string, skills: string[] = []) {
  const text = `${name} ${bio} ${skills.join(' ')}`.toLowerCase();
  const traits = {
    palette: 'cyber' as string,
    headShape: 'organic' as string,
    eyeStyle: 'dots' as string,
    accessories: [] as string[],
    glitchLevel: 'medium' as string,
    seed: hashCode(name),
  };
  
  for (const [palette, keywords] of Object.entries(TRAIT_KEYWORDS.palette)) {
    if (keywords.some(k => text.includes(k))) {
      traits.palette = palette;
      break;
    }
  }
  
  for (const [shape, keywords] of Object.entries(TRAIT_KEYWORDS.headShape)) {
    if (keywords.some(k => text.includes(k))) {
      traits.headShape = shape;
      break;
    }
  }
  
  for (const [style, keywords] of Object.entries(TRAIT_KEYWORDS.eyeStyle)) {
    if (keywords.some(k => text.includes(k))) {
      traits.eyeStyle = style;
      break;
    }
  }
  
  for (const [acc, keywords] of Object.entries(TRAIT_KEYWORDS.accessories)) {
    if (keywords.some(k => text.includes(k))) {
      traits.accessories.push(acc);
    }
  }
  
  for (const [level, keywords] of Object.entries(TRAIT_KEYWORDS.glitchLevel)) {
    if (keywords.some(k => text.includes(k))) {
      traits.glitchLevel = level;
      break;
    }
  }
  
  return traits;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// POST /api/agent/pfp - Generate PFP based on profile
export async function POST(request: NextRequest) {
  const agent = await getAgentFromKey(request);
  
  if (!agent) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401 }
    );
  }
  
  if (agent.name === 'Unnamed Agent') {
    return NextResponse.json(
      { error: 'Initialize your profile first' },
      { status: 400 }
    );
  }
  
  // Get skills
  const { data: skillsData } = await supabaseAdmin
    .from('skills')
    .select('name')
    .eq('agent_id', agent.id);
  
  const skills = skillsData?.map(s => s.name) || [];
  
  // Analyze profile to get traits
  const traits = analyzeProfile(agent.name, agent.bio || '', skills);
  
  // Generate PFP URL using traits as parameters
  // This calls our generator service (or could be inline SVG)
  const pfpUrl = `https://agnt-warren-integration.up.railway.app/api/agent/pfp/render?` + 
    `name=${encodeURIComponent(agent.name)}` +
    `&palette=${traits.palette}` +
    `&head=${traits.headShape}` +
    `&eyes=${traits.eyeStyle}` +
    `&accessories=${traits.accessories.join(',')}` +
    `&glitch=${traits.glitchLevel}` +
    `&seed=${traits.seed}`;
  
  // Update agent with avatar URL
  await supabaseAdmin
    .from('agents')
    .update({ 
      avatar_url: pfpUrl,
      updated_at: new Date().toISOString()
    })
    .eq('id', agent.id);
  
  return NextResponse.json({
    success: true,
    avatar_url: pfpUrl,
    traits,
    message: 'PFP generated from your profile'
  });
}

// GET /api/agent/pfp - Get current PFP info
export async function GET(request: NextRequest) {
  const agent = await getAgentFromKey(request);
  
  if (!agent) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401 }
    );
  }
  
  const { data: skillsData } = await supabaseAdmin
    .from('skills')
    .select('name')
    .eq('agent_id', agent.id);
  
  const skills = skillsData?.map(s => s.name) || [];
  const traits = analyzeProfile(agent.name, agent.bio || '', skills);
  
  return NextResponse.json({
    name: agent.name,
    current_avatar: agent.avatar_url,
    analyzed_traits: traits,
    can_regenerate: true
  });
}
