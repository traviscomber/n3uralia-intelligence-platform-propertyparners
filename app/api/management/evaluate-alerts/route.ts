import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function monthBounds(period?: string) {
  const safe = /^\d{4}-\d{2}$/.test(period ?? '') ? String(period) : new Date().toISOString().slice(0, 7)
  const start = `${safe}-01`
  const endDate = new Date(`${start}T00:00:00Z`)
  endDate.setUTCMonth(endDate.getUTCMonth() + 1)
  endDate.setUTCDate(0)
  return { period: safe, start, end: endDate.toISOString().slice(0, 10) }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('[management-alert-evaluation] profile lookup failed', { code: profileError.code })
    return NextResponse.json({ error: 'No fue posible validar el perfil.' }, { status: 500 })
  }

  const role = String(profile?.role ?? '').toLowerCase()
  if (!['admin', 'ceo', 'director', 'subdirector'].includes(role)) {
    return NextResponse.json({ error: 'Sin permisos para evaluar alertas' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({})) as { period?: string }
  const bounds = monthBounds(body.period)
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('evaluate_management_alerts', {
    p_period_start: bounds.start,
    p_period_end: bounds.end,
  })

  if (error) {
    console.error('[management-alert-evaluation] rule evaluation failed', { code: error.code, period: bounds.period })
    return NextResponse.json({ error: 'No fue posible evaluar las alertas.' }, { status: 500 })
  }

  const { error: auditError } = await admin.from('management_change_log').insert({
    entity_name: 'management_alerts',
    entity_id: bounds.period,
    action: 'import',
    after_data: { operation: 'evaluate_rules', period: bounds.period, result: data },
    changed_by: user.id,
  })

  if (auditError) {
    console.error('[management-alert-evaluation] audit write failed', { code: auditError.code, period: bounds.period })
    return NextResponse.json({ error: 'La evaluación terminó, pero no fue posible registrar su trazabilidad.' }, { status: 500 })
  }

  return NextResponse.json({
    period: bounds.period,
    result: data?.[0] ?? { created_count: 0, resolved_count: 0 },
  })
}
