'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { buildVitacuraNeighborhoodIntelligence, filterVitacuraRows } from '@/lib/vitacura'
import { PP_AGENTS, PP_AUDIENCES, PP_AI_ESCALATIONS, PP_AI_LOOP, PP_AI_RULES, PP_NAME, PP_SCOPE, PP_STEPS } from '@/lib/pp-agent'

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

type RecommendationItem = {
  id: string
  title: string
  description: string
  nextAction: string
  expectedImpact: string
  responsible: string
  audience: 'seller' | 'director' | 'ceo'
  area: 'dedupe' | 'freshness' | 'market' | 'reports' | 'growth'
  neighborhood: string
  baseScore: number
  status: 'pending' | 'in_progress' | 'done' | 'dismissed'
  signals: string[]
}

type RecommendationFeedback = {
  useful: number
  ignored: number
  review: number
}

type RecommendationFeedbackEntry = {
  id: number
  recommendation_id: string
  title: string
  audience: 'seller' | 'director' | 'ceo'
  neighborhood: string | null
  area: 'dedupe' | 'freshness' | 'market' | 'reports' | 'growth'
  feedback_type: 'useful' | 'ignored' | 'review'
  responsible: string | null
  base_score: number
  notes: string | null
  created_at: string
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

function getRecommendationAreaLabel(area: RecommendationItem['area']) {
  if (area === 'dedupe') return 'Dedupe'
  if (area === 'freshness') return 'Frescura'
  if (area === 'market') return 'Mercado'
  if (area === 'reports') return 'Reportes'
  return 'Growth'
}

function feedbackDelta(feedback: RecommendationFeedback | undefined) {
  if (!feedback) return 0
  return (feedback.useful * 8) - (feedback.ignored * 10) + (feedback.review * 3)
}

function summarizeFeedbackEntries(entries: RecommendationFeedbackEntry[]) {
  const byRecommendation = new Map<string, RecommendationFeedback>()
  const byAudience = new Map<string, RecommendationFeedback>()
  const byNeighborhood = new Map<string, RecommendationFeedback>()

  for (const entry of entries) {
    const recKey = entry.recommendation_id
    const recBucket = byRecommendation.get(recKey) || { useful: 0, ignored: 0, review: 0 }
    recBucket[entry.feedback_type] += 1
    byRecommendation.set(recKey, recBucket)

    const audienceKey = entry.audience
    const audienceBucket = byAudience.get(audienceKey) || { useful: 0, ignored: 0, review: 0 }
    audienceBucket[entry.feedback_type] += 1
    byAudience.set(audienceKey, audienceBucket)

    const neighborhoodKey = normalizeText(entry.neighborhood || 'Vitacura') || 'vitacura'
    const neighborhoodBucket = byNeighborhood.get(neighborhoodKey) || { useful: 0, ignored: 0, review: 0 }
    neighborhoodBucket[entry.feedback_type] += 1
    byNeighborhood.set(neighborhoodKey, neighborhoodBucket)
  }

  return { byRecommendation, byAudience, byNeighborhood }
}

function PPMetricCard({ label, value, sub, accent }: MetricCard) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm" style={{ borderColor: '#e6eeeb', borderLeft: `4px solid ${accent}` }}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: '#8c9a95' }}>
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold" style={{ color: '#111111' }}>
        {value}
      </p>
      <p className="mt-2 text-sm" style={{ color: '#6b7280' }}>
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
  const [feedbackEntries, setFeedbackEntries] = useState<RecommendationFeedbackEntry[]>([])
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
          feedbackResponse,
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
          fetch('/api/pp/recommendations', { cache: 'no-store' }).then((res) => res.json()),
        ])

        setProperties((propertyData || []) as PropertyRow[])
        setScrapeRuns((runData || []) as ScrapeRunRow[])
        setMarketRows((marketData || []) as MarketRow[])
        setAiReports((reportData || []) as AiReportRow[])
        if (feedbackResponse?.entries) {
          setFeedbackEntries(feedbackResponse.entries as RecommendationFeedbackEntry[])
        }
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
  const feedbackSummary = useMemo(() => summarizeFeedbackEntries(feedbackEntries), [feedbackEntries])
  const freshnessDays = Math.min(
    ...[
      daysSince(latestRun?.created_at),
      daysSince(latestReport?.created_at),
    ].filter((value): value is number => value !== null),
    Number.POSITIVE_INFINITY,
  )
  const aiReadiness = useMemo(() => {
    const sourceBreadth = Math.min(100, uniqueSources * 20)
    const freshnessScore = Number.isFinite(freshnessDays) ? Math.max(0, 100 - Math.min(freshnessDays, 7) * 12) : 0
    const reportCoverage = Math.min(100, (reportCounts.ceo + reportCounts.director + reportCounts.seller) * 10)
    return Math.round((dedupeSignal.coverage * 0.35) + (sourceBreadth * 0.2) + (freshnessScore * 0.25) + (reportCoverage * 0.2))
  }, [dedupeSignal.coverage, freshnessDays, reportCounts.ceo, reportCounts.director, reportCounts.seller, uniqueSources])

  const recommendations = useMemo<RecommendationItem[]>(() => {
    const items: RecommendationItem[] = []
    const activeSources = new Set(vitacuraProperties.map((property) => property.source || '').filter(Boolean)).size
    const staleRisk = Number.isFinite(freshnessDays) ? freshnessDays >= 2 : true
    const weakDedupe = dedupeSignal.coverage < 94 || dedupeSignal.duplicates > 4
    const reportGap = Math.max(0, 4 - (reportCounts.ceo + reportCounts.director + reportCounts.seller))

    if (staleRisk) {
      items.push({
        id: 'refresh-sources',
      title: 'Refrescar fuentes con menor frescura',
      description: 'Hay riesgo de que el inventario operativo se quede atrasado frente al mercado real de Vitacura.',
      nextAction: 'Revalidar scrapes, revisar fallos y reinyectar las fuentes mas valiosas primero.',
      expectedImpact: 'Menor obsolescencia de inventario y mejores lecturas comerciales diarias.',
        responsible: 'Monitoreo',
        audience: 'director',
        area: 'freshness',
        neighborhood: latestMarket?.neighborhood || 'Vitacura',
        baseScore: staleRisk ? 92 : 68,
        status: staleRisk ? 'in_progress' : 'pending',
        signals: [
          `Freshness ${Number.isFinite(freshnessDays) ? `${freshnessDays}d` : 'n/a'}`,
          `${activeSources} fuentes activas`,
          latestRun ? `Ultimo run ${latestRun.source}` : 'Sin ultimo run',
      ],
      })
    }

    if (weakDedupe) {
      items.push({
        id: 'dedupe-review',
        title: 'Revisar merges de alta ambiguedad',
        description: 'La calidad del canon puede degradarse si el dedupe se queda corto en barrio, tipo o direccion.',
        nextAction: 'Auditar los merges dudosos y congelar cualquier caso con evidencia incompleta.',
        expectedImpact: 'Base canonica mas confiable para pricing, reportes y captacion.',
        responsible: 'Dedupe',
        audience: 'ceo',
        area: 'dedupe',
        neighborhood: latestMarket?.neighborhood || 'Vitacura',
        baseScore: weakDedupe ? 96 : 70,
        status: weakDedupe ? 'in_progress' : 'pending',
        signals: [
          `Cobertura dedupe ${dedupeSignal.coverage}%`,
          `${dedupeSignal.duplicates} posibles duplicados`,
          `${dedupeSignal.unique} claves canonicas`,
        ],
      })
    }

    if (reportGap > 0) {
      items.push({
        id: 'generate-reports',
        title: 'Completar cobertura de reportes por rol',
        description: 'Faltan salidas recientes para alimentar el ciclo de decision por audiencia.',
        nextAction: 'Generar un nuevo reporte para el rol con menor cobertura y usarlo como base de coaching.',
        expectedImpact: 'Mejor alineacion entre lectura ejecutiva, gestion y ejecucion diaria.',
        responsible: 'Reportes',
        audience: 'seller',
        area: 'reports',
        neighborhood: latestMarket?.neighborhood || 'Vitacura',
        baseScore: 78 + reportGap * 4,
        status: 'pending',
        signals: [
          `Reportes totales ${reportCounts.ceo + reportCounts.director + reportCounts.seller}`,
          `Gap operativo ${reportGap}`,
          `AI readiness ${aiReadiness}%`,
        ],
      })
    }

    items.push({
      id: 'market-watch',
      title: 'Priorizar barrios con mejor absorcion',
      description: 'El ranking de barrios debe empujar el trabajo comercial hacia zonas con mejor traccion y menor friccion.',
      nextAction: 'Asignar foco a los barrios lideres y traducirlo en playbook para vendedor y director.',
      expectedImpact: 'Mejor velocidad de cierre y mejor uso del pipeline comercial.',
      responsible: 'Mercado',
      audience: 'director',
      area: 'market',
      neighborhood: latestMarket?.neighborhood || 'Vitacura',
      baseScore: 84 + Math.min(10, Math.round((latestMarket?.absorption_rate || 0) * 100)),
      status: 'pending',
      signals: [
        latestMarket ? `Barrio lider ${latestMarket.neighborhood}` : 'Sin barrio lider',
        latestMarket ? `Absorcion ${(latestMarket.absorption_rate || 0) * 100}%` : 'Sin absorcion',
        latestMarket ? `Inventario ${latestMarket.inventory_count}` : 'Sin inventario',
      ],
    })

    items.push({
      id: 'seller-playbook',
      title: 'Reforzar el playbook de vendedor',
      description: 'El flujo de ejecucion necesita convertir la lectura de mercado en acciones concretas del dia.',
      nextAction: 'Enviar el top 3 de propiedades y barrios al equipo vendedor con un solo siguiente paso por item.',
      expectedImpact: 'Mejor disciplina diaria y menos trabajo disperso en inventario marginal.',
      responsible: 'Ventas',
      audience: 'seller',
      area: 'growth',
      neighborhood: latestMarket?.neighborhood || 'Vitacura',
      baseScore: 74 + (reportCounts.seller * 3),
      status: 'pending',
      signals: [
        `${reportCounts.seller} reportes de vendedor`,
        `${casas} casas canonicas`,
        `${withLinks} propiedades con link`,
      ],
    })

    return items
      .map((item) => {
        const score = item.baseScore + feedbackDelta(feedbackSummary.byRecommendation.get(item.id))
        return {
          ...item,
          baseScore: score,
        }
      })
      .sort((a, b) => b.baseScore - a.baseScore)
  }, [
    aiReadiness,
    casas,
    dedupeSignal.coverage,
    dedupeSignal.duplicates,
    dedupeSignal.unique,
    feedbackSummary.byRecommendation,
    freshnessDays,
    latestMarket?.absorption_rate,
    latestMarket?.inventory_count,
    latestMarket?.neighborhood,
    latestRun,
    reportCounts.ceo,
    reportCounts.director,
    reportCounts.seller,
    vitacuraProperties,
    withLinks,
  ])

  const recommendationHealth = useMemo(() => {
    const useful = feedbackEntries.reduce((sum, entry) => sum + (entry.feedback_type === 'useful' ? 1 : 0), 0)
    const ignored = feedbackEntries.reduce((sum, entry) => sum + (entry.feedback_type === 'ignored' ? 1 : 0), 0)
    const review = feedbackEntries.reduce((sum, entry) => sum + (entry.feedback_type === 'review' ? 1 : 0), 0)
    const total = useful + ignored + review
    const adoption = total ? Math.round((useful / total) * 100) : 0
    return { useful, ignored, review, total, adoption }
  }, [feedbackEntries])

  const effectiveAiReadiness = Math.round((aiReadiness * 0.8) + (recommendationHealth.adoption * 0.2))

  async function registerFeedback(recommendation: RecommendationItem, mode: 'useful' | 'ignored' | 'review') {
    try {
      const response = await fetch('/api/pp/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recommendation_id: recommendation.id,
          title: recommendation.title,
          audience: recommendation.audience,
          neighborhood: recommendation.neighborhood,
          area: recommendation.area,
          feedback_type: mode,
          responsible: recommendation.responsible,
          base_score: recommendation.baseScore,
        }),
      })

      const json = await response.json()
      if (!response.ok) {
        throw new Error(json.error || 'No pudimos guardar el feedback.')
      }

      if (json.entry) {
        setFeedbackEntries((current) => [json.entry as RecommendationFeedbackEntry, ...current])
      } else {
        const refreshResponse = await fetch('/api/pp/recommendations', { cache: 'no-store' })
        const refreshJson = await refreshResponse.json()
        if (refreshJson.entries) {
          setFeedbackEntries(refreshJson.entries as RecommendationFeedbackEntry[])
        }
      }
    } catch (error) {
      console.error('Error saving recommendation feedback:', error)
    }
  }

  const metrics: MetricCard[] = [
    {
      label: 'Inventario cargado',
      value: fmt(vitacuraProperties.length),
      sub: `${casas} casas y ${deptos} departamentos`,
      accent: '#d61f2c',
    },
    {
      label: 'Fuentes activas',
      value: fmt(uniqueSources),
      sub: `${withLinks} con link y ${withPhotos} con foto`,
      accent: '#6b7280',
    },
    {
      label: 'Dedupe fuerte',
      value: `${dedupeSignal.coverage}%`,
      sub: `${dedupeSignal.duplicates} posibles duplicados en la vista`,
      accent: '#d61f2c',
    },
    {
      label: 'Actualizacion',
      value: Number.isFinite(freshnessDays) ? `${freshnessDays}d` : 's/d',
      sub: latestRun ? `Ultimo scrape ${latestRun.source}` : 'Sin scrape reciente',
      accent: '#111111',
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
        <div className="text-sm" style={{ color: '#6b7280' }}>Cargando PP...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="rounded-3xl border bg-white p-6 shadow-sm" style={{ borderColor: '#dce7e3' }}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#d61f2c' }}>
              {PP_NAME} Inteligencia de Mercado
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              Agente senior para ventas en Vitacura
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6" style={{ color: '#374151' }}>
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
            <span className="rounded-full border px-3 py-1 text-xs font-medium" style={{ borderColor: '#dce7e3', color: '#374151' }}>
              4 fases
            </span>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            {PP_STEPS.map((step) => (
              <div key={step.id} className="rounded-2xl border bg-slate-50 p-4" style={{ borderColor: '#dce7e3' }}>
                <p className="text-sm font-semibold" style={{ color: '#111111' }}>{step.title}</p>
                <p className="mt-2 text-sm leading-6" style={{ color: '#374151' }}>{step.description}</p>
                <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em]" style={{ color: '#d61f2c' }}>
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
            <span className="rounded-full border px-3 py-1 text-xs font-medium" style={{ borderColor: '#dce7e3', color: '#374151' }}>
              5 agents
            </span>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            {PP_AGENTS.map((agent) => (
              <div key={agent.key} className="rounded-2xl border bg-slate-50 p-4" style={{ borderColor: '#dce7e3' }}>
                <p className="text-sm font-semibold" style={{ color: '#111111' }}>{agent.title}</p>
                <p className="mt-2 text-sm leading-6" style={{ color: '#374151' }}>{agent.mission}</p>
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
                <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em]" style={{ color: '#d61f2c' }}>
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
            <span className="rounded-full border px-3 py-1 text-xs font-medium" style={{ borderColor: '#dce7e3', color: '#374151' }}>
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
                      <p className="text-sm font-semibold" style={{ color: '#111111' }}>{audience.title}</p>
                      <p className="mt-1 text-sm leading-6" style={{ color: '#374151' }}>{audience.description}</p>
                    </div>
                    <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: '#f9fafb', color: '#111111' }}>
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
            <span className="rounded-full border px-3 py-1 text-xs font-medium" style={{ borderColor: '#dce7e3', color: '#374151' }}>
              {scrapeRuns.length} runs
            </span>
          </div>
          <div className="mt-5 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={runChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2ef" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #dce7e3', borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="scraped" radius={[6, 6, 0, 0]} name="Scraped" fill="#e5e7eb">
                  {runChartData.map((entry, index) => (
                    <Cell key={entry.label + index} fill={index % 2 === 0 ? '#d61f2c' : '#6b7280'} />
                  ))}
                </Bar>
                <Bar dataKey="inserted" radius={[6, 6, 0, 0]} name="Inserted" fill="#d61f2c" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            {scrapeRuns.slice(0, 4).map((run, index) => (
              <div key={`${run.source}-${index}`} className="rounded-2xl border bg-slate-50 p-4" style={{ borderColor: '#dce7e3' }}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold" style={{ color: '#111111' }}>{run.source}</p>
                  <span className="rounded-full px-2 py-1 text-[11px] font-medium" style={{ background: run.status === 'success' ? '#f9fafb' : '#fff7ed', color: run.status === 'success' ? '#166534' : '#c2410c' }}>
                    {run.status}
                  </span>
                </div>
                <p className="mt-2 text-sm" style={{ color: '#374151' }}>
                  {run.scraped_count} capturadas, {run.inserted_count} insertadas, {run.skipped_count} omitidas, {run.error_count} errores
                </p>
                <p className="mt-1 text-xs" style={{ color: '#6b7280' }}>
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
              <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#d61f2c' }}>Ultimo reporte</p>
              <p className="mt-2 text-sm font-semibold" style={{ color: '#111111' }}>
                {latestReport?.title || 'No report yet'}
              </p>
              <p className="mt-2 text-sm leading-6" style={{ color: '#374151' }}>
                {latestReport?.summary || 'Genera un reporte de CEO, director o vendedor para alimentar el ciclo de conocimiento de PP.'}
              </p>
            </div>

            <div className="rounded-2xl border bg-slate-50 p-4" style={{ borderColor: '#dce7e3' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#d61f2c' }}>Barrio lider</p>
              <p className="mt-2 text-sm font-semibold" style={{ color: '#111111' }}>
                {latestMarket?.neighborhood || 'Vitacura'}
              </p>
              <p className="mt-2 text-sm leading-6" style={{ color: '#374151' }}>
                {latestMarket
                  ? `${latestMarket.inventory_count} avisos - ${((latestMarket.absorption_rate || 0) * 100).toFixed(0)}% de absorcion y ${latestMarket.avg_days_on_market?.toFixed(0) || 's/d'} dias en mercado.`
                  : 'Esperando que market_data muestre el barrio mas activo.'}
              </p>
            </div>

            <div className="rounded-2xl border bg-slate-50 p-4" style={{ borderColor: '#dce7e3' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#6b7280' }}>Mezcla de inventario</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-white p-3">
                  <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: '#6b7280' }}>Casas</p>
                  <p className="mt-1 text-xl font-semibold" style={{ color: '#111111' }}>{casas}</p>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: '#6b7280' }}>Deptos</p>
                  <p className="mt-1 text-xl font-semibold" style={{ color: '#111111' }}>{deptos}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border bg-white p-6 shadow-sm" style={{ borderColor: '#dce7e3' }}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#8c9a95' }}>AI control plane</p>
              <h2 className="mt-2 text-xl font-semibold text-gray-900">How PP reasons before answering</h2>
            </div>
            <span className="rounded-full border px-3 py-1 text-xs font-medium" style={{ borderColor: '#dce7e3', color: '#374151' }}>
              AI readiness {aiReadiness}%
            </span>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            {PP_AI_LOOP.map((step, index) => (
              <div key={step.id} className="rounded-2xl border bg-slate-50 p-4" style={{ borderColor: '#dce7e3' }}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold" style={{ color: '#111111' }}>
                    {index + 1}. {step.title}
                  </p>
                  <span className="rounded-full bg-white px-2 py-1 text-[11px] font-medium" style={{ color: '#8c9a95' }}>
                    {step.id}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6" style={{ color: '#374151' }}>{step.description}</p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: '#d61f2c' }}>
                  Input
                </p>
                <p className="mt-1 text-sm" style={{ color: '#3f4a46' }}>{step.input}</p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: '#d61f2c' }}>
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
              <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#8c9a95' }}>Prompt contract</p>
              <h2 className="mt-2 text-xl font-semibold text-gray-900">Rules and escalation logic</h2>
            </div>
            <span className="rounded-full border px-3 py-1 text-xs font-medium" style={{ borderColor: '#dce7e3', color: '#374151' }}>
              Guardrails + fallback
            </span>
          </div>

          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border bg-slate-50 p-4" style={{ borderColor: '#dce7e3' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: '#d61f2c' }}>Rules</p>
              <div className="mt-3 space-y-3">
                {PP_AI_RULES.map((rule) => (
                  <div key={rule.title} className="rounded-xl bg-white px-4 py-3">
                    <p className="text-sm font-semibold" style={{ color: '#111111' }}>{rule.title}</p>
                    <p className="mt-1 text-sm leading-6" style={{ color: '#374151' }}>{rule.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border bg-slate-50 p-4" style={{ borderColor: '#dce7e3' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: '#6b7280' }}>Escalation</p>
              <div className="mt-3 space-y-3">
                {PP_AI_ESCALATIONS.map((rule) => (
                  <div key={rule.title} className="rounded-xl bg-white px-4 py-3">
                    <p className="text-sm font-semibold" style={{ color: '#111111' }}>{rule.title}</p>
                    <p className="mt-1 text-sm leading-6" style={{ color: '#374151' }}>{rule.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border bg-white p-6 shadow-sm" style={{ borderColor: '#dce7e3' }}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#8c9a95' }}>Recommendations</p>
              <h2 className="mt-2 text-xl font-semibold text-gray-900">AI recommendations ranked by feedback</h2>
            </div>
            <span className="rounded-full border px-3 py-1 text-xs font-medium" style={{ borderColor: '#dce7e3', color: '#374151' }}>
              {recommendations.length} active
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {recommendations.map((recommendation) => {
              const feedback = feedbackSummary.byRecommendation.get(recommendation.id) || { useful: 0, ignored: 0, review: 0 }
              return (
                <article key={recommendation.id} className="rounded-2xl border bg-slate-50 p-4" style={{ borderColor: '#dce7e3' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold" style={{ color: '#111111' }}>{recommendation.title}</p>
                        <span className="rounded-full px-2 py-1 text-[11px] font-medium" style={{ background: '#fff', color: '#8c9a95' }}>
                          {getRecommendationAreaLabel(recommendation.area)}
                        </span>
                        <span className="rounded-full px-2 py-1 text-[11px] font-medium" style={{ background: '#fff', color: '#8c9a95' }}>
                          {recommendation.audience}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6" style={{ color: '#374151' }}>{recommendation.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: '#d61f2c' }}>Rank</p>
                      <p className="mt-1 text-2xl font-semibold" style={{ color: '#111111' }}>{recommendation.baseScore}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: '#8c9a95' }}>Next action</p>
                      <p className="mt-2 text-sm leading-6" style={{ color: '#3f4a46' }}>{recommendation.nextAction}</p>
                    </div>
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: '#8c9a95' }}>Expected impact</p>
                      <p className="mt-2 text-sm leading-6" style={{ color: '#3f4a46' }}>{recommendation.expectedImpact}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {recommendation.signals.map((signal) => (
                      <div key={signal} className="rounded-xl bg-white px-3 py-2 text-xs leading-5" style={{ color: '#374151' }}>
                        {signal}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void registerFeedback(recommendation, 'useful')}
                        className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-red-50"
                        style={{ background: '#f9fafb', color: '#166534' }}
                      >
                        Util
                      </button>
                      <button
                        type="button"
                        onClick={() => void registerFeedback(recommendation, 'review')}
                        className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-amber-50"
                        style={{ background: '#f5f1ed', color: '#a16207' }}
                      >
                        Revisar
                      </button>
                      <button
                        type="button"
                        onClick={() => void registerFeedback(recommendation, 'ignored')}
                        className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-rose-50"
                        style={{ background: '#f8faf9', color: '#b91c1c' }}
                      >
                        Ignorar
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-xs" style={{ color: '#8c9a95' }}>
                      <span>Feedback U:{feedback.useful}</span>
                      <span>R:{feedback.review}</span>
                      <span>I:{feedback.ignored}</span>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-6 shadow-sm" style={{ borderColor: '#dce7e3' }}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#8c9a95' }}>Feedback loop</p>
              <h2 className="mt-2 text-xl font-semibold text-gray-900">What the model learns from usage</h2>
            </div>
            <span className="rounded-full border px-3 py-1 text-xs font-medium" style={{ borderColor: '#dce7e3', color: '#374151' }}>
              Adoption {recommendationHealth.adoption}%
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border bg-slate-50 p-4" style={{ borderColor: '#dce7e3' }}>
              <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: '#8c9a95' }}>Useful</p>
              <p className="mt-2 text-2xl font-semibold" style={{ color: '#111111' }}>{recommendationHealth.useful}</p>
            </div>
            <div className="rounded-2xl border bg-slate-50 p-4" style={{ borderColor: '#dce7e3' }}>
              <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: '#8c9a95' }}>Ignored</p>
              <p className="mt-2 text-2xl font-semibold" style={{ color: '#111111' }}>{recommendationHealth.ignored}</p>
            </div>
            <div className="rounded-2xl border bg-slate-50 p-4" style={{ borderColor: '#dce7e3' }}>
              <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: '#8c9a95' }}>Review</p>
              <p className="mt-2 text-2xl font-semibold" style={{ color: '#111111' }}>{recommendationHealth.review}</p>
            </div>
            <div className="rounded-2xl border bg-slate-50 p-4" style={{ borderColor: '#dce7e3' }}>
              <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: '#8c9a95' }}>AI readiness</p>
              <p className="mt-2 text-2xl font-semibold" style={{ color: '#111111' }}>{effectiveAiReadiness}%</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border bg-slate-50 p-4" style={{ borderColor: '#dce7e3' }}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: '#d61f2c' }}>Ranking signal</p>
            <p className="mt-2 text-sm leading-6" style={{ color: '#374151' }}>
              El orden de recomendaciones cambia segun el feedback real. Las sugerencias que el equipo marca como utiles suben de prioridad y las que
              se ignoran caen. Eso alimenta el siguiente reporte por audiencia y evita repetir hallazgos que no se usan.
            </p>
          </div>

          <div className="mt-5 grid gap-3">
            <div className="rounded-2xl border bg-slate-50 p-4" style={{ borderColor: '#dce7e3' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: '#8c9a95' }}>By audience</p>
              <div className="mt-3 space-y-2">
                {(['ceo', 'director', 'seller'] as const).map((audience) => {
                  const audienceFeedback = feedbackSummary.byAudience.get(audience) || { useful: 0, ignored: 0, review: 0 }
                  const total = audienceFeedback.useful + audienceFeedback.ignored + audienceFeedback.review
                  const adoption = total ? Math.round((audienceFeedback.useful / total) * 100) : 0
                  return (
                    <div key={audience} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm">
                      <span style={{ color: '#111111' }}>{audience}</span>
                      <span style={{ color: '#8c9a95' }}>
                        {total} feedback · {adoption}% utile
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-2xl border bg-slate-50 p-4" style={{ borderColor: '#dce7e3' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: '#6b7280' }}>By neighborhood</p>
              <div className="mt-3 space-y-2">
                {[...feedbackSummary.byNeighborhood.entries()].slice(0, 4).map(([neighborhood, data]) => {
                  const total = data.useful + data.ignored + data.review
                  const adoption = total ? Math.round((data.useful / total) * 100) : 0
                  return (
                    <div key={neighborhood} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm">
                      <span style={{ color: '#111111' }}>{neighborhood}</span>
                      <span style={{ color: '#8c9a95' }}>
                        {total} feedback · {adoption}% utile
                      </span>
                    </div>
                  )
                })}
                {feedbackSummary.byNeighborhood.size === 0 && (
                  <div className="rounded-xl bg-white px-3 py-2 text-sm" style={{ color: '#8c9a95' }}>
                    Aun no hay feedback por barrio.
                  </div>
                )}
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
          <span className="rounded-full border px-3 py-1 text-xs font-medium" style={{ borderColor: '#dce7e3', color: '#374151' }}>
            Inteligencia por barrio
          </span>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {vitacuraNeighborhoodIntel.map((row) => (
            <div key={row.neighborhood} className="rounded-2xl border bg-slate-50 p-4" style={{ borderColor: '#dce7e3' }}>
              <p className="text-sm font-semibold" style={{ color: '#111111' }}>{row.neighborhood}</p>
              <p className="mt-2 text-sm leading-6" style={{ color: '#374151' }}>
                {row.commercialFocus}
              </p>
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em]" style={{ color: '#d61f2c' }}>
                Riesgo
              </p>
              <p className="mt-1 text-xs leading-5" style={{ color: '#6b7280' }}>
                {row.watchout}
              </p>
              <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em]" style={{ color: '#d61f2c' }}>
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

