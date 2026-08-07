import 'server-only'

import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase service configuration is missing')

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function recoverStaleDocumentDistributionClaims() {
  const { data, error } = await getSupabase().rpc('recover_stale_document_distribution_claims')
  if (error) throw error
  return Number(data ?? 0)
}
