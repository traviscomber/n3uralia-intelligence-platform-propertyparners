import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

function asError(error: unknown, fallback: string) {
  if (error instanceof Error) return error
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
    return new Error((error as { message: string }).message)
  }
  return new Error(fallback)
}

function csvEscape(value: unknown) {
  if (value === null || value === undefined) return '""'
  const text = String(value).replace(/"/g, '""')
  return `"${text}"`
}

function toCsv(rows: Record<string, unknown>[]) {
  const headers = ['created_at', 'neighborhood', 'estimated_uf', 'publication_price_uf', 'closing_price_uf', 'confidence', 'quote_key']
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n')
}

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseClient()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      return NextResponse.json({ error: 'Debes iniciar sesion para exportar.' }, { status: 401 })
    }

    const url = new URL(request.url)
    const format = (url.searchParams.get('format') || 'csv').toLowerCase()
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || '50'), 1), 500)
    const neighborhood = url.searchParams.get('neighborhood')

    let query = supabase
      .from('valuation_quotes')
      .select('quote_key, neighborhood, estimated_uf, publication_price_uf, closing_price_uf, confidence, created_at, market_velocity, market_absorption, comparable_properties')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (neighborhood && neighborhood !== 'all') {
      query = query.eq('neighborhood', neighborhood)
    }

    const { data, error } = await query

    if (error) throw error

    const rows = (data || []) as Record<string, unknown>[]

    if (format === 'xlsx') {
      const workbook = XLSX.utils.book_new()
      const sheet = XLSX.utils.json_to_sheet(rows)
      XLSX.utils.book_append_sheet(workbook, sheet, 'Cotizaciones')
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="valuation_quotes_${new Date().toISOString().slice(0, 10)}.xlsx"`,
        },
      })
    }

    const csv = toCsv(rows)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="valuation_quotes_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: asError(error, 'No pudimos exportar el historial de cotizaciones.').message },
      { status: 500 },
    )
  }
}
