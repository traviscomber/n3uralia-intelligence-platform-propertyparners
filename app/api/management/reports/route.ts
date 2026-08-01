import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getManagementReportDeliveryConfiguration } from '@/lib/management-report-delivery'

const reportTypes = new Set(['executive', 'office', 'partner', 'monthly', 'cumulative'])

function validDate(value: unknown) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
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
  if (profileError || !profile) {
    return NextResponse.json({ error: profileError?.message ?? 'Perfil no configurado' }, { status: 403 })
  }

  const role = String(profile.role ?? '').toLowerCase()
  if (!['admin', 'ceo', 'director', 'subdirector'].includes(role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const reportType = String(body?.reportType ?? '')
  if (!reportTypes.has(reportType) || !validDate(body?.periodStart) || !validDate(body?.periodEnd)) {
    return NextResponse.json({ error: 'Tipo o período de reporte inválido.' }, { status: 400 })
  }
  if (!body?.snapshot || typeof body.snapshot !== 'object' || Array.isArray(body.snapshot)) {
    return NextResponse.json({ error: 'El snapshot debe ser un objeto.' }, { status: 400 })
  }
  if (JSON.stringify(body.snapshot).length > 2_000_000) {
    return NextResponse.json({ error: 'El snapshot supera el límite de 2 MB.' }, { status: 413 })
  }

  const { data, error } = await supabase
    .from('management_report_runs')
    .insert({
      report_type: reportType,
      entity_id: body.entityId ?? null,
      period_start: body.periodStart,
      period_end: body.periodEnd,
      status: 'generated',
      snapshot: body.snapshot,
      generated_by: user.id,
    })
    .select('id,report_type,entity_id,period_start,period_end,status,generated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ report: data }, { status: 201 })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('management_report_runs')
    .select(`
      id,
      report_type,
      entity_id,
      period_start,
      period_end,
      status,
      generated_by,
      generated_at,
      distributed_at,
      distribution_reference,
      management_report_distributions (
        id,
        recipient,
        channel,
        status,
        attempt_count,
        next_attempt_at,
        last_attempt_at,
        provider,
        provider_message_id,
        error_message,
        sent_at,
        acknowledged_at,
        created_at
      )
    `)
    .order('generated_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({
    reports: data ?? [],
    delivery: {
      configured: Boolean(getManagementReportDeliveryConfiguration()),
      provider: getManagementReportDeliveryConfiguration()?.provider ?? null,
    },
  }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } })
}
