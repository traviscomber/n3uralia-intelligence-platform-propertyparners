import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type ProfileUpdate = {
  full_name?: string | null
  team?: string | null
  avatar_url?: string | null
}

function cleanText(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No authenticated user.' }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as ProfileUpdate
    const updates: Record<string, string | null> = {}

    if ('full_name' in body) updates.full_name = cleanText(body.full_name)
    if ('team' in body) updates.team = cleanText(body.team)
    if ('avatar_url' in body) updates.avatar_url = cleanText(body.avatar_url)

    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: 'No hay campos para actualizar.' }, { status: 400 })
    }

    const { data: existing, error: existingError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (existingError) throw existingError

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

    if (error) throw error

    return NextResponse.json({ profile: data })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'No pudimos actualizar el perfil.' },
      { status: 500 },
    )
  }
}
