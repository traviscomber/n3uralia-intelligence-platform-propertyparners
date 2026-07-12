import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import {
  evaluateScrapeHealth,
  loadOperationalAnomalies,
  type DataSourceSummary,
  type ExternalBenchmarkSummary,
  type ScrapeRunSummary,
} from '@/lib/scrape-health'

type ScrapeHealthSnapshotRow = {
  id: number
  status: string
  summary: Record<string, unknown>
  latest_run: Record<string, unknown> | null
  sources: Array<Record<string, unknown>>
  benchmark: Record<string, unknown> | null
  issues: Array<Record<string, unknown>>
  runs_window: Array<Record<string, unknown>>
  generated_at: string
  created_at: string
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials')
  }

  return createSupabaseClient(supabaseUrl, supabaseKey)
}

export async function GET() {
  try {
    const supabase = getSupabaseClient()

    const [runsRes, sourcesRes, benchmarkRes, historyRes] = await Promise.all([
      supabase
        .from('scrape_runs')
        .select('source,status,scraped_count,inserted_count,skipped_count,error_count,created_at,finished_at')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('data_sources')
        .select('name,status,records_count,last_sync,error_message')
        .in('name', ['Portal Inmobiliario', 'TOCTOC Search', 'icasas.cl', 'Yapo Search', 'Chilepropiedades', 'Realtor International', 'Portal Inmobiliario Benchmark'])
        .order('pipeline_order', { ascending: true }),
      supabase
        .from('external_market_benchmarks')
        .select('source,recorded_at')
        .order('recorded_at', { ascending: false })
        .limit(1),
      supabase
        .from('scrape_health_snapshots')
        .select('id,status,summary,latest_run,sources,benchmark,issues,runs_window,generated_at,created_at')
        .order('generated_at', { ascending: false })
        .limit(8),
    ])

    if (runsRes.error) throw runsRes.error
    if (sourcesRes.error) throw sourcesRes.error
    if (benchmarkRes.error) throw benchmarkRes.error
    if (historyRes.error) throw historyRes.error

    const health = evaluateScrapeHealth(
      (runsRes.data || []) as ScrapeRunSummary[],
      (sourcesRes.data || []) as DataSourceSummary[],
      (benchmarkRes.data?.[0] || null) as ExternalBenchmarkSummary | null,
    )
    const anomalies = await loadOperationalAnomalies(supabase).catch(() => [])

    return NextResponse.json({
      ...health,
      anomalies,
      history: (historyRes.data || []) as ScrapeHealthSnapshotRow[],
    })
  } catch (err) {
    return NextResponse.json(
      { status: 'unknown', history: [], issues: [], anomalies: [], error: err instanceof Error ? err.message : 'No pudimos evaluar la salud del scraper.' },
      { status: 200 },
    )
  }
}
