import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// TODO [C6]: Split into separate clients with appropriate keys:
// - supabase (anon key) for client-side / public reads
// - supabaseAdmin (service role key) for server-side mutations only
// Currently supabaseAdmin is used everywhere, which grants full bypass of RLS.
// Audit each usage and downgrade to anon client where possible.
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
