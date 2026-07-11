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
        .in('name', ['Portal Inmobiliario', 'TOCTOC Search', 'icasas.cl', 'Yapo Search', 'Realtor International'])
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

    const { error } = await supabase.from('scrape_health_snapshots').insert({
      status: health.status,
      summary: health.summary,
      latest_run: health.latestRun,
      sources: health.sources,
      benchmark: health.benchmark,
      issues: health.issues,
      runs_window: health.runsWindow,
      generated_at: health.generatedAt,
    })

    if (error) throw error
    return health
  } catch {
    return null
  }
}
