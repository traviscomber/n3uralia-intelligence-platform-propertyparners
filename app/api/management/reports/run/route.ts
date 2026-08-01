import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runDueManagementReports } from '@/lib/management-monthly-report'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return NextResponse.json({ error: profileError?.message ?? 'Perfil no configurado' }, { status: 403 })
  }

  const role = String(profile.role ?? '').trim().toLowerCase()
  if (!['admin', 'ceo'].includes(role)) {
    return NextResponse.json({ error: 'Solo administración y CEO pueden ejecutar reportes programados.' }, { status: 403 })
  }

  try {
    const result = await runDueManagementReports({ trigger: 'manual', actorId: user.id })
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error no identificado'
    console.error('[management-monthly] manual recovery failed', { actorId: user.id, message })
    return NextResponse.json({ error: 'No fue posible ejecutar los reportes programados.' }, { status: 500 })
  }
}
