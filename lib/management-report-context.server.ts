import type { SupabaseClient } from '@supabase/supabase-js'
import type { ManagementReportRecord } from '@/lib/management-report-artifact'
import { buildManagementReportComparisons, enrichManagementReportWithComparisons } from '@/lib/management-report-comparisons'

type ReportWithEntity = ManagementReportRecord & { entity_id?: string | null }

export async function addCanonicalManagementComparisons<T extends ReportWithEntity>(supabase: SupabaseClient, report: T): Promise<T> {
  if (!report.entity_id || report.report_type !== 'monthly') return report

  const currentDate = new Date(`${report.period_start}T00:00:00Z`)
  const previousDate = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth() - 1, 1))
  const previousStart = previousDate.toISOString().slice(0, 10)
  const priorYearDate = new Date(Date.UTC(currentDate.getUTCFullYear() - 1, currentDate.getUTCMonth(), 1))
  const priorYearStart = priorYearDate.toISOString().slice(0, 10)
  const yearStart = `${currentDate.getUTCFullYear()}-01-01`

  const [previousResult, priorYearResult, ytdResult, goalsResult] = await Promise.all([
    supabase
      .from('management_report_runs')
      .select('id,entity_id,report_type,period_start,period_end,generated_at,snapshot')
      .eq('entity_id', report.entity_id)
      .eq('report_type', 'monthly')
      .eq('period_start', previousStart)
      .maybeSingle(),
    supabase
      .from('management_report_runs')
      .select('id,entity_id,report_type,period_start,period_end,generated_at,snapshot')
      .eq('entity_id', report.entity_id)
      .eq('report_type', 'monthly')
      .eq('period_start', priorYearStart)
      .maybeSingle(),
    supabase
      .from('management_report_runs')
      .select('id,entity_id,report_type,period_start,period_end,generated_at,snapshot')
      .eq('entity_id', report.entity_id)
      .eq('report_type', 'monthly')
      .gte('period_start', yearStart)
      .lte('period_start', report.period_start)
      .order('period_start'),
    supabase
      .from('management_goals')
      .select('metric_code,period_start,period_end,target_value,source_name,status,approved_at,formula_version')
      .eq('entity_id', report.entity_id)
      .in('metric_code', ['sales', 'leads'])
      .gte('period_end', yearStart)
      .lte('period_start', report.period_start)
      .order('period_start'),
  ])

  for (const result of [previousResult, priorYearResult, ytdResult, goalsResult]) {
    if (result.error) {
      console.error('[management-report-comparisons] canonical context lookup failed', { code: result.error.code, reportId: report.id })
      return report
    }
  }

  const comparisons = buildManagementReportComparisons({
    current: report,
    previous: previousResult.data as ReportWithEntity | null,
    samePeriodPriorYear: priorYearResult.data as ReportWithEntity | null,
    ytdReports: (ytdResult.data ?? []) as ReportWithEntity[],
    goals: goalsResult.data ?? [],
  })

  return enrichManagementReportWithComparisons(report, comparisons)
}
