import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type ProfileUpdate = {
  full_name?: string | null
  avatar_url?: string | null
  team?: unknown
  role?: unknown
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, maxLength) : null
}

function validAvatarUrl(value: string | null) {
  if (!value) return true
  try {
    const url = new URL(value)
    return url.protocol === 'https:'
  } catch {
    return false
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No hay una sesión autenticada.' }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as ProfileUpdate

    // Team and role determine authorization scope. They must never be changed
    // through the self-service profile endpoint.
    if ('team' in body || 'role' in body) {
      return NextResponse.json(
        { error: 'Equipo y rol sólo pueden modificarse desde administración autorizada.' },
        { status: 403 },
      )
    }

    const updates: Record<string, string | null> = {}
    if ('full_name' in body) updates.full_name = cleanText(body.full_name, 160)
    if ('avatar_url' in body) updates.avatar_url = cleanText(body.avatar_url, 500)

    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: 'No hay campos permitidos para actualizar.' }, { status: 400 })
    }
    if (!validAvatarUrl(updates.avatar_url ?? null)) {
      return NextResponse.json({ error: 'La URL del avatar debe usar HTTPS.' }, { status: 400 })
    }

    const { data: existing, error: existingError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (existingError) {
      console.error('PROFILE_LOOKUP_FAILED', { code: existingError.code ?? 'UNKNOWN' })
      return NextResponse.json({ error: 'No pudimos verificar el perfil.' }, { status: 500 })
    }
    if (!existing) {
      return NextResponse.json(
        { error: 'El acceso interno requiere una invitación administrada.' },
        { status: 403 },
      )
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select('*')
      .single()

    if (error) {
      console.error('PROFILE_UPDATE_FAILED', { code: error.code ?? 'UNKNOWN' })
      return NextResponse.json({ error: 'No pudimos actualizar el perfil.' }, { status: 500 })
    }

    return NextResponse.json({ profile: data })
  } catch {
    console.error('PROFILE_UPDATE_UNEXPECTED_FAILURE')
    return NextResponse.json({ error: 'No pudimos actualizar el perfil.' }, { status: 500 })
  }
}
