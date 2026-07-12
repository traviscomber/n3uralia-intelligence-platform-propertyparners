import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

type AiReportRow = {
  id: string
  report_type: string
  title: string
  summary: string | null
  period_date: string | null
  generated_by: string | null
  created_at: string
}

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

function toCsv(rows: AiReportRow[]) {
  const headers = ['id', 'report_type', 'title', 'summary', 'period_date', 'generated_by', 'created_at']
  const lines = [
    headers.join(','),
    ...rows.map((row) => [
      row.id,
      row.report_type,
      row.title,
      row.summary || '',
      row.period_date || '',
      row.generated_by || '',
      row.created_at,
    ].map(csvEscape).join(',')),
  ]
  return `${lines.join('\n')}\n`
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceClient()
    const { searchParams } = new URL(req.url)
    const reportType = searchParams.get('type')
    const format = (searchParams.get('format') || 'csv').toLowerCase()
    const limit = Number.parseInt(searchParams.get('limit') || '100', 10)

    let query = supabase
      .from('ai_reports')
      .select('id, report_type, title, summary, period_date, generated_by, created_at')
      .order('created_at', { ascending: false })
      .limit(Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 100)

    if (reportType) query = query.eq('report_type', reportType)

    const { data, error } = await query
    if (error) throw error

    const rows = (data || []) as AiReportRow[]

    if (format === 'json') {
      return NextResponse.json({
        reports: rows,
        count: rows.length,
        exportedAt: new Date().toISOString(),
      })
    }

    const csv = toCsv(rows)
    const fileNameBase = reportType ? `ai_reports_${reportType}` : 'ai_reports_all'

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileNameBase}.csv"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'No pudimos exportar los reportes.' },
      { status: 500 },
    )
  }
}
