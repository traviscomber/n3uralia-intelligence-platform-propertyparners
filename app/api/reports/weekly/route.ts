import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('kpi_snapshots')
      .select('period_date, ventas_count, comision_total, conversion_rate, velocidad_venta, monthly_target, director_id')
      .order('period_date', { ascending: false })
      .limit(24)

    if (error) throw error

    const rows = (data || []) as KpiSnapshot[]
    return NextResponse.json({
      reports: groupWeekly(rows),
      directors: groupDirectors(rows),
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'No pudimos generar los reportes semanales.' },
      { status: 500 },
    )
  }
}
