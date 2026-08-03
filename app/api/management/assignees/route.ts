import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,role,team')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('[management-assignees] profile lookup failed', { code: profileError.code })
    return NextResponse.json({ error: 'No fue posible validar el perfil.' }, { status: 500 })
  }

  const role = String(profile?.role ?? '').toLowerCase()
  if (!profile || !['admin', 'ceo', 'director', 'subdirector'].includes(role)) {
    return NextResponse.json({ error: 'Rol no autorizado' }, { status: 403 })
  }

  let query = supabase.from('profiles').select('id,full_name,team,role').order('full_name')
  if (!['admin', 'ceo'].includes(role)) query = query.eq('team', profile.team)

  const { data, error } = await query
  if (error) {
    console.error('[management-assignees] query failed', { code: error.code })
    return NextResponse.json({ error: 'No fue posible cargar los responsables.' }, { status: 500 })
  }

  return NextResponse.json(
    { assignees: data ?? [] },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
