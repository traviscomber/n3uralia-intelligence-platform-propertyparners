import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const LEADER_ROLES = new Set(['admin', 'ceo', 'director', 'subdirector'])
const CHANNELS = new Set(['manual', 'email', 'whatsapp_web', 'webhook'])
const DISTRIBUTION_STATUSES = new Set(['pending', 'sent', 'failed'])

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const [{ data: report, error: reportError }, { data: distributions, error: distributionError }] = await Promise.all([
    supabase.from('management_report_runs').select('*').eq('id', id).maybeSingle(),
    supabase.from('management_report_distributions').select('*').eq('report_run_id', id).order('created_at'),
  ])

  if (reportError || distributionError) {
    console.error('[management-report-detail] lookup failed', {
      reportCode: reportError?.code ?? null,
      distributionCode: distributionError?.code ?? null,
      reportId: id,
    })
    return NextResponse.json({ error: 'No fue posible cargar el reporte.' }, { status: 500 })
  }
  if (!report) return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })

  return NextResponse.json({ report, distributions: distributions ?? [] })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profileError) {
    console.error('[management-report-detail] profile lookup failed', { code: profileError.code })
    return NextResponse.json({ error: 'No fue posible validar el perfil.' }, { status: 500 })
  }
  if (!LEADER_ROLES.has(String(profile?.role ?? '').toLowerCase())) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json().catch(() => null)
  const recipients = Array.isArray(body?.recipients)
    ? [...new Set(body.recipients.map(String).map((value: string) => value.trim()).filter(Boolean))].slice(0, 200)
    : []
  if (!recipients.length) return NextResponse.json({ error: 'Debe indicar al menos un destinatario.' }, { status: 400 })

  const channel = String(body?.channel ?? 'manual')
  const status = String(body?.status ?? 'pending')
  if (!CHANNELS.has(channel) || !DISTRIBUTION_STATUSES.has(status)) {
    return NextResponse.json({ error: 'Canal o estado de distribución inválido.' }, { status: 400 })
  }

  const rows = recipients.map((recipient: string) => ({
    report_run_id: id,
    recipient,
    channel,
    status,
    external_reference: body?.externalReference ?? null,
    sent_at: status === 'sent' ? new Date().toISOString() : null,
  }))

  const { data, error } = await supabase
    .from('management_report_distributions')
    .upsert(rows, { onConflict: 'report_run_id,recipient,channel' })
    .select('*')

  if (error) {
    console.error('[management-report-detail] distribution update failed', { code: error.code, reportId: id })
    return NextResponse.json({ error: 'No fue posible actualizar la distribución del reporte.' }, { status: 500 })
  }

  if (status === 'sent') {
    const { error: reportUpdateError } = await supabase
      .from('management_report_runs')
      .update({
        status: 'distributed',
        distributed_at: new Date().toISOString(),
        distribution_reference: body?.externalReference ?? 'manual',
      })
      .eq('id', id)

    if (reportUpdateError) {
      console.error('[management-report-detail] report status update failed', { code: reportUpdateError.code, reportId: id })
      return NextResponse.json({ error: 'La distribución fue registrada, pero no fue posible actualizar el estado del reporte.' }, { status: 500 })
    }
  }

  return NextResponse.json({ distributions: data ?? [] })
}
