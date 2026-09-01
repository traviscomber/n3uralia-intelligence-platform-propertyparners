import { createClient } from '@supabase/supabase-js'

type DocumentRecipient = {
  id: string
  email: string
  name: string | null
  role: string
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('DOCUMENT_RECIPIENT_CONFIGURATION_MISSING')
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function getRecipientsForSchedule(scheduleId: string): Promise<DocumentRecipient[]> {
  const db = serviceClient()
  const { data: recipientRows, error: recipientError } = await db
    .from('document_recipients')
    .select('recipient_role')
    .eq('schedule_id', scheduleId)
    .eq('active', true)

  if (recipientError) {
    throw new Error('DOCUMENT_RECIPIENT_ROLES_QUERY_FAILED')
  }

  const roles = Array.from(
    new Set(
      (recipientRows || [])
        .map((row) => String(row.recipient_role || '').trim())
        .filter(Boolean),
    ),
  )

  if (roles.length === 0) return []

  const { data: profiles, error: profileError } = await db
    .from('profiles')
    .select('id, full_name, role')
    .in('role', roles)

  if (profileError) {
    throw new Error('DOCUMENT_RECIPIENT_PROFILES_QUERY_FAILED')
  }

  const resolved = await Promise.all(
    (profiles || []).map(async (profile) => {
      const { data, error } = await db.auth.admin.getUserById(profile.id)
      const email = data.user?.email?.trim()

      if (error || !email) return null

      return {
        id: profile.id,
        email,
        name: profile.full_name ?? null,
        role: profile.role,
      } satisfies DocumentRecipient
    }),
  )

  return resolved.filter((recipient): recipient is DocumentRecipient => recipient !== null)
}
