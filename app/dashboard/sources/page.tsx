'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database, Clock, Check, AlertCircle } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface DataSource {
  id: string
  name: string
  source_type: string
  status: string
  records_count: number
  last_sync: string
  error_message?: string
  pipeline_order: number
}

interface ScrapeRun {
  id: string
  source: string
  status: 'success' | 'partial' | 'error'
  scraped_count: number
  inserted_count: number
  skipped_count: number
  error_count: number
  created_at: string
}

interface ScrapeHealthIssue {
  severity: 'info' | 'warning' | 'critical'
  title: string
  detail: string
}

interface OperationalAnomaly extends ScrapeHealthIssue {
  area: 'kpi' | 'market' | 'health'
}

interface ScrapeHealth {
  status: 'healthy' | 'warning' | 'critical' | 'unknown'
  generatedAt: string
  summary: {
    recentRuns: number
    averageScraped: number
    averageInserted: number
    activeSources: number
    criticalCount: number
    warningCount: number
  }
  issues: ScrapeHealthIssue[]
  anomalies?: OperationalAnomaly[]
  history?: Array<{
    id: number
    status: string
    generated_at: string
    summary: {
      successRate?: number
      criticalCount?: number
      warningCount?: number
    }
  }>
}

interface PropertyTelemetry {
  total: number
  neighborhoods: Array<{ name: string; count: number; previousCount: number; delta: number }>
  sources: Array<{ name: string; count: number; previousCount: number; delta: number }>
  daily: Array<{ date: string; count: number }>
}

type PropertyRow = { neighborhood: string | null; source: string | null; created_at: string | null }

function buildPropertyTelemetry(rows: PropertyRow[]): PropertyTelemetry {
  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const currentWindowStart = new Date(today)
  currentWindowStart.setUTCDate(currentWindowStart.getUTCDate() - 7)
  const previousWindowStart = new Date(today)
  previousWindowStart.setUTCDate(previousWindowStart.getUTCDate() - 14)

  const neighborhoodCurrent = new Map<string, number>()
  const neighborhoodPrevious = new Map<string, number>()
  const sourceCurrent = new Map<string, number>()
  const sourcePrevious = new Map<string, number>()
  const dailyCounts = new Map<string, number>()

  for (const row of rows) {
    if (!row.created_at) continue
    const created = new Date(row.created_at)
    if (Number.isNaN(created.getTime())) continue

    const key = created.toISOString().slice(0, 10)
    if (created >= currentWindowStart) {
      dailyCounts.set(key, (dailyCounts.get(key) || 0) + 1)
      if (row.neighborhood) neighborhoodCurrent.set(row.neighborhood, (neighborhoodCurrent.get(row.neighborhood) || 0) + 1)
      if (row.source) sourceCurrent.set(row.source, (sourceCurrent.get(row.source) || 0) + 1)
    } else if (created >= previousWindowStart) {
      if (row.neighborhood) neighborhoodPrevious.set(row.neighborhood, (neighborhoodPrevious.get(row.neighborhood) || 0) + 1)
      if (row.source) sourcePrevious.set(row.source, (sourcePrevious.get(row.source) || 0) + 1)
    }
  }

  const buildRows = (
    current: Map<string, number>,
    previous: Map<string, number>,
  ) => [...current.entries()]
    .map(([name, count]) => ({
      name,
      count,
      previousCount: previous.get(name) || 0,
      delta: count - (previous.get(name) || 0),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  const dailySeries: Array<{ date: string; count: number }> = []
  for (let offset = 6; offset >= 0; offset -= 1) {
    const cursor = new Date(today)
    cursor.setUTCDate(cursor.getUTCDate() - offset)
    const date = cursor.toISOString().slice(0, 10)
    dailySeries.push({ date, count: dailyCounts.get(date) || 0 })
  }

  return {
    total: rows.length,
    neighborhoods: buildRows(neighborhoodCurrent, neighborhoodPrevious),
    sources: buildRows(sourceCurrent, sourcePrevious),
    daily: dailySeries,
  }
}

function buildFilteredSeries(rows: PropertyRow[], neighborhood: string, source: string) {
  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const counts = new Map<string, number>()

  for (const row of rows) {
    if (!row.created_at) continue
    if (neighborhood !== 'all' && row.neighborhood !== neighborhood) continue
    if (source !== 'all' && row.source !== source) continue
    const created = new Date(row.created_at)
    if (Number.isNaN(created.getTime())) continue
    const key = created.toISOString().slice(0, 10)
    counts.set(key, (counts.get(key) || 0) + 1)
  }

  const series: Array<{ date: string; count: number }> = []
  for (let offset = 6; offset >= 0; offset -= 1) {
    const cursor = new Date(today)
    cursor.setUTCDate(cursor.getUTCDate() - offset)
    const date = cursor.toISOString().slice(0, 10)
    series.push({ date, count: counts.get(date) || 0 })
  }

  return series
}

export default function SourcesPage() {
  const [sources, setSources] = useState<DataSource[]>([])
  const [runs, setRuns] = useState<ScrapeRun[]>([])
  const [loading, setLoading] = useState(true)
  const [runsLoading, setRunsLoading] = useState(true)
  const [refreshingAll, setRefreshingAll] = useState(false)
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null)
  const [health, setHealth] = useState<ScrapeHealth | null>(null)
  const [propertyTelemetry, setPropertyTelemetry] = useState<PropertyTelemetry | null>(null)
  const [propertyRows, setPropertyRows] = useState<PropertyRow[]>([])
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('all')
  const [selectedSource, setSelectedSource] = useState('all')
  const [runSourceFilter, setRunSourceFilter] = useState('')
  const [runStatusFilter, setRunStatusFilter] = useState('')

  useEffect(() => {
    const fetchSources = async () => {
      try {
        const supabase = createClient()
        const [sourcesRes, healthRes, propertiesRes] = await Promise.all([
          supabase.from('data_sources').select('*').order('pipeline_order', { ascending: true }),
          fetch('/api/scrape/health').then((res) => res.json()),
          supabase.from('properties').select('neighborhood,source,created_at'),
        ])

        setSources(sourcesRes.data || [])
        setHealth(healthRes as ScrapeHealth)
        const rows = (propertiesRes.data || []) as PropertyRow[]
        setPropertyRows(rows)
        setPropertyTelemetry(buildPropertyTelemetry(rows))
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSources()
  }, [])

  useEffect(() => {
    const fetchRuns = async () => {
      try {
        setRunsLoading(true)
        const params = new URLSearchParams()
        params.set('limit', '20')
        if (runSourceFilter) params.set('source', runSourceFilter)
        if (runStatusFilter) params.set('status', runStatusFilter)

        const runsRes = await fetch(`/api/scrape/runs?${params.toString()}`).then((res) => res.json())
        setRuns((runsRes.runs || []) as ScrapeRun[])
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setRunsLoading(false)
      }
    }

    fetchRuns()
  }, [runSourceFilter, runStatusFilter])

  async function handleRefreshAll() {
    setRefreshingAll(true)
    setRefreshMsg(null)
    try {
      const res = await fetch('/api/cron/refresh-sources', { method: 'GET' })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'No pudimos refrescar las fuentes.')
      }
      setRefreshMsg(`Refresco completado: scraping y benchmark actualizados a ${new Date(json.refreshedAt).toLocaleTimeString('es-CL')}`)
      const supabase = createClient()
      const [sourcesRes, healthRes, propertiesRes] = await Promise.all([
        supabase.from('data_sources').select('*').order('pipeline_order', { ascending: true }),
        fetch('/api/scrape/health').then((r) => r.json()),
        supabase.from('properties').select('neighborhood,source,created_at'),
      ])
      setSources(sourcesRes.data || [])
      setHealth(healthRes as ScrapeHealth)
      const rows = (propertiesRes.data || []) as PropertyRow[]
      setPropertyRows(rows)
      setPropertyTelemetry(buildPropertyTelemetry(rows))
      const runsParams = new URLSearchParams()
      runsParams.set('limit', '20')
      if (runSourceFilter) runsParams.set('source', runSourceFilter)
      if (runStatusFilter) runsParams.set('status', runStatusFilter)
      const runsRes = await fetch(`/api/scrape/runs?${runsParams.toString()}`).then((r) => r.json())
      setRuns((runsRes.runs || []) as ScrapeRun[])
    } catch (err) {
      setRefreshMsg(err instanceof Error ? err.message : 'No pudimos refrescar las fuentes.')
    } finally {
      setRefreshingAll(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Check size={16} style={{ color: '#10b981' }} />
      case 'syncing':
        return <Clock size={16} style={{ color: '#f59e0b', animation: 'spin 2s linear infinite' }} />
      case 'error':
        return <AlertCircle size={16} style={{ color: '#d97706' }} />
      default:
        return <Database size={16} style={{ color: '#9ca9a3' }} />
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      active: 'Activa',
      syncing: 'Sincronizando',
      error: 'Error',
      inactive: 'Inactiva',
    }
    return labels[status] || status
  }

  const getSourceTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      external_api: 'API Externa',
      internal_db: 'Base Interna',
      geodata: 'Datos Geograficos',
      analytics_engine: 'Motor Analytics',
      vector_db: 'Base Vectorial',
      report_engine: 'Motor Reportes',
      ai_engine: 'Motor IA',
      scraper: 'Scraper',
    }
    return labels[type] || type
  }

  const runSourceOptions = Array.from(new Set(sources.map((source) => source.name)))
  const neighborhoodOptions = Array.from(new Set(propertyRows.map((row) => row.neighborhood).filter(Boolean) as string[])).sort()
  const sourceOptions = Array.from(new Set(propertyRows.map((row) => row.source).filter(Boolean) as string[])).sort()
  const filteredSeries = buildFilteredSeries(propertyRows, selectedNeighborhood, selectedSource)
  const healthLabel = health?.status === 'healthy' ? 'Saludable' : health?.status === 'warning' ? 'Con alertas' : health?.status === 'critical' ? 'Critico' : 'Sin datos'
  const healthColor = health?.status === 'healthy' ? '#10b981' : health?.status === 'warning' ? '#f59e0b' : health?.status === 'critical' ? '#dc2626' : '#9ca9a3'

  return (
    <div className="space-y-6" aria-busy={loading || runsLoading}>
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Fuentes de Datos
        </h1>
        <p className="text-sm mt-1" style={{ color: '#9ca9a3' }}>
          Pipeline de inteligencia con fuentes integradas en tiempo real
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => void handleRefreshAll()}
            disabled={refreshingAll}
            aria-label="Refrescar scraper y benchmark"
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: '#8fb2aa' }}
          >
            {refreshingAll ? 'Refrescando...' : 'Refrescar scraper + benchmark'}
          </button>
          {refreshMsg && (
            <span className="text-sm" style={{ color: '#555a56' }}>{refreshMsg}</span>
          )}
        </div>
      </div>

      {!loading && health && health.summary && (
        <div className="rounded-lg p-5 bg-white" style={{ border: '1px solid #d8e5e2' }}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#555a56' }}>Health del pipeline</p>
              <h2 className="mt-1 text-lg font-semibold text-gray-900">
                Estado actual: <span style={{ color: healthColor }}>{healthLabel}</span>
              </h2>
              <p className="text-sm mt-1" style={{ color: '#9ca9a3' }}>
                {health.summary?.activeSources || 0} fuentes activas · {health.summary?.averageScraped || 0} casas/corrida · {health.summary?.averageInserted || 0} insertadas/corrida
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg px-3 py-2" style={{ background: '#f5f9f7', border: '1px solid #d8e5e2' }}>
                <p className="text-xs uppercase font-semibold" style={{ color: '#555a56' }}>Alertas</p>
                <p className="text-lg font-bold text-gray-900">{health.summary?.warningCount || 0}</p>
              </div>
              <div className="rounded-lg px-3 py-2" style={{ background: '#f5f9f7', border: '1px solid #d8e5e2' }}>
                <p className="text-xs uppercase font-semibold" style={{ color: '#555a56' }}>Criticas</p>
                <p className="text-lg font-bold text-gray-900">{health.summary?.criticalCount || 0}</p>
              </div>
            </div>
          </div>
          {health.issues.length > 0 && (
            <div className="mt-4 space-y-2">
              {health.issues.slice(0, 4).map((issue) => (
                <div
                  key={`${issue.title}-${issue.detail}`}
                  className="rounded-lg px-3 py-2"
                  style={{
                    background: issue.severity === 'critical' ? '#fef2f2' : issue.severity === 'warning' ? '#fffbeb' : '#f0f9ff',
                    border: `1px solid ${issue.severity === 'critical' ? '#fecaca' : issue.severity === 'warning' ? '#fde68a' : '#bfdbfe'}`,
                  }}
                >
                  <p className="text-sm font-semibold text-gray-900">{issue.title}</p>
                  <p className="text-xs mt-1" style={{ color: '#555a56' }}>{issue.detail}</p>
                </div>
              ))}
            </div>
          )}
          {health.anomalies && health.anomalies.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#555a56' }}>Anomalias operativas</p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {health.anomalies.slice(0, 4).map((anomaly) => (
                  <div
                    key={`${anomaly.area}-${anomaly.title}-${anomaly.detail}`}
                    className="rounded-lg px-3 py-2"
                    style={{
                      background: anomaly.severity === 'critical' ? '#fef2f2' : anomaly.severity === 'warning' ? '#fffbeb' : '#f0f9ff',
                      border: `1px solid ${anomaly.severity === 'critical' ? '#fecaca' : anomaly.severity === 'warning' ? '#fde68a' : '#bfdbfe'}`,
                    }}
                  >
                    <p className="text-sm font-semibold text-gray-900">{anomaly.title}</p>
                    <p className="text-xs mt-1" style={{ color: '#555a56' }}>
                      {anomaly.area.toUpperCase()} - {anomaly.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {health.history && health.history.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#555a56' }}>Ultimas instantaneas</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {health.history.slice(0, 3).map((snapshot) => (
                  <div key={snapshot.id} className="rounded-lg px-3 py-2" style={{ background: '#f5f9f7', border: '1px solid #d8e5e2' }}>
                    <p className="text-sm font-semibold text-gray-900 capitalize">{snapshot.status}</p>
                    <p className="text-xs mt-1" style={{ color: '#9ca9a3' }}>
                      {new Date(snapshot.generated_at).toLocaleString('es-CL')}
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#555a56' }}>
                      {snapshot.summary?.successRate ?? 0}% exito - {snapshot.summary?.warningCount ?? 0} alertas - {snapshot.summary?.criticalCount ?? 0} criticas
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && propertyTelemetry && (
        <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #d8e5e2' }}>
          <div className="flex flex-col gap-3 mb-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Telemetría de casas por barrio y fuente</h2>
              <p className="text-sm" style={{ color: '#9ca9a3' }}>
                {propertyTelemetry.total.toLocaleString()} casas normalizadas en el catálogo.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:min-w-[520px]">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: '#555a56' }}>
                  Barrio
                </span>
                <select
                  value={selectedNeighborhood}
                  onChange={(event) => setSelectedNeighborhood(event.target.value)}
                  className="w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900"
                  style={{ borderColor: '#d8e5e2' }}
                >
                  <option value="all">Todos los barrios</option>
                  {neighborhoodOptions.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: '#555a56' }}>
                  Fuente
                </span>
                <select
                  value={selectedSource}
                  onChange={(event) => setSelectedSource(event.target.value)}
                  className="w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900"
                  style={{ borderColor: '#d8e5e2' }}
                >
                  <option value="all">Todas las fuentes</option>
                  {sourceOptions.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedNeighborhood('all')
                setSelectedSource('all')
              }}
              className="rounded-full border px-3 py-1.5 text-xs font-semibold text-gray-900 transition-opacity hover:opacity-90"
              style={{ borderColor: '#d8e5e2', background: '#f5f9f7' }}
            >
              Limpiar filtros
            </button>
            <span className="text-xs" style={{ color: '#9ca9a3' }}>
              Vista filtrada sobre los ultimos 7 dias.
            </span>
            <span className="text-xs font-semibold" style={{ color: '#8fb2aa' }}>
              {filteredSeries.reduce((sum, item) => sum + item.count, 0).toLocaleString()} registros en la seleccion
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg p-4" style={{ background: '#f5f9f7', border: '1px solid #d8e5e2' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#555a56' }}>Barrios mas activos</p>
              <div className="space-y-2">
                {propertyTelemetry.neighborhoods.map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2" style={{ border: '1px solid #d8e5e2' }}>
                    <div>
                      <span className="text-sm font-medium text-gray-900">{item.name}</span>
                      <p className="text-xs mt-0.5" style={{ color: '#9ca9a3' }}>{item.previousCount} prev - {item.delta >= 0 ? '+' : ''}{item.delta} trend</p>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: '#8fb2aa' }}>{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg p-4" style={{ background: '#f5f9f7', border: '1px solid #d8e5e2' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#555a56' }}>Fuentes con mas volumen</p>
              <div className="space-y-2">
                {propertyTelemetry.sources.map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2" style={{ border: '1px solid #d8e5e2' }}>
                    <div>
                      <span className="text-sm font-medium text-gray-900">{item.name}</span>
                      <p className="text-xs mt-0.5" style={{ color: '#9ca9a3' }}>{item.previousCount} prev - {item.delta >= 0 ? '+' : ''}{item.delta} trend</p>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: '#8fb2aa' }}>{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-lg p-4" style={{ background: '#f5f9f7', border: '1px solid #d8e5e2' }}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#555a56' }}>Actividad filtrada</p>
                <p className="text-sm" style={{ color: '#9ca9a3' }}>
               Ultimos 7 dias para la combinacion seleccionada.
                </p>
              </div>
              <p className="text-sm font-semibold" style={{ color: '#8fb2aa' }}>
                {filteredSeries[filteredSeries.length - 1]?.count ?? 0} hoy
              </p>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={filteredSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d8e5e2" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #d8e5e2', borderRadius: '8px', fontSize: 12 }} />
                <Line type="monotone" dataKey="count" stroke="#8fb2aa" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {/* Pipeline Overview */}
      <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #d8e5e2' }}>
        <h2 className="font-semibold mb-4 text-gray-900">
          Pipeline de Datos
        </h2>

        {!loading && (
          <div className="space-y-2">
            {sources.map((source, idx) => (
              <div key={source.id}>
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: '#f5f9f7' }}>
                  <div className="flex items-center justify-center w-6 h-6 rounded-full font-semibold text-xs text-white" style={{ background: '#8fb2aa' }}>
                    {source.pipeline_order}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-gray-900">
                        {source.name}
                      </span>
                      {getStatusIcon(source.status)}
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded capitalize"
                        style={{
                          background:
                            source.status === 'active'
                              ? '#e8f3f0'
                              : source.status === 'syncing'
                                ? '#fef3e2'
                                : '#fef3f2',
                          color:
                            source.status === 'active'
                              ? '#10b981'
                              : source.status === 'syncing'
                                ? '#f59e0b'
                                : '#d97706',
                        }}
                      >
                        {getStatusLabel(source.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs" style={{ color: '#9ca9a3' }}>
                      <span>{getSourceTypeLabel(source.source_type)}</span>
                      <span>-</span>
                      <span>{source.records_count.toLocaleString()} registros</span>
                      {source.last_sync && (
                        <>
                          <span>-</span>
                           <span>Ultima sync: {new Date(source.last_sync).toLocaleTimeString('es-CL')}</span>
                        </>
                      )}
                    </div>
                    {source.error_message && (
                      <p className="text-xs mt-1" style={{ color: '#d97706' }}>
                        {source.error_message}
                      </p>
                    )}
                  </div>
                </div>
                {idx < sources.length - 1 && (
                  <div className="flex justify-center py-1">
                    <div className="w-0.5 h-4" style={{ background: '#d8e5e2' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Statistics */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4" style={{ border: '1px solid #d8e5e2' }}>
            <p className="text-xs font-medium mb-2" style={{ color: '#555a56' }}>
              FUENTES ACTIVAS
            </p>
            <p className="text-2xl font-bold" style={{ color: '#10b981' }}>
              {sources.filter((s) => s.status === 'active').length}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4" style={{ border: '1px solid #d8e5e2' }}>
            <p className="text-xs font-medium mb-2" style={{ color: '#555a56' }}>
              REGISTROS TOTALES
            </p>
            <p className="text-2xl font-bold" style={{ color: '#8fb2aa' }}>
              {sources.reduce((sum, s) => sum + s.records_count, 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4" style={{ border: '1px solid #d8e5e2' }}>
            <p className="text-xs font-medium mb-2" style={{ color: '#555a56' }}>
               ULTIMA SINCRONIZACION
            </p>
            <p className="text-sm text-gray-900">
              {sources[0]?.last_sync ? new Date(sources[0].last_sync).toLocaleString('es-CL') : 'N/A'}
            </p>
          </div>
        </div>
      )}

      {!loading && (
        <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #d8e5e2' }}>
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">
                 Ultimas corridas del scraper
              </h2>
              <p className="text-sm" style={{ color: '#9ca9a3' }}>
                Filtra por fuente y estado para revisar el pipeline con mas precision.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={runSourceFilter}
                onChange={(e) => setRunSourceFilter(e.target.value)}
                aria-label="Filtrar corridas por fuente"
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: '#d8e5e2', background: '#f5f9f7', color: '#111827' }}
              >
                <option value="">Todas las fuentes</option>
                {runSourceOptions.map((sourceName) => (
                  <option key={sourceName} value={sourceName}>{sourceName}</option>
                ))}
              </select>
              <select
                value={runStatusFilter}
                onChange={(e) => setRunStatusFilter(e.target.value)}
                aria-label="Filtrar corridas por estado"
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: '#d8e5e2', background: '#f5f9f7', color: '#111827' }}
              >
                <option value="">Todos los estados</option>
                <option value="success">Success</option>
                <option value="partial">Partial</option>
                <option value="error">Error</option>
              </select>
              {(runSourceFilter || runStatusFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setRunSourceFilter('')
                    setRunStatusFilter('')
                  }}
                  className="rounded-lg border px-3 py-2 text-sm font-semibold"
                  style={{ borderColor: '#d8e5e2', background: '#fff', color: '#555a56' }}
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
          {runsLoading ? (
            <div className="space-y-2" aria-live="polite">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-lg px-3 py-3" style={{ background: '#eef7f4' }}>
                  <div className="h-4 w-40 rounded-full bg-gray-200 animate-pulse" />
                  <div className="mt-2 h-3 w-64 max-w-full rounded-full bg-gray-200 animate-pulse" />
                </div>
              ))}
            </div>
          ) : runs.length ? (
            <div className="space-y-2">
              {runs.slice(0, 5).map((run) => (
                <div key={run.id} className="flex items-center justify-between gap-4 rounded-lg px-3 py-2" style={{ background: '#f5f9f7' }}>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{run.source}</p>
                    <p className="text-xs" style={{ color: '#9ca9a3' }}>
                      {new Date(run.created_at).toLocaleString('es-CL')} - {run.scraped_count} scraped - {run.inserted_count} inserted - {run.error_count} errors
                    </p>
                  </div>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded capitalize"
                    style={{
                      background: run.status === 'success' ? '#e8f3f0' : run.status === 'partial' ? '#fef3e2' : '#fef3f2',
                      color: run.status === 'success' ? '#10b981' : run.status === 'partial' ? '#f59e0b' : '#d97706',
                    }}
                  >
                    {run.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: '#9ca9a3' }}>
              Todavia no hay ejecuciones registradas.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
