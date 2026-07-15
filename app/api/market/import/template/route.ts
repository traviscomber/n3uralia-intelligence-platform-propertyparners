import { NextRequest, NextResponse } from 'next/server'
import { benchmarkImportTemplateRows, marketImportTemplateRows } from '@/lib/market-import'

export const dynamic = 'force-dynamic'

function csvEscape(value: unknown) {
  const text = value == null ? '' : String(value)
  if (/["\n,]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function getKind(request: NextRequest) {
  const kind = request.nextUrl.searchParams.get('kind')
  return kind === 'benchmark_data' ? 'benchmark_data' : 'market_data'
}

export async function GET(request: NextRequest) {
  const kind = getKind(request)
  const rows = kind === 'benchmark_data' ? benchmarkImportTemplateRows() : marketImportTemplateRows()
  const headers = Object.keys(rows[0] || {})
  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header as keyof typeof row])).join(',')),
  ].join('\n') + '\n'

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${kind === 'benchmark_data' ? 'benchmark_import_template' : 'market_intelligence_template'}.csv"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}

