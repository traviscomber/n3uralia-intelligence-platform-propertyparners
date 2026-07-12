import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { loadDirectorReportBundle } from '@/lib/director-reports'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type ExportFormat = 'csv' | 'json'

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials')
  }

  return createClient(supabaseUrl, supabaseKey)
}

function csvEscape(value: unknown) {
  const text = value == null ? '' : String(value)
  if (/["\n,]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

function toCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) {
    return 'empty\n'
  }

  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ]

  return `${lines.join('\n')}\n`
}

function getFormat(value: string | null): ExportFormat {
  return value?.toLowerCase() === 'json' ? 'json' : 'csv'
}

export async function GET(request: NextRequest, context: { params: Promise<{ directorId: string }> }) {
  try {
    const { directorId: rawDirectorId } = await context.params
    const directorId = decodeURIComponent(rawDirectorId)
    const url = new URL(request.url)
    const weekStart = url.searchParams.get('week_start')
    const format = getFormat(url.searchParams.get('format'))
    const supabase = getServiceClient()
    const bundle = await loadDirectorReportBundle(supabase, directorId)

    const selectedReports = weekStart
      ? bundle.reports.filter((report) => report.week_start === weekStart)
      : bundle.reports

    const selectedReport = weekStart
      ? selectedReports[0] || bundle.latestReport
      : bundle.latestReport

    if (format === 'json') {
      return NextResponse.json({
        directorId,
        selectedWeekStart: weekStart || null,
        latestReport: selectedReport,
        reports: selectedReports,
        kpis: bundle.kpis,
        metrics: bundle.metrics,
        exportedAt: new Date().toISOString(),
      })
    }

    const rows = selectedReports.map((report) => ({
      report_key: report.report_key,
      week_start: report.week_start,
      week_end: report.week_end,
      director_id: report.director_id,
      sales_count: report.sales_count,
      commission_total: report.commission_total,
      conversion_rate: report.conversion_rate,
      target_progress: report.target_progress,
      velocity_change: report.velocity_change,
      status: report.status,
      generated_at: report.generated_at,
    }))
    const csv = toCsv(rows)
    const suffix = weekStart ? `_${weekStart}` : ''

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="reporte-director-${directorId}${suffix}.csv"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'No pudimos exportar el reporte del director.' },
      { status: 500 },
    )
  }
}
