import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getManagementReportDeliveryConfiguration } from '@/lib/management-report-delivery'

const reportTypes = new Set(['executive', 'office', 'partner', 'monthly', 'cumulative'])
const allowedRoles = new Set(['admin', 'ceo', 'director', 'subdirector'])

function validDate(value: unknown) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function monthOf(value: string) {
  return value.slice(0, 7)
}

async function requireReportAccess() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.error('[management-reports] profile lookup failed', { code: error.code })
    return { response: NextResponse.json({ error: 'No fue posible validar el perfil.' }, { status: 500 }) }
  }
  if (!profile) return { response: NextResponse.json({ error: 'Perfil no configurado.' }, { status: 403 }) }

  const role = String(profile.role ?? '').toLowerCase()
  if (!allowedRoles.has(role)) return { response: NextResponse.json({ error: 'Sin permisos' }, { status: 403 }) }

  return { supabase, user }
}

export async function POST(request: Request) {
  const access = await requireReportAccess()
  if ('response' in access) return access.response
  const { supabase, user } = access

  const body = await request.json().catch(() => null)
  const reportType = String(body?.reportType ?? '')
  if (!reportTypes.has(reportType) || !validDate(body?.periodStart) || !validDate(body?.periodEnd)) {
    return NextResponse.json({ error: 'Tipo o período de reporte inválido.' }, { status: 400 })
  }
  if (body.periodEnd < body.periodStart) {
    return NextResponse.json({ error: 'El fin del período no puede ser anterior al inicio.' }, { status: 400 })
  }
  if (reportType === 'monthly' && monthOf(body.periodStart) !== monthOf(body.periodEnd)) {
    return NextResponse.json({ error: 'El reporte mensual debe corresponder a un único período calendario.' }, { status: 400 })
  }
  if (!body?.snapshot || typeof body.snapshot !== 'object' || Array.isArray(body.snapshot)) {
    return NextResponse.json({ error: 'El snapshot debe ser un objeto.' }, { status: 400 })
  }
  if (JSON.stringify(body.snapshot).length > 2_000_000) {
    return NextResponse.json({ error: 'El snapshot supera el límite de 2 MB.' }, { status: 413 })
  }

  if (reportType === 'monthly') {
    const requestedMonth = monthOf(body.periodStart)
    const approvedPeriodEnd = body.snapshot?.dataLayers?.latestApprovedPeriodEnd
    if (typeof approvedPeriodEnd !== 'string' || monthOf(approvedPeriodEnd) !== requestedMonth) {
      return NextResponse.json(
        { error: 'El snapshot no corresponde al período aprobado solicitado. Actualice o seleccione un período con datos aprobados.' },
        { status: 409 },
      )
    }
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

  if (error) {
    console.error('[management-reports] report creation failed', { code: error.code })
    return NextResponse.json({ error: 'No fue posible generar el reporte.' }, { status: 500 })
  }
  return NextResponse.json({ report: data }, { status: 201 })
}

export async function GET() {
  const access = await requireReportAccess()
  if ('response' in access) return access.response
  const { supabase } = access

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

  if (error) {
    console.error('[management-reports] report listing failed', { code: error.code })
    return NextResponse.json({ error: 'No fue posible cargar los reportes.' }, { status: 500 })
  }

  const deliveryConfiguration = getManagementReportDeliveryConfiguration()
  return NextResponse.json({
    reports: data ?? [],
    delivery: {
      configured: Boolean(deliveryConfiguration),
      provider: deliveryConfiguration?.provider ?? null,
    },
  }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } })
}
