import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { requireRoleAccess } from '@/lib/api-access'

export const dynamic = 'force-dynamic'

type CanonicalDistributionRow = {
  id: string
  report_run_id: string
  channel: string
  recipient: string
  status: string
  external_reference: string | null
  error_message: string | null
  sent_at: string | null
  acknowledged_at: string | null
  created_at: string
}

type ReportRunRow = {
  id: string
  report_type: string
}

type DeliveryRow = {
  id: string
  report_type: string
  report_id: string
  channel: string
  recipient: string
  delivery_url: null
  status: 'queued' | 'sent' | 'failed'
  subject: null
  message: null
  provider_response: Record<string, unknown> | null
  sent_at: string | null
  created_at: string
}

type DeliverySummary = {
  total: number
  sent: number
  failed: number
  queued: number
  escalated: number
  email: number
  whatsappWeb: number
  webhook: number
  recentSuccessRate: number
  lastSentAt: string | null
  latestCreatedAt: string | null
  byReportType: Array<{ report_type: string; count: number }>
  byChannel: Array<{ channel: string; count: number }>
  byStatus: Array<{ status: 'sent' | 'failed' | 'queued' | 'escalated'; count: number }>
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) throw new Error('MISSING_SUPABASE_CREDENTIALS')

  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function parseList(value: string | null) {
  return value ? value.split(',').map((entry) => entry.trim()).filter(Boolean) : []
}

function normalizedStatus(status: string): DeliveryRow['status'] {
  if (status === 'failed') return 'failed'
  if (status === 'sent' || status === 'acknowledged') return 'sent'
  return 'queued'
}

export async function GET(request: NextRequest) {
  const access = await requireRoleAccess(['admin', 'ceo', 'director'])
  if (!access.allowed) return NextResponse.json({ error: 'Acceso restringido.' }, { status: access.status })

  try {
    const supabase = getSupabaseClient()
    const { searchParams } = new URL(request.url)
    const requestedLimit = Number.parseInt(searchParams.get('limit') || '25', 10)
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 25
    const reportTypes = parseList(searchParams.get('report_type'))
    const channels = parseList(searchParams.get('channel'))
    const statuses = parseList(searchParams.get('status'))

    let query = supabase
      .from('management_report_distributions')
      .select('id,report_run_id,channel,recipient,status,external_reference,error_message,sent_at,acknowledged_at,created_at')
      .order('created_at', { ascending: false })
      .limit(Math.max(limit, 50))

    if (channels.length) query = query.in('channel', channels)

    const distributionsRes = await query
    if (distributionsRes.error) throw distributionsRes.error

    const distributions = (distributionsRes.data || []) as CanonicalDistributionRow[]
    const reportIds = [...new Set(distributions.map((row) => row.report_run_id).filter(Boolean))]
    const reportsRes = reportIds.length
      ? await supabase.from('management_report_runs').select('id,report_type').in('id', reportIds)
      : { data: [], error: null }

    if (reportsRes.error) throw reportsRes.error

    const reportTypeById = new Map(
      ((reportsRes.data || []) as ReportRunRow[]).map((row) => [row.id, row.report_type]),
    )

    const canonical = distributions.map<DeliveryRow>((row) => ({
      id: row.id,
      report_type: reportTypeById.get(row.report_run_id) || 'unknown',
      report_id: row.report_run_id,
      channel: row.channel,
      recipient: row.recipient,
      delivery_url: null,
      status: normalizedStatus(row.status),
      subject: null,
      message: null,
      provider_response: row.external_reference || row.error_message
        ? { externalReference: row.external_reference, error: row.error_message }
        : null,
      sent_at: row.sent_at || row.acknowledged_at,
      created_at: row.created_at,
    }))

    const filtered = canonical
      .filter((row) => !reportTypes.length || reportTypes.includes(row.report_type))
      .filter((row) => !statuses.length || statuses.includes(row.status))
      .slice(0, limit)

    const summarySource = canonical.slice(0, 50)
    const sentCount = summarySource.filter((row) => row.status === 'sent').length
    const latestCreatedAt = filtered[0]?.created_at || null

    const byReportType = Object.values(
      filtered.reduce<Record<string, { report_type: string; count: number }>>((acc, row) => {
        const key = row.report_type || 'unknown'
        if (!acc[key]) acc[key] = { report_type: key, count: 0 }
        acc[key].count += 1
        return acc
      }, {}),
    ).sort((a, b) => b.count - a.count)

    const distinctChannels = [...new Set(['email', 'whatsapp_web', 'webhook', ...summarySource.map((row) => row.channel)])]
    const byChannel = distinctChannels.map((channel) => ({
      channel,
      count: summarySource.filter((row) => row.channel === channel).length,
    }))

    const byStatus = (['sent', 'failed', 'queued', 'escalated'] as const).map((status) => ({
      status,
      count: status === 'escalated' ? 0 : summarySource.filter((row) => row.status === status).length,
    }))

    const summary: DeliverySummary = {
      total: summarySource.length,
      sent: sentCount,
      failed: summarySource.filter((row) => row.status === 'failed').length,
      queued: summarySource.filter((row) => row.status === 'queued').length,
      escalated: 0,
      email: summarySource.filter((row) => row.channel === 'email').length,
      whatsappWeb: summarySource.filter((row) => row.channel === 'whatsapp_web').length,
      webhook: summarySource.filter((row) => row.channel === 'webhook').length,
      recentSuccessRate: summarySource.length ? Math.round((sentCount / summarySource.length) * 100) : 0,
      lastSentAt: summarySource.find((row) => row.sent_at)?.sent_at || null,
      latestCreatedAt,
      byReportType,
      byChannel,
      byStatus,
    }

    return NextResponse.json({
      deliveries: filtered,
      summary,
      source: 'management_report_distributions',
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : 'UNKNOWN'
    console.error('REPORT_DELIVERIES_LOAD_FAILED', { code })
    return NextResponse.json(
      { error: 'No pudimos cargar la telemetría de entregas.' },
      { status: 500 },
    )
  }
}
