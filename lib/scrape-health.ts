import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export type ScrapeRunSummary = {
  source: string
  status: 'success' | 'partial' | 'error'
  scraped_count: number
  inserted_count: number
  skipped_count: number
  error_count: number
  created_at: string
  finished_at: string
}

export type DataSourceSummary = {
  name: string
  status: string
  records_count: number
  last_sync: string | null
  error_message: string | null
}

export type ExternalBenchmarkSummary = {
  source: string
  recorded_at: string
}

export type ScrapeHealthIssue = {
  severity: 'info' | 'warning' | 'critical'
  title: string
  detail: string
}

export type OperationalAnomaly = ScrapeHealthIssue & {
  area: 'kpi' | 'market' | 'health'
}

export type ScrapeHealthSummary = {
  recentRuns: number
  averageScraped: number
  averageInserted: number
  activeSources: number
  criticalCount: number
  warningCount: number
  successRate: number
  staleSourceCount: number
}

export type ScrapeHealthSnapshot = {
  id?: number
  status: 'healthy' | 'warning' | 'critical' | 'unknown'
  generatedAt: string
  summary: ScrapeHealthSummary
  latestRun: ScrapeRunSummary | null
  sources: DataSourceSummary[]
  benchmark: ExternalBenchmarkSummary | null
  issues: ScrapeHealthIssue[]
}

export type PersistedScrapeHealthSnapshot = ScrapeHealthSnapshot & {
  runsWindow: ScrapeRunSummary[]
}

type KpiSnapshotRow = {
  period_date: string
  ventas_count: number
  conversion_rate: number
  velocidad_venta: number | null
  monthly_target: number | null
  director_id: string | null
}

type NeighborhoodMarketHistoryRow = {
  snapshot_date: string
  neighborhood: string
  avg_price_m2_uf: number | null
  absorption_rate: number | null
  inventory_count: number
  avg_days_on_market: number | null
  opportunity_score: number
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials')
  }

  return createSupabaseClient(supabaseUrl, supabaseKey)
}

export function hoursBetween(from: string | null | undefined, to = new Date()) {
  if (!from) return Number.POSITIVE_INFINITY
  const date = new Date(from)
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY
  return (to.getTime() - date.getTime()) / (1000 * 60 * 60)
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function percentDelta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100
  return ((current - previous) / Math.abs(previous)) * 100
}

export async function loadOperationalAnomalies(supabase: ReturnType<typeof getSupabaseClient>) {
  const anomalies: OperationalAnomaly[] = []

  const [kpiRes, marketRes, historyRes] = await Promise.all([
    supabase
      .from('kpi_snapshots')
      .select('period_date,ventas_count,conversion_rate,velocidad_venta,monthly_target,director_id')
      .order('period_date', { ascending: false })
      .limit(12),
    supabase
      .from('neighborhood_market_data')
      .select('snapshot_date,neighborhood,avg_price_m2_uf,absorption_rate,inventory_count,avg_days_on_market,opportunity_score')
      .order('snapshot_date', { ascending: false })
      .limit(40),
    supabase
      .from('scrape_health_snapshots')
      .select('generated_at,status,summary,issues')
      .order('generated_at', { ascending: false })
      .limit(2),
  ])

  if (kpiRes.error) throw kpiRes.error
  if (marketRes.error) throw marketRes.error
  if (historyRes.error) throw historyRes.error

  const kpis = (kpiRes.data || []) as KpiSnapshotRow[]
  const marketRows = (marketRes.data || []) as NeighborhoodMarketHistoryRow[]
  const healthHistory = (historyRes.data || []) as Array<{
    generated_at: string
    status: string
    summary: ScrapeHealthSummary
    issues: ScrapeHealthIssue[]
  }>

  if (kpis.length >= 6) {
    const latestWindow = kpis.slice(0, 3)
    const previousWindow = kpis.slice(3, 6)
    const latestSales = average(latestWindow.map((row) => row.ventas_count))
    const previousSales = average(previousWindow.map((row) => row.ventas_count))
    const salesDelta = percentDelta(latestSales, previousSales)
    const latestConversion = average(latestWindow.map((row) => row.conversion_rate))
    const previousConversion = average(previousWindow.map((row) => row.conversion_rate))
    const conversionDelta = latestConversion - previousConversion
    const latestVelocity = average(latestWindow.map((row) => row.velocidad_venta || 0))
    const previousVelocity = average(previousWindow.map((row) => row.velocidad_venta || 0))
    const velocityDelta = percentDelta(latestVelocity, previousVelocity)
    const targetGapRows = latestWindow.filter((row) => row.monthly_target && row.monthly_target > row.ventas_count * 1.2)

    if (salesDelta <= -25) {
      anomalies.push({
        area: 'kpi',
        severity: 'warning',
        title: 'Caida de ventas reciente',
        detail: `Las ventas promedio de las ultimas 3 muestras bajaron ${Math.abs(salesDelta).toFixed(0)}% vs el bloque previo.`,
      })
    }

    if (conversionDelta <= -1.2) {
      anomalies.push({
        area: 'kpi',
        severity: 'warning',
        title: 'Conversion en retroceso',
        detail: `La conversion promedio bajo ${Math.abs(conversionDelta).toFixed(1)} puntos en el tramo reciente.`,
      })
    }

    if (velocityDelta >= 18) {
      anomalies.push({
        area: 'kpi',
        severity: 'critical',
        title: 'Velocidad de venta empeoro',
        detail: `La velocidad promedio subio ${velocityDelta.toFixed(0)}% frente al bloque anterior.`,
      })
    }

    if (targetGapRows.length >= 2) {
      anomalies.push({
        area: 'kpi',
        severity: 'warning',
        title: 'Objetivo semanal por debajo del ritmo',
        detail: `Hay ${targetGapRows.length} snapshots recientes por debajo del ritmo esperado vs monthly_target.`,
      })
    }
  }

  if (marketRows.length >= 8) {
    const byNeighborhood = new Map<string, NeighborhoodMarketHistoryRow[]>()
    for (const row of marketRows) {
      const list = byNeighborhood.get(row.neighborhood) || []
      list.push(row)
      byNeighborhood.set(row.neighborhood, list)
    }

    const marketAlerts = [...byNeighborhood.entries()]
      .flatMap(([neighborhood, rows]) => {
        if (rows.length < 2) return []
        const latest = rows[0]
        const previous = rows[1]
        const alerts: OperationalAnomaly[] = []
        const absorptionDelta = ((latest.absorption_rate || 0) - (previous.absorption_rate || 0)) * 100
        const inventoryDelta = percentDelta(latest.inventory_count || 0, previous.inventory_count || 0)
        const priceDelta = percentDelta(latest.avg_price_m2_uf || 0, previous.avg_price_m2_uf || 0)
        const opportunityDelta = (latest.opportunity_score || 0) - (previous.opportunity_score || 0)
        const daysDelta = (latest.avg_days_on_market || 0) - (previous.avg_days_on_market || 0)

        if (absorptionDelta <= -10 && inventoryDelta >= 20) {
          alerts.push({
            area: 'market',
            severity: 'warning',
            title: `Presion de mercado en ${neighborhood}`,
            detail: `Absorcion cayendo ${Math.abs(absorptionDelta).toFixed(0)} pts e inventario subiendo ${inventoryDelta.toFixed(0)}% en el ultimo snapshot.`,
          })
        }

        if (priceDelta >= 12 && opportunityDelta <= -8) {
          alerts.push({
            area: 'market',
            severity: 'warning',
            title: `Desacople precio/oportunidad en ${neighborhood}`,
            detail: `Precio UF/m² subio ${priceDelta.toFixed(0)}% mientras el opportunity score bajo ${Math.abs(opportunityDelta).toFixed(0)} pts.`,
          })
        }

        if (daysDelta >= 10) {
          alerts.push({
            area: 'market',
            severity: 'critical',
            title: `Enfriamiento de ${neighborhood}`,
            detail: `Los dias en mercado aumentaron ${daysDelta.toFixed(0)} dias vs el snapshot previo.`,
          })
        }

        return alerts
      })
      .slice(0, 4)

    anomalies.push(...marketAlerts)
  }

  if (healthHistory.length >= 2) {
    const latest = healthHistory[0]
    const previous = healthHistory[1]
    const latestSuccess = latest.summary?.successRate || 0
    const previousSuccess = previous.summary?.successRate || 0
    const successDelta = latestSuccess - previousSuccess

    if (successDelta <= -20) {
      anomalies.push({
        area: 'health',
        severity: 'warning',
        title: 'Salud del pipeline retrocedio',
        detail: `El success rate bajo ${Math.abs(successDelta).toFixed(0)} pts vs el snapshot anterior.`,
      })
    }

    if ((latest.summary?.criticalCount || 0) > (previous.summary?.criticalCount || 0)) {
      anomalies.push({
        area: 'health',
        severity: 'critical',
        title: 'Mas alertas criticas que antes',
        detail: `El snapshot mas reciente tiene ${(latest.summary?.criticalCount || 0)} criticas vs ${(previous.summary?.criticalCount || 0)} en el anterior.`,
      })
    }
  }

  return anomalies
}

export function evaluateScrapeHealth(
  runs: ScrapeRunSummary[],
  sources: DataSourceSummary[],
  benchmark: ExternalBenchmarkSummary | null,
): PersistedScrapeHealthSnapshot {
  const now = new Date()
  const issues: ScrapeHealthIssue[] = []
  const latestRun = runs[0] || null
  const recentWindow = runs.slice(0, 5)
  const successfulRuns = recentWindow.filter((run) => run.status === 'success').length
  const errorRuns = recentWindow.filter((run) => run.status === 'error').length
  const avgScraped = recentWindow.length
    ? Math.round(recentWindow.reduce((sum, run) => sum + run.scraped_count, 0) / recentWindow.length)
    : 0
  const avgInserted = recentWindow.length
    ? Math.round(recentWindow.reduce((sum, run) => sum + run.inserted_count, 0) / recentWindow.length)
    : 0

  if (!latestRun) {
    issues.push({
      severity: 'warning',
      title: 'Sin historial reciente',
      detail: 'Todavia no hay corridas de scraping persistidas para evaluar estabilidad.',
    })
  } else {
    const latestAgeHours = hoursBetween(latestRun.created_at, now)
    if (latestRun.status === 'error') {
      issues.push({
        severity: 'critical',
        title: 'La ultima corrida fallo',
        detail: `La corrida mas reciente termino en error con ${latestRun.error_count} errores.`,
      })
    }

    if (latestAgeHours > 36) {
      issues.push({
        severity: 'warning',
        title: 'Scraper desactualizado',
        detail: `La ultima corrida fue hace ${Math.round(latestAgeHours)} horas.`,
      })
    }
  }

  if (recentWindow.length >= 3 && successfulRuns <= 1) {
    issues.push({
      severity: 'warning',
      title: 'Baja tasa de exito',
      detail: `Solo ${successfulRuns} de las ultimas ${recentWindow.length} corridas terminaron correctamente.`,
    })
  }

  if (recentWindow.length >= 3 && avgScraped < 5) {
    issues.push({
      severity: 'warning',
      title: 'Volumen de scraping bajo',
      detail: `El promedio reciente es de ${avgScraped} propiedades por corrida.`,
    })
  }

  if (recentWindow.length >= 3 && errorRuns >= 2) {
    issues.push({
      severity: 'critical',
      title: 'Errores repetidos',
      detail: `${errorRuns} de las ultimas ${recentWindow.length} corridas terminaron con error.`,
    })
  }

  const staleSources = sources.filter((source) => hoursBetween(source.last_sync, now) > 48)
  staleSources.forEach((source) => {
    issues.push({
      severity: source.status === 'error' ? 'critical' : 'warning',
      title: `${source.name} sin actualizacion`,
      detail: source.last_sync
        ? `Ultima sincronizacion hace ${Math.round(hoursBetween(source.last_sync, now))} horas.`
        : 'La fuente todavia no reporta sincronizacion reciente.',
    })
  })

  sources
    .filter((source) => source.status === 'error')
    .forEach((source) => {
      issues.push({
        severity: 'critical',
        title: `${source.name} en error`,
        detail: source.error_message || 'La fuente reporto un estado de error.',
      })
    })

  if (!benchmark || hoursBetween(benchmark.recorded_at, now) > 72) {
    issues.push({
      severity: 'warning',
      title: 'Benchmark externo stale',
      detail: benchmark
        ? `El benchmark de ${benchmark.source} quedo sin refrescar hace ${Math.round(hoursBetween(benchmark.recorded_at, now))} horas.`
        : 'Todavia no hay benchmark externo registrado.',
    })
  }

  const criticalCount = issues.filter((issue) => issue.severity === 'critical').length
  const warningCount = issues.filter((issue) => issue.severity === 'warning').length
  const status = criticalCount > 0 ? 'critical' : warningCount > 0 ? 'warning' : 'healthy'

  return {
    status,
    generatedAt: now.toISOString(),
    summary: {
      recentRuns: runs.length,
      averageScraped: avgScraped,
      averageInserted: avgInserted,
      activeSources: sources.filter((source) => source.status === 'active').length,
      criticalCount,
      warningCount,
      successRate: recentWindow.length ? Math.round((successfulRuns / recentWindow.length) * 100) : 0,
      staleSourceCount: staleSources.length,
    },
    latestRun,
    sources,
    benchmark,
    issues,
    runsWindow: recentWindow,
  }
}

export async function persistScrapeHealthSnapshot() {
  try {
    const supabase = getSupabaseClient()
    const [runsRes, sourcesRes, benchmarkRes] = await Promise.all([
      supabase
        .from('scrape_runs')
        .select('source,status,scraped_count,inserted_count,skipped_count,error_count,created_at,finished_at')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('data_sources')
        .select('name,status,records_count,last_sync,error_message')
        .in('name', ['Portal Inmobiliario', 'TOCTOC Search', 'icasas.cl', 'Yapo Search', 'Chilepropiedades', 'Realtor International'])
        .order('pipeline_order', { ascending: true }),
      supabase
        .from('external_market_benchmarks')
        .select('source,recorded_at')
        .order('recorded_at', { ascending: false })
        .limit(1),
    ])

    if (runsRes.error) throw runsRes.error
    if (sourcesRes.error) throw sourcesRes.error
    if (benchmarkRes.error) throw benchmarkRes.error

    const health = evaluateScrapeHealth(
      (runsRes.data || []) as ScrapeRunSummary[],
      (sourcesRes.data || []) as DataSourceSummary[],
      (benchmarkRes.data?.[0] || null) as ExternalBenchmarkSummary | null,
    )
    const anomalies = await loadOperationalAnomalies(supabase).catch(() => [])
    const mergedIssues = [...health.issues, ...anomalies]

    const { error } = await supabase.from('scrape_health_snapshots').insert({
      status: health.status,
      summary: health.summary,
      latest_run: health.latestRun,
      sources: health.sources,
      benchmark: health.benchmark,
      issues: mergedIssues,
      runs_window: health.runsWindow,
      generated_at: health.generatedAt,
    })

    if (error) throw error
    return health
  } catch {
    return null
  }
}
