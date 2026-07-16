'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { buildVitacuraNeighborhoodIntelligence, filterVitacuraRows } from '@/lib/vitacura'
import { PP_AGENTS, PP_AUDIENCES, PP_NAME, PP_SCOPE, PP_STEPS } from '@/lib/pp-agent'

type PropertyRow = {
  id: string
  property_type: string | null
  neighborhood: string | null
  source: string | null
  source_url: string | null
  image_url: string | null
  listing_number: string | null
  tags: string[] | null
  created_at: string
}
type ScrapeRunRow = {
  source: string
  status: string
  scraped_count: number
  inserted_count: number
  skipped_count: number
  error_count: number
  started_at: string
  finished_at: string
  created_at: string
}

type MarketRow = {
  neighborhood: string
  avg_price_uf: number | null
  avg_price_m2_uf: number | null
  absorption_rate: number | null
  inventory_count: number
  avg_days_on_market: number | null
}

type AiReportRow = {
  id: string
  report_type: string
  title: string
  summary: string | null
  content: Record<string, unknown> | null
  created_at: string
  period_date: string | null
}

type MetricCard = {
  label: string
  value: string
  sub: string
  accent: string
}

function fmt(value: number) {
  return new Intl.NumberFormat('es-CL').format(value)
}

function daysSince(dateValue: string | null | undefined) {
  if (!dateValue) return null
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return null
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000))
}

function normalizeText(value: string | null | undefined) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function inferAudience(report: AiReportRow) {
  const content = (report.content || {}) as Record<string, unknown>
  const hint = [
    String(content.audience || ''),
    String(content.requested_audience || ''),
    String(content.requested_report_type || ''),
    report.report_type,
  ].join(' ').toLowerCase()

  if (hint.includes('ceo')) return 'ceo'
  if (hint.includes('vendedor') || hint.includes('seller') || hint.includes('ejecutivo')) return 'seller'
  return 'director'
}

function getPropertyKindLabel(value: string | null) {
  const normalized = normalizeText(value)
  if (normalized.includes('depart')) return 'departamento'
  if (normalized.includes('house') || normalized.includes('casa')) return 'casa'
  return normalized || 'sin tipo'
}

function PPMetricCard({ label, value, sub, accent }: MetricCard) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm" style={{ borderColor: '#e6eeeb', borderLeft: `4px solid ${accent}` }}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: '#8c9a95' }}>
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold" style={{ color: '#173634' }}>
        {value}
      </p>
      <p className="mt-2 text-sm" style={{ color: '#9ca9a3' }}>
        {sub}
      </p>
    </div>
  )
}

export default function PpDashboard() {
  const [properties, setProperties] = useState<PropertyRow[]>([])
  const [scrapeRuns, setScrapeRuns] = useState<ScrapeRunRow[]>([])
  const [marketRows, setMarketRows] = useState<MarketRow[]>([])
  const [aiReports, setAiReports] = useState<AiReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const vitacuraProperties = useMemo(() => filterVitacuraRows(properties), [properties])
  const vitacuraMarketRows = useMemo(() => filterVitacuraRows(marketRows), [marketRows])

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const [
          { data: propertyData },
          { data: runData },
          { data: marketData },
          { data: reportData },
        ] = await Promise.all([
          supabase
            .from('properties')
            .select('id, property_type, neighborhood, source, source_url, image_url, listing_number, tags, created_at')
            .order('created_at', { ascending: false })
            .limit(250),
          supabase
            .from('scrape_runs')
            .select('source, status, scraped_count, inserted_count, skipped_count, error_count, started_at, finished_at, created_at')
            .order('created_at', { ascending: false })
            .limit(12),
          supabase
            .from('market_data')
            .select('neighborhood, avg_price_uf, avg_price_m2_uf, absorption_rate, inventory_count, avg_days_on_market')
            .order('absorption_rate', { ascending: false })
            .limit(12),
          supabase
            .from('ai_reports')
            .select('id, report_type, title, summary, content, created_at, period_date')
            .order('created_at', { ascending: false })
            .limit(18),
        ])

        setProperties((propertyData || []) as PropertyRow[])
        setScrapeRuns((runData || []) as ScrapeRunRow[])
        setMarketRows((marketData || []) as MarketRow[])
        setAiReports((reportData || []) as AiReportRow[])
      } catch (err) {
        console.error('Error loading PP dashboard:', err)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const uniqueSources = useMemo(() => {
    return new Set(vitacuraProperties.map((property) => property.source || '').filter(Boolean)).size
  }, [vitacuraProperties])

  const casas = useMemo(() => vitacuraProperties.filter((property) => getPropertyKindLabel(property.property_type) === 'casa').length, [vitacuraProperties])
  const deptos = useMemo(() => vitacuraProperties.filter((property) => getPropertyKindLabel(property.property_type) === 'departamento').length, [vitacuraProperties])
  const withLinks = useMemo(() => vitacuraProperties.filter((property) => Boolean(property.source_url)).length, [vitacuraProperties])
  const withPhotos = useMemo(() => vitacuraProperties.filter((property) => Boolean(property.image_url)).length, [vitacuraProperties])
  const dedupeSignal = useMemo(() => {
    const keys = new Set(
      vitacuraProperties.map((property) => {
        return [
          normalizeText(property.source || ''),
          normalizeText(property.listing_number || ''),
          normalizeText(property.neighborhood || ''),
          getPropertyKindLabel(property.property_type),
        ].join('|')
      }),
    )

    return {
      unique: keys.size,
      duplicates: Math.max(0, vitacuraProperties.length - keys.size),
      coverage: vitacuraProperties.length ? Math.round((keys.size / vitacuraProperties.length) * 100) : 0,
    }
  }, [vitacuraProperties])

  const latestRun = scrapeRuns[0] || null
  const latestReport = aiReports[0] || null
  const reportCounts = useMemo(() => {
    return aiReports.reduce<Record<'ceo' | 'director' | 'seller', number>>(
      (acc, report) => {
        acc[inferAudience(report) as 'ceo' | 'director' | 'seller'] += 1
        return acc
      },
      { ceo: 0, director: 0, seller: 0 },
    )
  }, [aiReports])

  const latestMarket = vitacuraMarketRows[0] || null
  const vitacuraNeighborhoodIntel = useMemo(
    () => buildVitacuraNeighborhoodIntelligence(vitacuraMarketRows.length ? vitacuraMarketRows : vitacuraProperties),
    [vitacuraMarketRows, vitacuraProperties],
  )
  const freshnessDays = Math.min(
    ...[
      daysSince(latestRun?.created_at),
      daysSince(latestReport?.created_at),
    ].filter((value): value is number => value !== null),
    Number.POSITIVE_INFINITY,
  )

  const metrics: MetricCard[] = [
    {
      label: 'Inventario cargado',
      value: fmt(vitacuraProperties.length),
      sub: `${casas} casas y ${deptos} departamentos`,
      accent: '#8fb2aa',
    },
    {
      label: 'Fuentes activas',
      value: fmt(uniqueSources),
      sub: `${withLinks} con link y ${withPhotos} con foto`,
      accent: '#b89a7e',
    },
    {
      label: 'Dedupe fuerte',
      value: `${dedupeSignal.coverage}%`,
      sub: `${dedupeSignal.duplicates} posibles duplicados en la vista`,
      accent: '#10b981',
    },
    {
      label: 'Actualizacion',
      value: Number.isFinite(freshnessDays) ? `${freshnessDays}d` : 's/d',
      sub: latestRun ? `Ultimo scrape ${latestRun.source}` : 'Sin scrape reciente',
      accent: '#173634',
    },
  ]

  const runChartData = [...scrapeRuns]
    .slice(0, 8)
    .reverse()
    .map((run) => ({
      label: run.source.split('_')[0].slice(0, 10),
      scraped: run.scraped_count,
      inserted: run.inserted_count,
    }))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm" style={{ color: '#9ca9a3' }}>Cargando PP...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="rounded-3xl border bg-white p-6 shadow-sm" style={{ borderColor: '#dce7e3' }}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#8fb2aa' }}>
              {PP_NAME} Inteligencia de Mercado
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              Agente senior para ventas en Vitacura
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6" style={{ color: '#555a56' }}>
              {PP_NAME} convierte la data de mercado en un motor comercial repetible para casas y departamentos en {PP_SCOPE.market}.
              El modelo esta pensado para capturar, limpiar, deduplicar, reportar y refrescar datos sin trabajo manual.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm lg:min-w-[320px]">
            <div className="rounded-2xl border bg-slate-50 p-4" style={{ borderColor: '#dce7e3' }}>
              <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: '#8c9a95' }}>Ambito</p>
              <p className="mt-2 font-semibold text-gray-900">Vitacura</p>
            </div>
            <div className="rounded-2xl border bg-slate-50 p-4" style={{ borderColor: '#dce7e3' }}>
              <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: '#8c9a95' }}>Prioridad</p>
              <p className="mt-2 font-semibold text-gray-900">Ventas</p>
            </div>
            <div className="rounded-2xl border bg-slate-50 p-4" style={{ borderColor: '#dce7e3' }}>
              <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: '#8c9a95' }}>Producto</p>
              <p className="mt-2 font-semibold text-gray-900">Casas + deptos</p>
            </div>
            <div className="rounded-2xl border bg-slate-50 p-4" style={{ borderColor: '#dce7e3' }}>
              <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: '#8c9a95' }}>Frescura</p>
              <p className="mt-2 font-semibold text-gray-900">{Number.isFinite(freshnessDays) ? `${freshnessDays}d` : 's/d'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <PPMetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border bg-white p-6 shadow-sm" style={{ borderColor: '#dce7e3' }}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#8c9a95' }}>Modelo operativo PP</p>
              <h2 className="mt-2 text-xl font-semibold text-gray-900">Como funciona PP</h2>
            </div>
            <span className="rounded-full border px-3 py-1 text-xs font-medium" style={{ borderColor: '#dce7e3', color: '#555a56' }}>
              4 fases
            </span>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            {PP_STEPS.map((step) => (
              <div key={step.id} className="rounded-2xl border bg-slate-50 p-4" style={{ borderColor: '#dce7e3' }}>
                <p className="text-sm font-semibold" style={{ color: '#173634' }}>{step.title}</p>
                <p className="mt-2 text-sm leading-6" style={{ color: '#555a56' }}>{step.description}</p>
                <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em]" style={{ color: '#8fb2aa' }}>
                  Output
                </p>
                <p className="mt-1 text-sm" style={{ color: '#3f4a46' }}>{step.output}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-6 shadow-sm" style={{ borderColor: '#dce7e3' }}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#8c9a95' }}>Agentes PP</p>
              <h2 className="mt-2 text-xl font-semibold text-gray-900">Agentes inteligentes por funcion</h2>
            </div>
            <span className="rounded-full border px-3 py-1 text-xs font-medium" style={{ borderColor: '#dce7e3', color: '#555a56' }}>
              5 agents
            </span>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            {PP_AGENTS.map((agent) => (
              <div key={agent.key} className="rounded-2xl border bg-slate-50 p-4" style={{ borderColor: '#dce7e3' }}>
                <p className="text-sm font-semibold" style={{ color: '#173634' }}>{agent.title}</p>
                <p className="mt-2 text-sm leading-6" style={{ color: '#555a56' }}>{agent.mission}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium" style={{ color: '#8c9a95' }}>
                    Entradas {agent.inputs.length}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium" style={{ color: '#8c9a95' }}>
                    Senales {agent.signals.length}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium" style={{ color: '#8c9a95' }}>
                    Salidas {agent.outputs.length}
                  </span>
                </div>
                <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em]" style={{ color: '#8fb2aa' }}>
                  Decisión
                </p>
                <p className="mt-1 text-sm" style={{ color: '#3f4a46' }}>{agent.decision}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-6 shadow-sm" style={{ borderColor: '#dce7e3' }}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#8c9a95' }}>Audience map</p>
              <h2 className="mt-2 text-xl font-semibold text-gray-900">Lo que debe ver cada rol</h2>
            </div>
            <span className="rounded-full border px-3 py-1 text-xs font-medium" style={{ borderColor: '#dce7e3', color: '#555a56' }}>
              3 audiences
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {PP_AUDIENCES.map((audience) => {
              const count = reportCounts[audience.key]
              return (
                <div key={audience.key} className="rounded-2xl border bg-slate-50 p-4" style={{ borderColor: '#dce7e3' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#173634' }}>{audience.title}</p>
                      <p className="mt-1 text-sm leading-6" style={{ color: '#555a56' }}>{audience.description}</p>
                    </div>
                    <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: '#e8f3f0', color: '#173634' }}>
                      {count}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-xs" style={{ color: '#8c9a95' }}>
                      Decision: {audience.decision}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-3xl border bg-white p-6 shadow-sm xl:col-span-2" style={{ borderColor: '#dce7e3' }}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#8c9a95' }}>Flujo operativo</p>
              <h2 className="mt-2 text-xl font-semibold text-gray-900">Ejecuciones del scraper y calidad de datos</h2>
            </div>
            <span className="rounded-full border px-3 py-1 text-xs font-medium" style={{ borderColor: '#dce7e3', color: '#555a56' }}>
              {scrapeRuns.length} runs
            </span>
          </div>
          <div className="mt-5 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={runChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2ef" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca9a3' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca9a3' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #dce7e3', borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="scraped" radius={[6, 6, 0, 0]} name="Scraped" fill="#d8e5e2">
                  {runChartData.map((entry, index) => (
                    <Cell key={entry.label + index} fill={index % 2 === 0 ? '#8fb2aa' : '#b89a7e'} />
                  ))}
                </Bar>
                <Bar dataKey="inserted" radius={[6, 6, 0, 0]} name="Inserted" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            {scrapeRuns.slice(0, 4).map((run, index) => (
              <div key={`${run.source}-${index}`} className="rounded-2xl border bg-slate-50 p-4" style={{ borderColor: '#dce7e3' }}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold" style={{ color: '#173634' }}>{run.source}</p>
                  <span className="rounded-full px-2 py-1 text-[11px] font-medium" style={{ background: run.status === 'success' ? '#e8f3f0' : '#fff7ed', color: run.status === 'success' ? '#166534' : '#c2410c' }}>
                    {run.status}
                  </span>
                </div>
                <p className="mt-2 text-sm" style={{ color: '#555a56' }}>
                  {run.scraped_count} capturadas, {run.inserted_count} insertadas, {run.skipped_count} omitidas, {run.error_count} errores
                </p>
                <p className="mt-1 text-xs" style={{ color: '#9ca9a3' }}>
                  {new Date(run.created_at).toLocaleString('es-CL')}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-6 shadow-sm" style={{ borderColor: '#dce7e3' }}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#8c9a95' }}>
            Ultima salida
          </p>
          <h2 className="mt-2 text-xl font-semibold text-gray-900">Lo que PP ve ahora</h2>
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border bg-slate-50 p-4" style={{ borderColor: '#dce7e3' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#8fb2aa' }}>Ultimo reporte</p>
              <p className="mt-2 text-sm font-semibold" style={{ color: '#173634' }}>
                {latestReport?.title || 'No report yet'}
              </p>
              <p className="mt-2 text-sm leading-6" style={{ color: '#555a56' }}>
                {latestReport?.summary || 'Genera un reporte de CEO, director o vendedor para alimentar el ciclo de conocimiento de PP.'}
              </p>
            </div>

            <div className="rounded-2xl border bg-slate-50 p-4" style={{ borderColor: '#dce7e3' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#8fb2aa' }}>Barrio lider</p>
              <p className="mt-2 text-sm font-semibold" style={{ color: '#173634' }}>
                {latestMarket?.neighborhood || 'Vitacura'}
              </p>
              <p className="mt-2 text-sm leading-6" style={{ color: '#555a56' }}>
                {latestMarket
                  ? `${latestMarket.inventory_count} avisos - ${((latestMarket.absorption_rate || 0) * 100).toFixed(0)}% de absorcion y ${latestMarket.avg_days_on_market?.toFixed(0) || 's/d'} dias en mercado.`
                  : 'Esperando que market_data muestre el barrio mas activo.'}
              </p>
            </div>

            <div className="rounded-2xl border bg-slate-50 p-4" style={{ borderColor: '#dce7e3' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#b89a7e' }}>Mezcla de inventario</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-white p-3">
                  <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: '#9ca9a3' }}>Casas</p>
                  <p className="mt-1 text-xl font-semibold" style={{ color: '#173634' }}>{casas}</p>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: '#9ca9a3' }}>Deptos</p>
                  <p className="mt-1 text-xl font-semibold" style={{ color: '#173634' }}>{deptos}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border bg-white p-6 shadow-sm" style={{ borderColor: '#dce7e3' }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#8c9a95' }}>Foco Vitacura</p>
            <h2 className="mt-2 text-xl font-semibold text-gray-900">Barrios a vigilar</h2>
          </div>
          <span className="rounded-full border px-3 py-1 text-xs font-medium" style={{ borderColor: '#dce7e3', color: '#555a56' }}>
            Inteligencia por barrio
          </span>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {vitacuraNeighborhoodIntel.map((row) => (
            <div key={row.neighborhood} className="rounded-2xl border bg-slate-50 p-4" style={{ borderColor: '#dce7e3' }}>
              <p className="text-sm font-semibold" style={{ color: '#173634' }}>{row.neighborhood}</p>
              <p className="mt-2 text-sm leading-6" style={{ color: '#555a56' }}>
                {row.commercialFocus}
              </p>
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em]" style={{ color: '#8fb2aa' }}>
                Riesgo
              </p>
              <p className="mt-1 text-xs leading-5" style={{ color: '#9ca9a3' }}>
                {row.watchout}
              </p>
              <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em]" style={{ color: '#8fb2aa' }}>
                Mejor para
              </p>
              <p className="mt-1 text-xs leading-5" style={{ color: '#3f4a46' }}>
                {row.bestFor}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
