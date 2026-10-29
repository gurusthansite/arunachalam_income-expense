import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Service-role client. Bypasses RLS — only used for user provisioning and
// the first-admin bootstrap check. Never import from client components.
export function createAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Supabase service role credentials are not configured')
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function countMembers(): Promise<number> {
  const admin = createAdminClient()
  const { count, error } = await admin
    .from('org_members')
    .select('user_id', { count: 'exact', head: true })
  if (error) throw new Error(error.message)
  return count ?? 0
}
