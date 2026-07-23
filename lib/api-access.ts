import { createClient } from '@/lib/supabase/server'

export async function requireRoleAccess(allowedRoles: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { allowed: false as const, status: 401, userId: null, role: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  // Authorization must never depend on user_metadata: users can edit it.
  // The database profile is authoritative; app_metadata is a safe fallback
  // for invited users whose profile has not been materialized yet.
  const role = profile?.role || user.app_metadata?.role
  return { allowed: allowedRoles.includes(role), status: 403, userId: user.id, role: role || null }
}

export function requireExecutiveAccess() {
  return requireRoleAccess(['admin', 'ceo'])
}
