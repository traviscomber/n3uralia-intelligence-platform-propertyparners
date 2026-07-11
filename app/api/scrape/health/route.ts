import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

type ScrapeRun = {
  source: string
  status: 'success' | 'partial' | 'error'
  scraped_count: number
  inserted_count: number
  skipped_count: number
  error_count: number
  created_at: string
  finished_at: string
}

type DataSource = {
  name: string
  status: string
  records_count: number
  last_sync: string | null
  error_message: string | null
}

type ExternalBenchmark = {
  source: string
  recorded_at: string
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials')
  }

  return createSupabaseClient(supabaseUrl, supabaseKey)
}

function hoursBetween(from: string | null | undefined, to = new Date()) {
  if (!from) return Number.POSITIVE_INFINITY
  const date = new Date(from)
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY
  return (to.getTime() - date.getTime()) / (1000 * 60 * 60)
}

export async function GET() {
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
        .in('name', ['Portal Inmobiliario', 'TOCTOC Search', 'icasas.cl'])
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

    const runs = (runsRes.data || []) as ScrapeRun[]
    const sources = (sourcesRes.data || []) as DataSource[]
    const benchmark = (benchmarkRes.data?.[0] || null) as ExternalBenchmark | null
    const now = new Date()
    const issues: Array<{ severity: 'info' | 'warning' | 'critical'; title: string; detail: string }> = []

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
        detail: 'Todavía no hay corridas de scraping persistidas para evaluar estabilidad.',
      })
    } else {
      const latestAgeHours = hoursBetween(latestRun.created_at, now)
      if (latestRun.status === 'error') {
        issues.push({
          severity: 'critical',
          title: 'La última corrida falló',
          detail: `La corrida más reciente terminó en error con ${latestRun.error_count} errores.`,
        })
      }

      if (latestAgeHours > 36) {
        issues.push({
          severity: 'warning',
          title: 'Scraper desactualizado',
          detail: `La última corrida fue hace ${Math.round(latestAgeHours)} horas.`,
        })
      }
    }

    if (recentWindow.length >= 3 && successfulRuns <= 1) {
      issues.push({
        severity: 'warning',
        title: 'Baja tasa de éxito',
        detail: `Solo ${successfulRuns} de las últimas ${recentWindow.length} corridas terminaron correctamente.`,
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
        detail: `${errorRuns} de las últimas ${recentWindow.length} corridas terminaron con error.`,
      })
    }

    const staleSources = sources.filter((source) => hoursBetween(source.last_sync, now) > 48)
    staleSources.forEach((source) => {
      issues.push({
        severity: source.status === 'error' ? 'critical' : 'warning',
        title: `${source.name} sin actualización`,
        detail: source.last_sync
          ? `Última sincronización hace ${Math.round(hoursBetween(source.last_sync, now))} horas.`
          : 'La fuente todavía no reporta sincronización reciente.',
      })
    })

    sources
      .filter((source) => source.status === 'error')
      .forEach((source) => {
        issues.push({
          severity: 'critical',
          title: `${source.name} en error`,
          detail: source.error_message || 'La fuente reportó un estado de error.',
        })
      })

    if (!benchmark || hoursBetween(benchmark.recorded_at, now) > 72) {
      issues.push({
        severity: 'warning',
        title: 'Benchmark externo stale',
        detail: benchmark
          ? `El benchmark de ${benchmark.source} quedó sin refrescar hace ${Math.round(hoursBetween(benchmark.recorded_at, now))} horas.`
          : 'Todavía no hay benchmark externo registrado.',
      })
    }

    const criticalCount = issues.filter((issue) => issue.severity === 'critical').length
    const warningCount = issues.filter((issue) => issue.severity === 'warning').length
    const status = criticalCount > 0 ? 'critical' : warningCount > 0 ? 'warning' : 'healthy'

    return NextResponse.json({
      status,
      generatedAt: now.toISOString(),
      summary: {
        recentRuns: runs.length,
        averageScraped: avgScraped,
        averageInserted: avgInserted,
        activeSources: sources.filter((source) => source.status === 'active').length,
        criticalCount,
        warningCount,
      },
      latestRun,
      sources,
      benchmark,
      issues,
    })
  } catch (err) {
    return NextResponse.json(
      { status: 'unknown', issues: [], error: err instanceof Error ? err.message : 'No pudimos evaluar la salud del scraper.' },
      { status: 200 },
    )
  }
}
