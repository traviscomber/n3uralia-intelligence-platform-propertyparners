import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { requireRoleAccess } from '@/lib/api-access'
import type { WeeklyReport as WeeklyReportRow } from '@/lib/types'
import {
  buildPpLearningSnapshot,
  summarizePpRecommendationFeedback,
  type PpRecommendationFeedbackEntry,
} from '@/lib/pp-learning'

export const dynamic = 'force-dynamic'

type KpiSnapshot = {
  period_date: string
  ventas_count: number
  comision_total: number
  conversion_rate: number
  velocidad_venta: number
  monthly_target: number
  director_id: string | null
}

type WeeklyReport = {
  week_start: string
  week_end: string
  sales_count: number
  commission_total: number
  conversion_rate: number
  target_progress: number
  velocity_change: number
  director_id: string | null
  status: 'on_track' | 'warning' | 'behind'
}

type LearningSnapshotRow = {
  report_key: string
  week_start: string
  week_end: string
  total_feedback: number
  useful_count: number
  ignored_count: number
  review_count: number
  adoption_rate: number
  summary: string
  top_recommendations: unknown
  audience_breakdown: unknown
  neighborhood_breakdown: unknown
  generated_at: string
}

function toDate(value: string) {
  return new Date(`${value}T00:00:00`)
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function getWeekBounds(input: Date) {
  const date = new Date(input)
  const day = date.getDay()
  const diffToMonday = (day + 6) % 7
  const start = new Date(date)
  start.setDate(date.getDate() - diffToMonday)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

type WeeklyBucket = WeeklyReport & {
  velocity_sum: number
  samples: number
}

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials')
  }

  return createSupabaseClient(supabaseUrl, supabaseKey)
}

function groupWeekly(rows: KpiSnapshot[]) {
  const buckets = new Map<string, WeeklyBucket>()

  for (const row of rows) {
    const date = toDate(row.period_date)
    const { start, end } = getWeekBounds(date)
    const key = formatDate(start)
    const current = buckets.get(key)
    const progress = row.monthly_target > 0 ? Math.round((row.ventas_count / row.monthly_target) * 100) : 0
    const status: WeeklyReport['status'] = progress >= 100 ? 'on_track' : progress >= 80 ? 'warning' : 'behind'

    if (!current) {
      buckets.set(key, {
        week_start: formatDate(start),
        week_end: formatDate(end),
        sales_count: row.ventas_count,
        commission_total: row.comision_total,
        conversion_rate: row.conversion_rate,
        target_progress: progress,
        velocity_change: 0,
        director_id: null,
        status,
        velocity_sum: row.velocidad_venta || 0,
        samples: 1,
      })
      continue
    }

    current.sales_count += row.ventas_count
    current.commission_total += row.comision_total
    current.conversion_rate = Number(((current.conversion_rate + row.conversion_rate) / 2).toFixed(1))
    current.target_progress = Number(((current.target_progress + progress) / 2).toFixed(0))
    current.velocity_sum += row.velocidad_venta || 0
    current.samples += 1
    current.velocity_change = Number((current.velocity_sum / current.samples).toFixed(1))
    current.status = current.target_progress >= 100 ? 'on_track' : current.target_progress >= 80 ? 'warning' : 'behind'
  }

  return [...buckets.values()]
    .map(({ velocity_sum, samples, ...report }) => report)
    .sort((a, b) => b.week_start.localeCompare(a.week_start))
}

function groupDirectors(rows: KpiSnapshot[]) {
  const byDirector = new Map<string, KpiSnapshot[]>()

  for (const row of rows) {
    if (!row.director_id) continue
    const list = byDirector.get(row.director_id) || []
    list.push(row)
    byDirector.set(row.director_id, list)
  }

  return [...byDirector.entries()]
    .map(([director_id, directorRows]) => {
      const latest = directorRows[0]
      const previous = directorRows[1]
      const sales_count = directorRows.reduce((sum, row) => sum + row.ventas_count, 0)
      const commission_total = directorRows.reduce((sum, row) => sum + row.comision_total, 0)
      const conversion_rate = Number(
        (directorRows.reduce((sum, row) => sum + row.conversion_rate, 0) / directorRows.length).toFixed(1),
      )
      const target_progress = latest.monthly_target > 0 ? Math.round((latest.ventas_count / latest.monthly_target) * 100) : 0
      const velocity_change = Number(((latest.velocidad_venta || 0) - (previous?.velocidad_venta || 0)).toFixed(1))
      const status: WeeklyReport['status'] = target_progress >= 100 ? 'on_track' : target_progress >= 80 ? 'warning' : 'behind'

      return {
        week_start: latest.period_date,
        week_end: latest.period_date,
        sales_count,
        commission_total,
        conversion_rate,
        target_progress,
        velocity_change,
        director_id,
        status,
      }
    })
    .sort((a, b) => b.sales_count - a.sales_count)
}

function buildReportKey(scope: 'weekly_summary' | 'director', weekStart: string, directorId: string | null = null) {
  return scope === 'director' ? `${scope}:${directorId || 'unknown'}:${weekStart}` : `${scope}:${weekStart}`
}

async function persistWeeklyReports(weekly: WeeklyReport[], directors: WeeklyReport[], generatedAt: string) {
  const supabase = getServiceClient()
  const rows = [
    ...weekly.map((report) => ({
      report_key: buildReportKey('weekly_summary', report.week_start),
      report_scope: 'weekly_summary',
      week_start: report.week_start,
      week_end: report.week_end,
      director_id: null,
      sales_count: report.sales_count,
      commission_total: report.commission_total,
      conversion_rate: report.conversion_rate,
      target_progress: report.target_progress,
      velocity_change: report.velocity_change,
      status: report.status,
      content: report,
      generated_at: generatedAt,
    })),
    ...directors.map((report) => ({
      report_key: buildReportKey('director', report.week_start, report.director_id),
      report_scope: 'director',
      week_start: report.week_start,
      week_end: report.week_end,
      director_id: report.director_id,
      sales_count: report.sales_count,
      commission_total: report.commission_total,
      conversion_rate: report.conversion_rate,
      target_progress: report.target_progress,
      velocity_change: report.velocity_change,
      status: report.status,
      content: report,
      generated_at: generatedAt,
    })),
  ]

  const { error: upsertError } = await supabase
    .from('weekly_reports')
    .upsert(rows, { onConflict: 'report_key' })

  if (upsertError) throw upsertError

  const { data, error } = await supabase
    .from('weekly_reports')
    .select('*')
    .order('generated_at', { ascending: false })
    .limit(12)

  if (error) throw error

  return (data || []) as WeeklyReportRow[]
}

async function persistLearningSnapshot(generatedAt: string) {
  const supabase = getServiceClient()
  const now = new Date()
  const { start, end } = getWeekBounds(now)

  const { data: feedbackRows, error: feedbackError } = await supabase
    .from('pp_recommendation_feedback')
    .select('id, recommendation_id, title, audience, neighborhood, area, feedback_type, responsible, base_score, notes, created_at')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .order('created_at', { ascending: false })

  if (feedbackError) throw feedbackError

  const feedbackEntries = (feedbackRows || []) as PpRecommendationFeedbackEntry[]
  const summary = summarizePpRecommendationFeedback(feedbackEntries)
  const snapshot = buildPpLearningSnapshot(summary, formatDate(start), formatDate(end), generatedAt)

  const { error: upsertError } = await supabase.from('pp_ai_learning_snapshots').upsert(
    {
      report_key: snapshot.report_key,
      week_start: snapshot.week_start,
      week_end: snapshot.week_end,
      total_feedback: snapshot.total_feedback,
      useful_count: snapshot.useful_count,
      ignored_count: snapshot.ignored_count,
      review_count: snapshot.review_count,
      adoption_rate: snapshot.adoption_rate,
      summary: snapshot.summary,
      top_recommendations: snapshot.top_recommendations,
      audience_breakdown: snapshot.audience_breakdown,
      neighborhood_breakdown: snapshot.neighborhood_breakdown,
      generated_at: snapshot.generated_at,
    },
    { onConflict: 'report_key' },
  )

  if (upsertError) throw upsertError

  const { data, error } = await supabase
    .from('pp_ai_learning_snapshots')
    .select('*')
    .order('generated_at', { ascending: false })
    .limit(6)

  if (error) throw error

  return (data || []) as LearningSnapshotRow[]
}

async function buildWeeklyResponse(persist: boolean) {
  const access = await requireRoleAccess(['admin', 'ceo', 'director'])
  if (!access.allowed) return NextResponse.json({ error: 'Acceso restringido.' }, { status: access.status })
  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('kpi_snapshots')
      .select('period_date, ventas_count, comision_total, conversion_rate, velocidad_venta, monthly_target, director_id')
      .order('period_date', { ascending: false })
      .limit(24)

    if (error) throw error

    const rows = (data || []) as KpiSnapshot[]
    const generatedAt = new Date().toISOString()
    const reports = groupWeekly(rows)
    const directors = groupDirectors(rows)
    const [history, learning] = persist
      ? await Promise.all([
          persistWeeklyReports(reports, directors, generatedAt),
          persistLearningSnapshot(generatedAt),
        ])
      : await Promise.all([
          supabase.from('weekly_reports').select('*').order('generated_at', { ascending: false }).limit(12),
          supabase.from('pp_ai_learning_snapshots').select('*').order('generated_at', { ascending: false }).limit(6),
        ]).then(([historyResult, learningResult]) => {
          if (historyResult.error) throw historyResult.error
          if (learningResult.error) throw learningResult.error
          return [
            (historyResult.data || []) as WeeklyReportRow[],
            (learningResult.data || []) as LearningSnapshotRow[],
          ] as const
        })

    return NextResponse.json({
      reports,
      directors,
      history,
      learning,
      generatedAt,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'No pudimos generar los reportes semanales.' },
      { status: 500 },
    )
  }
}

// Reading reports is side-effect free.
export async function GET() {
  return buildWeeklyResponse(false)
}

// Generation and persistence are restricted to executive roles.
export async function POST() {
  const access = await requireRoleAccess(['admin', 'ceo'])
  if (!access.allowed) return NextResponse.json({ error: 'Acceso restringido.' }, { status: access.status })
  return buildWeeklyResponse(true)
}
