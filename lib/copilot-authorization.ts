import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export type CopilotRole = 'ceo' | 'director' | 'partner'

type AuthorizedCopilotUser = {
  userId: string
  role: CopilotRole
}

type CopilotAuthorizationResult =
  | { ok: true; value: AuthorizedCopilotUser }
  | { ok: false; response: NextResponse }

function normalizeRole(value: unknown): string {
  return String(value ?? '').trim().toLowerCase()
}

export async function requireCopilotRole(
  allowedRoles: readonly CopilotRole[],
): Promise<CopilotAuthorizationResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }),
    }
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.error('Copilot role lookup failed:', error)
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'No fue posible validar el perfil' },
        { status: 500 },
      ),
    }
  }

  const role = normalizeRole(profile?.role)

  if (!allowedRoles.includes(role as CopilotRole)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Acceso denegado' }, { status: 403 }),
    }
  }

  return {
    ok: true,
    value: {
      userId: user.id,
      role: role as CopilotRole,
    },
  }
}
