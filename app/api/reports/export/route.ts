import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireRoleAccess } from '@/lib/api-access'

export const dynamic = 'force-dynamic'

type ExportDataset = 'ai_reports' | 'weekly_reports' | 'profiles'
type ExportFormat = 'csv' | 'json'

type AiReportRow = {
  id: string
  report_type: string
  title: string
  summary: string | null
  period_date: string | null
  generated_by: string | null
  created_at: string
}

type WeeklyReportRow = {
  id: number
  report_key: string
  report_scope: string
  week_start: string
  week_end: string
  director_id: string | null
  sales_count: number
  commission_total: number
  conversion_rate: number
  target_progress: number
  velocity_change: number
  status: string
  generated_at: string
}

type ProfileRow = {
  id: string
  full_name: string | null
  role: string
  team: string | null
  avatar_url: string | null
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

function toCsv(headers: string[], rows: Array<Record<string, unknown>>) {
  if (!rows.length) {
    return `${headers.join(',')}\n`
  }

  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ]

  return `${lines.join('\n')}\n`
}

function getFormat(value: string | null): ExportFormat {
  return value?.toLowerCase() === 'json' ? 'json' : 'csv'
}

function getDataset(value: string | null): ExportDataset {
  if (value === 'weekly_reports' || value === 'profiles') return value
  return 'ai_reports'
}

function parseLimit(value: string | null, fallback = 100) {
  const parsed = Number.parseInt(value || String(fallback), 10)
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 200) : fallback
}

function parseIsoDate(value: string | null) {
  if (!value) return null
  const normalized = new Date(value)
  return Number.isNaN(normalized.getTime()) ? null : normalized.toISOString().slice(0, 10)
}

export async function GET(req: NextRequest) {
  const access = await requireRoleAccess(['admin', 'ceo', 'director'])
  if (!access.allowed) return NextResponse.json({ error: 'Acceso restringido.' }, { status: access.status })
  try {
    const supabase = getServiceClient()
    const { searchParams } = new URL(req.url)
    const dataset = getDataset(searchParams.get('dataset'))
    const format = getFormat(searchParams.get('format'))
    const limit = parseLimit(searchParams.get('limit'))
    const from = parseIsoDate(searchParams.get('from'))
    const to = parseIsoDate(searchParams.get('to'))

    if (dataset === 'profiles') {
      const role = searchParams.get('role')
      const team = searchParams.get('team')

      let query = supabase
        .from('profiles')
        .select('id, full_name, role, team, avatar_url, created_at')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (role) query = query.eq('role', role)
      if (team) query = query.ilike('team', `%${team}%`)

      const { data, error } = await query
      if (error) throw error

      const rows = (data || []) as ProfileRow[]
      const payload = {
        dataset,
        filters: {
          role,
          team,
          limit,
          from,
          to,
        },
        records: rows,
        count: rows.length,
        exportedAt: new Date().toISOString(),
      }

      if (format === 'json') {
        return NextResponse.json(payload)
      }

      const csv = toCsv(
        ['id', 'full_name', 'role', 'team', 'avatar_url', 'created_at'],
        rows.map((row) => ({
          id: row.id,
          full_name: row.full_name || '',
          role: row.role,
          team: row.team || '',
          avatar_url: row.avatar_url || '',
          created_at: row.created_at,
        })),
      )

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="profiles_${role || 'all'}.csv"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      })
    }

    if (dataset === 'weekly_reports') {
      const reportScope = searchParams.get('report_scope')
      const directorId = searchParams.get('director_id')
      const weekStart = searchParams.get('week_start')
      const reportType = searchParams.get('type')

      let query = supabase
        .from('weekly_reports')
        .select('id, report_key, report_scope, week_start, week_end, director_id, sales_count, commission_total, conversion_rate, target_progress, velocity_change, status, generated_at')
        .order('generated_at', { ascending: false })
        .limit(limit)

      if (reportScope) query = query.eq('report_scope', reportScope)
      if (directorId) query = query.eq('director_id', directorId)
      if (weekStart) query = query.eq('week_start', weekStart)
      if (reportType) query = query.eq('report_key', reportType)
      if (from) query = query.gte('generated_at', `${from}T00:00:00.000Z`)
      if (to) query = query.lte('generated_at', `${to}T23:59:59.999Z`)

      const { data, error } = await query
      if (error) throw error

      const rows = (data || []) as WeeklyReportRow[]
      const payload = {
        dataset,
        filters: {
          report_scope: reportScope,
          director_id: directorId,
          week_start: weekStart,
          type: reportType,
          limit,
          from,
          to,
        },
        records: rows,
        count: rows.length,
        exportedAt: new Date().toISOString(),
      }

      if (format === 'json') {
        return NextResponse.json(payload)
      }

      const csv = toCsv(
        ['id', 'report_key', 'report_scope', 'week_start', 'week_end', 'director_id', 'sales_count', 'commission_total', 'conversion_rate', 'target_progress', 'velocity_change', 'status', 'generated_at'],
        rows.map((row) => ({
          ...row,
          director_id: row.director_id || '',
        })),
      )

      const fileName = [
        'weekly_reports',
        reportScope || 'all',
        directorId || 'all',
        weekStart || 'all',
        reportType || 'all',
      ].join('_')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${fileName}.csv"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      })
    }

    const reportType = searchParams.get('type')

    let query = supabase
      .from('ai_reports')
      .select('id, report_type, title, summary, period_date, generated_by, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (reportType) query = query.eq('report_type', reportType)
    if (from) query = query.gte('created_at', `${from}T00:00:00.000Z`)
    if (to) query = query.lte('created_at', `${to}T23:59:59.999Z`)

    const { data, error } = await query
    if (error) throw error

    const rows = (data || []) as AiReportRow[]
    const payload = {
      dataset,
      filters: {
        type: reportType,
        limit,
        from,
        to,
      },
      records: rows,
      count: rows.length,
      exportedAt: new Date().toISOString(),
    }

    if (format === 'json') {
      return NextResponse.json(payload)
    }

    const csv = toCsv(
      ['id', 'report_type', 'title', 'summary', 'period_date', 'generated_by', 'created_at'],
      rows.map((row) => ({
        ...row,
        summary: row.summary || '',
        period_date: row.period_date || '',
        generated_by: row.generated_by || '',
      })),
    )
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
