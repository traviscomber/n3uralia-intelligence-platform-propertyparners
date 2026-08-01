import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = String(profile?.role ?? '').toLowerCase()
  if (!['admin', 'ceo', 'director', 'subdirector'].includes(role)) {
    return NextResponse.json({ error: 'Sin permisos para evaluar alertas' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const bounds = monthBounds(body.period)
  const { data, error } = await supabase.rpc('evaluate_management_alerts', {
    p_period_start: bounds.start,
    p_period_end: bounds.end,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('management_change_log').insert({
    entity_name: 'management_alerts',
    entity_id: bounds.period,
    action: 'import',
    after_data: { operation: 'evaluate_rules', period: bounds.period, result: data },
    changed_by: user.id,
  })

  return NextResponse.json({ period: bounds.period, result: data?.[0] ?? { created_count: 0, resolved_count: 0 } })
}
