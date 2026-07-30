import { createClient } from '@/lib/supabase/server'

export type DashboardOperationalSnapshot = {
  valuationCases: number | null
  valuationDrafts: number | null
  valuationApproved: number | null
  managementDefinitions: number | null
  managementMetrics: number | null
  managementAlerts: number | null
  error?: string
}

const emptySnapshot: DashboardOperationalSnapshot = {
  valuationCases: null,
  valuationDrafts: null,
  valuationApproved: null,
  managementDefinitions: null,
  managementMetrics: null,
  managementAlerts: null,
}

export async function getDashboardOperationalSnapshot(): Promise<DashboardOperationalSnapshot> {
  try {
    const supabase = await createClient()
    const [valuationCases, valuationDrafts, valuationApproved, managementDefinitions, managementMetrics, managementAlerts] = await Promise.all([
      supabase.from('valuation_cases').select('id', { count: 'exact', head: true }),
      supabase.from('valuation_cases').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
      supabase.from('valuation_cases').select('id', { count: 'exact', head: true }).in('status', ['approved', 'issued']),
      supabase.from('management_metric_definitions').select('code', { count: 'exact', head: true }).eq('active', true),
      supabase.from('management_metric_values').select('id', { count: 'exact', head: true }),
      supabase.from('management_alerts').select('id', { count: 'exact', head: true }).in('status', ['open', 'acknowledged']),
    ])

    const errors = [
      valuationCases.error,
      valuationDrafts.error,
      valuationApproved.error,
      managementDefinitions.error,
      managementMetrics.error,
      managementAlerts.error,
    ].filter(Boolean)

    if (errors.length > 0) {
      return {
        ...emptySnapshot,
        error: errors.map((error) => error?.message).join(' · '),
      }
    }

    return {
      valuationCases: valuationCases.count ?? 0,
      valuationDrafts: valuationDrafts.count ?? 0,
      valuationApproved: valuationApproved.count ?? 0,
      managementDefinitions: managementDefinitions.count ?? 0,
      managementMetrics: managementMetrics.count ?? 0,
      managementAlerts: managementAlerts.count ?? 0,
    }
  } catch (error) {
    return {
      ...emptySnapshot,
      error: error instanceof Error ? error.message : 'No fue posible consultar el estado operativo del dashboard.',
    }
  }
}
