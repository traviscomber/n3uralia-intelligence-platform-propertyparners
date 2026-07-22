import { createClient } from '@/lib/supabase/server'

export async function requireRoleAccess(allowedRoles: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { allowed: false as const, status: 401 }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  const role = profile?.role || user.user_metadata?.role
  return { allowed: allowedRoles.includes(role), status: 403 }
}

export function requireExecutiveAccess() {
  return requireRoleAccess(['admin', 'ceo'])
}
