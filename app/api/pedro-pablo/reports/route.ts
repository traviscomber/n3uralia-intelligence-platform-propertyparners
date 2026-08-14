import { NextRequest, NextResponse } from 'next/server'

type DeliverySummary = {
  total: number
  sent: number
  failed: number
  queued: number
  escalated: number
  recentSuccessRate: number
  lastSentAt: string | null
  latestCreatedAt: string | null
  byReportType: Array<{ report_type: string; count: number }>
}

type DeliveryPayload = {
  summary?: DeliverySummary
}

export async function GET(request: NextRequest) {
  const cookie = request.headers.get('cookie') ?? ''
  const response = await fetch(new URL('/api/report-deliveries?limit=25', request.url), {
    headers: { cookie },
    cache: 'no-store',
  })

  if (response.status === 401) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  if (response.status === 403) {
    return NextResponse.json({
      available: false,
      reason: 'role_scope',
      summary: null,
      generatedAt: new Date().toISOString(),
      writesPerformed: 0,
    }, { headers: { 'Cache-Control': 'no-store' } })
  }

  if (!response.ok) {
    return NextResponse.json({
      available: false,
      reason: 'source_unavailable',
      summary: null,
      generatedAt: new Date().toISOString(),
      writesPerformed: 0,
    }, { headers: { 'Cache-Control': 'no-store' } })
  }

  const payload = await response.json() as DeliveryPayload
  const summary = payload.summary
  if (!summary) {
    return NextResponse.json({
      available: false,
      reason: 'source_unavailable',
      summary: null,
      generatedAt: new Date().toISOString(),
      writesPerformed: 0,
    }, { headers: { 'Cache-Control': 'no-store' } })
  }

  return NextResponse.json({
    available: true,
    reason: null,
    summary: {
      total: summary.total,
      sent: summary.sent,
      failed: summary.failed,
      queued: summary.queued,
      escalated: summary.escalated,
      recentSuccessRate: summary.recentSuccessRate,
      lastSentAt: summary.lastSentAt,
      latestCreatedAt: summary.latestCreatedAt,
      byReportType: summary.byReportType.slice(0, 8),
    },
    generatedAt: new Date().toISOString(),
    writesPerformed: 0,
  }, { headers: { 'Cache-Control': 'no-store' } })
}