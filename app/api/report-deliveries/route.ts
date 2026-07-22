import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { requireRoleAccess } from '@/lib/api-access'

export const dynamic = 'force-dynamic'

type ReportDeliveryRow = {
  id: number
  report_type: string
  report_id: number | null
  channel: 'email' | 'whatsapp_web' | 'webhook'
  recipient: string | null
  delivery_url: string | null
  status: 'queued' | 'sent' | 'failed' | 'escalated'
  subject: string | null
  message: string | null
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
  byChannel: Array<{ channel: ReportDeliveryRow['channel']; count: number }>
  byStatus: Array<{ status: ReportDeliveryRow['status']; count: number }>
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials')
  }

  return createSupabaseClient(supabaseUrl, supabaseKey)
}

function parseList(value: string | null) {
  return value ? value.split(',').map((entry) => entry.trim()).filter(Boolean) : []
}

export async function GET(request: NextRequest) {
  const access = await requireRoleAccess(['admin', 'ceo', 'director'])
  if (!access.allowed) return NextResponse.json({ error: 'Acceso restringido.' }, { status: access.status })
  try {
    const supabase = getSupabaseClient()
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get('limit') || '25', 10)
    const reportTypes = parseList(searchParams.get('report_type'))
    const channels = parseList(searchParams.get('channel'))
    const statuses = parseList(searchParams.get('status'))

    let query = supabase
      .from('report_deliveries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 25)

    if (reportTypes.length) query = query.in('report_type', reportTypes)
    if (channels.length) query = query.in('channel', channels)
    if (statuses.length) query = query.in('status', statuses)

    const [deliveriesRes, summaryRes] = await Promise.all([
      query,
      supabase.from('report_deliveries').select('status, channel, sent_at, created_at, report_type').order('created_at', { ascending: false }).limit(50),
    ])

    if (deliveriesRes.error) throw deliveriesRes.error
    if (summaryRes.error) throw summaryRes.error

    const deliveries = (deliveriesRes.data || []) as ReportDeliveryRow[]
    const summarySource = (summaryRes.data || []) as Array<Pick<ReportDeliveryRow, 'status' | 'channel' | 'sent_at' | 'created_at' | 'report_type'>>
    const sentCount = summarySource.filter((row) => row.status === 'sent' || row.status === 'escalated').length
    const escalatedCount = summarySource.filter((row) => row.status === 'escalated').length
    const latestCreatedAt = deliveries[0]?.created_at || null

    const byReportType = Object.values(
      deliveries.reduce<Record<string, { report_type: string; count: number }>>((acc, row) => {
        const key = row.report_type || 'unknown'
        if (!acc[key]) {
          acc[key] = { report_type: key, count: 0 }
        }
        acc[key].count += 1
        return acc
      }, {}),
    ).sort((a, b) => b.count - a.count)

    const byChannel = ['email', 'whatsapp_web', 'webhook'].map((channel) => ({
      channel: channel as ReportDeliveryRow['channel'],
      count: summarySource.filter((row) => row.channel === channel).length,
    }))

    const byStatus = ['sent', 'failed', 'queued', 'escalated'].map((status) => ({
      status: status as ReportDeliveryRow['status'],
      count: summarySource.filter((row) => row.status === status).length,
    }))

    const summary: DeliverySummary = {
      total: summarySource.length,
      sent: sentCount,
      failed: summarySource.filter((row) => row.status === 'failed').length,
      queued: summarySource.filter((row) => row.status === 'queued').length,
      escalated: escalatedCount,
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
      deliveries,
      summary,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'No pudimos cargar la telemetria de entregas.' },
      { status: 500 },
    )
  }
}
