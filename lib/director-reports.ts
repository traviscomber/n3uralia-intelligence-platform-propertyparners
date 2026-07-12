import type { SupabaseClient } from '@supabase/supabase-js'

export type DirectorReportRow = {
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
  status: 'on_track' | 'warning' | 'behind' | string
  content: Record<string, unknown>
  generated_at: string
  created_at: string
}

export type DirectorKpiSnapshot = {
  period_date: string
  ventas_count: number
  comision_total: number
  conversion_rate: number
  velocidad_venta: number | null
  monthly_target: number | null
  director_id: string | null
}

export type DirectorReportBundle = {
  directorId: string
  reports: DirectorReportRow[]
  latestReport: DirectorReportRow | null
  kpis: DirectorKpiSnapshot[]
  metrics: {
    totalSales: number
    totalCommission: number
    avgConversion: number
    targetProgress: number
    reportCount: number
    velocityChange: number
    latestStatus: string
  }
}

export async function loadDirectorReportBundle(supabase: SupabaseClient, directorId: string): Promise<DirectorReportBundle> {
  const [reportsRes, kpisRes] = await Promise.all([
    supabase
      .from('weekly_reports')
      .select('*')
      .eq('report_scope', 'director')
      .eq('director_id', directorId)
      .order('generated_at', { ascending: false })
      .limit(12),
    supabase
      .from('kpi_snapshots')
      .select('period_date, ventas_count, comision_total, conversion_rate, velocidad_venta, monthly_target, director_id')
      .eq('director_id', directorId)
      .order('period_date', { ascending: false })
      .limit(12),
  ])

  if (reportsRes.error) throw reportsRes.error
  if (kpisRes.error) throw kpisRes.error

  const reports = (reportsRes.data || []) as DirectorReportRow[]
  const kpis = (kpisRes.data || []) as DirectorKpiSnapshot[]
  const latestReport = reports[0] || null
  const totalSales = reports.reduce((sum, report) => sum + report.sales_count, 0)
  const totalCommission = reports.reduce((sum, report) => sum + Number(report.commission_total || 0), 0)
  const avgConversion = reports.length
    ? Number((reports.reduce((sum, report) => sum + Number(report.conversion_rate || 0), 0) / reports.length).toFixed(1))
    : 0
  const velocityChange = latestReport?.velocity_change || 0

  return {
    directorId,
    reports,
    latestReport,
    kpis,
    metrics: {
      totalSales,
      totalCommission,
      avgConversion,
      targetProgress: latestReport?.target_progress || 0,
      reportCount: reports.length,
      velocityChange,
      latestStatus: latestReport?.status || 'unknown',
    },
  }
}
