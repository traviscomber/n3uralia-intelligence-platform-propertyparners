import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canRunManagementReports } from '@/lib/management-report-schedule'
import { runManagementReportDelivery } from '@/lib/management-report-delivery'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
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
  if (!canRunManagementReports(profile.role)) {
    return NextResponse.json({ error: 'Solo administración y CEO pueden procesar entregas.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const limit = Number.isInteger(body?.limit) ? Math.max(1, Math.min(body.limit, 100)) : 20

  try {
    const result = await runManagementReportDelivery({ limit })
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Error no identificado'
    console.error('[management-delivery] manual recovery failed', { actorId: user.id, message })
    return NextResponse.json({ error: 'No fue posible procesar la cola de reportes.' }, { status: 500 })
  }
}
