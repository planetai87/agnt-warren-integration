import { randomBytes } from 'crypto'
import { supabaseAdmin } from './supabase'
import { NextRequest } from 'next/server'

// TODO [C3]: API keys should be hashed (SHA-256) before storing in the database.
// Currently stored in plaintext. Migration plan needed:
// 1. Add hashed_api_key column
// 2. Hash all existing keys
// 3. Update getAgentFromKey to compare hashes
// 4. Drop plaintext api_key column
// See: TOCTOU note below on the select-then-compare pattern.

export async function getAgentFromKey(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  
  const apiKey = authHeader.slice(7)
  
  // TODO [M4]: TOCTOU race condition — the agent record could be modified between
  // this read and subsequent writes in calling code. For now acceptable given
  // single-agent-per-key semantics, but consider SELECT ... FOR UPDATE if moving
  // to a transactional flow.
  const { data: agent, error } = await supabaseAdmin
    .from('agents')
    .select('*')
    .eq('api_key', apiKey)
    .single()
  
  if (error || !agent) {
    return null
  }
  
  return agent
}

export function generateApiKey(): string {
  // C1 fix: Use cryptographically secure random bytes instead of Math.random()
  return 'agnt_' + randomBytes(24).toString('base64url')
}
