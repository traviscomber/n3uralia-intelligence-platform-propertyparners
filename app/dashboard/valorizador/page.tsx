'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, Home, DollarSign, BarChart2, RefreshCw, Download, FileText, Send } from 'lucide-react'
import {
  buildFallbackValuationAnalysis,
  type ValuationAnalysis,
  type ValuationComparable,
  type ValuationRequest,
} from '@/lib/valuation-ai'

interface Neighborhood {
  name: string
  price_per_sqm_uf: number
  velocity_days: number
  absorption_rate: number
  inventory_count: number
  zona_prc: string
}

interface ExternalBenchmark {
  source: string
  source_url: string
  neighborhood: string
  listing_title: string | null
  offer_count: number
  low_price_clp: number | null
  high_price_clp: number | null
  price_currency: string | null
  recorded_at: string
}

interface PropertyComparable {
  id: string
  address: string
  neighborhood: string
  price_uf: number
  area_m2: number
  bedrooms: number
  bathrooms: number
  status: string
  days_on_market: number
  created_at: string
  source?: string | null
  latitude?: number | null
  longitude?: number | null
}

interface ValorizationResult {
  price_uf: number
  price_uf_m2: number
  price_clp: number
  confidence: number
  comp_neighborhood: string
  market_velocity: number
  market_absorption: number
  comparable_properties: number
  comparable_source: string
  comparable_range_uf: string
}

interface ValuationHistoryItem {
  quote_key: string
  neighborhood: string
  estimated_uf: number
  publication_price_uf: number
  closing_price_uf: number
  confidence: number
  created_at: string
}

const UF_VALUE = 37500

function sourceQualityWeight(source?: string | null) {
  switch ((source || '').toLowerCase()) {
    case 'portal_inmobiliario':
      return 14
    case 'icasas_search':
      return 12
    case 'yapo_search':
      return 10
    case 'toctoc_search':
      return 9
    case 'manual':
      return 6
    default:
      return 8
  }
}

function daysSince(iso?: string | null) {
  if (!iso) return Number.POSITIVE_INFINITY
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return Number.POSITIVE_INFINITY
  return (Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24)
}

export default function ValorizadorPage() {
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([])
  const [properties, setProperties] = useState<PropertyComparable[]>([])
  const [externalBenchmark, setExternalBenchmark] = useState<ExternalBenchmark | null>(null)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [result, setResult] = useState<ValorizationResult | null>(null)
  const [comparables, setComparables] = useState<ValuationComparable[]>([])
  const [aiAnalysis, setAiAnalysis] = useState<ValuationAnalysis | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [roleReportLoading, setRoleReportLoading] = useState<string | null>(null)
  const [roleReportMessage, setRoleReportMessage] = useState<string | null>(null)
  const [roleReportError, setRoleReportError] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [history, setHistory] = useState<ValuationHistoryItem[]>([])
  const [historyNeighborhoodFilter, setHistoryNeighborhoodFilter] = useState('all')
  const analysisSeq = useRef(0)

  const [form, setForm] = useState({
    neighborhood: '',
    area_m2: '100',
    bedrooms: '3',
    bathrooms: '2',
    age_years: '5',
    floor: '3',
    has_parking: true,
    has_storage: false,
    has_pool: false,
    condition: 'bueno' as 'excelente' | 'bueno' | 'regular' | 'a_renovar',
  })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [nRes, pRes, bRes, qRes] = await Promise.all([
        supabase
          .from('neighborhoods')
          .select('name, price_per_sqm_uf, velocity_days, absorption_rate, inventory_count, zona_prc')
          .not('barrio_id', 'is', null)
          .order('price_per_sqm_uf', { ascending: false }),
        supabase
          .from('properties')
          .select('id, address, neighborhood, price_uf, area_m2, bedrooms, bathrooms, status, days_on_market, created_at, source, latitude, longitude')
          .order('created_at', { ascending: false })
          .limit(250),
        supabase
          .from('external_market_benchmarks')
          .select('source, source_url, neighborhood, listing_title, offer_count, low_price_clp, high_price_clp, price_currency, recorded_at')
          .order('recorded_at', { ascending: false })
          .limit(1),
        supabase
          .from('valuation_quotes')
          .select('quote_key, neighborhood, estimated_uf, publication_price_uf, closing_price_uf, confidence, created_at')
          .order('created_at', { ascending: false })
          .limit(200),
      ])

      setNeighborhoods((nRes.data || []) as Neighborhood[])
      setProperties((pRes.data || []) as PropertyComparable[])
      setExternalBenchmark((bRes.data?.[0] || null) as ExternalBenchmark | null)
      setHistory((qRes.data || []) as ValuationHistoryItem[])

      if (nRes.data && nRes.data.length > 0) {
        setForm((f) => ({ ...f, neighborhood: nRes.data[0].name }))
      }

      setLoading(false)
    }

    void load()
  }, [])

  const selectedNb = useMemo(
    () => neighborhoods.find((n) => n.name === form.neighborhood) || null,
    [form.neighborhood, neighborhoods],
  )

  const selectedBands = useMemo(() => {
    if (!result || !selectedNb) return null
    const analysis: ValuationAnalysis = aiAnalysis || buildFallbackValuationAnalysis({
      neighborhood: selectedNb,
      area_m2: Number(form.area_m2),
      bedrooms: Number(form.bedrooms),
      bathrooms: Number(form.bathrooms),
      age_years: Number(form.age_years),
      floor: Number(form.floor),
      condition: form.condition,
      has_parking: form.has_parking,
      has_storage: form.has_storage,
      has_pool: form.has_pool,
      estimated_uf: result.price_uf,
      estimated_uf_m2: result.price_uf_m2,
      estimated_clp: result.price_clp,
      confidence: result.confidence,
      comparable_source: result.comparable_source,
      comparable_range_uf: result.comparable_range_uf,
      market_velocity: result.market_velocity,
      market_absorption: result.market_absorption,
      comparable_properties: result.comparable_properties,
      selected_comparables: comparables,
      benchmark: externalBenchmark,
    })

    return {
      publication: analysis.price_bands.find((band) => band.label === 'aspiracional')?.value_uf || result.price_uf,
      closing: analysis.price_bands.find((band) => band.label === 'mercado')?.value_uf || result.price_uf,
      floor: analysis.price_bands.find((band) => band.label === 'piso_negociacion')?.value_uf || result.price_uf,
      analysis,
    }
  }, [aiAnalysis, comparables, externalBenchmark, form, result, selectedNb])

  const historyNeighborhoodOptions = useMemo(
    () => [...new Set(history.map((item) => item.neighborhood).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [history],
  )

  const visibleHistory = useMemo(() => {
    if (historyNeighborhoodFilter === 'all') return history
    return history.filter((item) => item.neighborhood === historyNeighborhoodFilter)
  }, [history, historyNeighborhoodFilter])

  const comparisonSummary = useMemo(() => {
    if (!result) return null
    const previous = visibleHistory[0] || null
    const averageClosing = visibleHistory.length
      ? visibleHistory.reduce((sum, item) => sum + Number(item.closing_price_uf || 0), 0) / visibleHistory.length
      : result.price_uf
    const averageConfidence = visibleHistory.length
      ? visibleHistory.reduce((sum, item) => sum + Number(item.confidence || 0), 0) / visibleHistory.length
      : result.confidence
    return {
      previous,
      averageClosing,
      averageConfidence,
    }
  }, [result, visibleHistory])

  const neighborhoodComparison = useMemo(() => {
    if (!result) return null

    const grouped = new Map<string, ValuationHistoryItem[]>()
    visibleHistory.forEach((item) => {
      const list = grouped.get(item.neighborhood) || []
      list.push(item)
      grouped.set(item.neighborhood, list)
    })

    const rows = [...grouped.entries()]
      .map(([neighborhood, items]) => {
        const sorted = items
          .map((item) => Number(item.closing_price_uf || 0))
          .filter((value) => Number.isFinite(value) && value > 0)
          .sort((a, b) => a - b)
        const percentile = (p: number) => {
          if (!sorted.length) return 0
          const index = (sorted.length - 1) * p
          const lower = Math.floor(index)
          const upper = Math.ceil(index)
          if (lower === upper) return sorted[lower]
          return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower)
        }
        const averageClosing = items.reduce((sum, item) => sum + Number(item.closing_price_uf || 0), 0) / items.length
        return {
          neighborhood,
          averageClosing,
          count: items.length,
          p25: percentile(0.25),
          p50: percentile(0.5),
          p75: percentile(0.75),
        }
      })
      .sort((a, b) => b.averageClosing - a.averageClosing)

    const currentNeighborhood = rows.find((row) => row.neighborhood === result.comp_neighborhood) || {
      neighborhood: result.comp_neighborhood,
      averageClosing: result.price_uf,
      count: 0,
      p25: result.price_uf,
      p50: result.price_uf,
      p75: result.price_uf,
    }

    const maxValue = Math.max(result.price_uf, ...rows.slice(0, 4).map((row) => row.averageClosing))

    return {
      currentNeighborhood,
      rows: rows.slice(0, 4),
      maxValue,
      totalRows: rows.length,
    }
  }, [result, visibleHistory])

  function buildValuationRequest(): ValuationRequest | null {
    if (!result || !selectedNb) return null

    return {
      neighborhood: selectedNb,
      area_m2: Number(form.area_m2),
      bedrooms: Number(form.bedrooms),
      bathrooms: Number(form.bathrooms),
      age_years: Number(form.age_years),
      floor: Number(form.floor),
      condition: form.condition,
      has_parking: form.has_parking,
      has_storage: form.has_storage,
      has_pool: form.has_pool,
      estimated_uf: result.price_uf,
      estimated_uf_m2: result.price_uf_m2,
      estimated_clp: result.price_clp,
      confidence: result.confidence,
      comparable_source: result.comparable_source,
      comparable_range_uf: result.comparable_range_uf,
      market_velocity: result.market_velocity,
      market_absorption: result.market_absorption,
      comparable_properties: result.comparable_properties,
      selected_comparables: comparables,
      benchmark: externalBenchmark,
    }
  }

  const exportQuery = useMemo(() => {
    const params = new URLSearchParams()
    if (historyNeighborhoodFilter !== 'all') {
      params.set('neighborhood', historyNeighborhoodFilter)
    }
    return params.toString()
  }, [historyNeighborhoodFilter])

  function exportUrl(format: 'csv' | 'xlsx') {
    const params = new URLSearchParams(exportQuery)
    params.set('format', format)
    return `/api/valorizador/export?${params.toString()}`
  }

  function buildComparables(
    targetNeighborhood: string,
    targetArea: number,
    targetBedrooms: number,
    targetBathrooms: number,
    baseUFm2: number,
    estimateUF: number,
  ) {
    const neighborhoodPool = properties.filter((property) => property.neighborhood === targetNeighborhood)
    const candidatePool = neighborhoodPool.length >= 3 ? neighborhoodPool : properties
    const recentCutoffDays = 180

    return candidatePool
      .map((property) => {
        const areaDeltaRatio = Math.abs(property.area_m2 - targetArea) / Math.max(targetArea, property.area_m2, 1)
        const bedroomDelta = Math.abs(property.bedrooms - targetBedrooms)
        const bathroomDelta = Math.abs(property.bathrooms - targetBathrooms)
        const pricePerM2 = property.area_m2 > 0 ? property.price_uf / property.area_m2 : property.price_uf
        const referenceGapPct = baseUFm2 > 0 ? Math.abs(pricePerM2 - baseUFm2) / baseUFm2 : 0
        const status = property.status?.toLowerCase() || 'activo'
        const recencyDays = daysSince(property.created_at)
        const marketAgePenalty = Number.isFinite(recencyDays) ? Math.min(14, recencyDays / 15) : 6
        const onMarketPenalty = Math.min(8, (property.days_on_market || 0) / 18)
        const sourceBonus = sourceQualityWeight(property.source)
        const neighborhoodBonus = property.neighborhood === targetNeighborhood ? 18 : 0
        const areaScore = Math.max(0, 28 - areaDeltaRatio * 35)
        const bedroomScore = Math.max(0, 16 - bedroomDelta * 6)
        const bathroomScore = Math.max(0, 12 - bathroomDelta * 5)
        const priceMatchScore = baseUFm2 > 0
          ? Math.max(0, 20 - referenceGapPct * 20)
          : 10
        const marketAlignmentScore = baseUFm2 > 0
          ? Math.max(0, 12 - referenceGapPct * 12)
          : 6
        const freshnessScore = Number.isFinite(recencyDays) && recencyDays <= recentCutoffDays
          ? Math.max(0, 12 - recencyDays / 16)
          : 2
        const soldPenalty = status.includes('vend') ? 10 : 0
        const score = Math.max(
          0,
          Math.min(
            100,
            neighborhoodBonus
              + areaScore
              + bedroomScore
              + bathroomScore
              + priceMatchScore
              + marketAlignmentScore
              + freshnessScore
              + sourceBonus
              - marketAgePenalty
              - onMarketPenalty
              - soldPenalty,
          ),
        )
        const similarity = score
        const reasons = [
          property.neighborhood === targetNeighborhood ? 'same neighborhood' : 'nearby inventory',
          sourceBonus >= 12 ? 'strong source' : 'market source',
          areaDeltaRatio <= 0.15 ? 'area match' : 'area variance',
          referenceGapPct <= 0.1 ? 'market aligned' : 'market spread',
          bedroomDelta === 0 ? 'bedroom match' : 'bedroom variance',
          bathroomDelta === 0 ? 'bathroom match' : 'bathroom variance',
        ]

        return {
          id: property.id,
          address: property.address,
          neighborhood: property.neighborhood,
          price_uf: property.price_uf,
          area_m2: property.area_m2,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          status: property.status,
          source: property.source,
          similarity,
          score,
          price_per_m2: pricePerM2,
          delta_to_estimate_uf: property.price_uf - estimateUF,
          match_label: reasons.slice(0, 3).join(' � '),
        }
      })
      .filter((item) => item.score >= 35)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
  }

  async function requestAiAnalysis(payload: ValuationRequest) {
    const currentSeq = ++analysisSeq.current
    setAiLoading(true)
    setAiError(null)

    try {
      const response = await fetch('/api/valorizador/analisis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Analisis IA respondio con estado ${response.status}`)
      }

      const data = await response.json().catch(() => ({}))
      const analysis = (data?.analysis as ValuationAnalysis | undefined) || buildFallbackValuationAnalysis(payload)

      if (analysisSeq.current !== currentSeq) return
      setAiAnalysis(analysis)
      if (data?.quote_key) {
        const publicationPrice = analysis.price_bands.find((band) => band.label === 'aspiracional')?.value_uf || payload.estimated_uf
        const closingPrice = analysis.price_bands.find((band) => band.label === 'mercado')?.value_uf || payload.estimated_uf
        setHistory((current) => [
          {
            quote_key: String(data.quote_key),
            neighborhood: payload.neighborhood.name,
            estimated_uf: payload.estimated_uf,
            publication_price_uf: publicationPrice,
            closing_price_uf: closingPrice,
            confidence: payload.confidence,
            created_at: new Date().toISOString(),
          },
          ...current,
        ].slice(0, 5))
      }
    } catch (error) {
      if (analysisSeq.current !== currentSeq) return
      setAiAnalysis(buildFallbackValuationAnalysis(payload))
      setAiError(error instanceof Error ? error.message : 'No pudimos conectar la capa IA.')
    } finally {
      if (analysisSeq.current === currentSeq) {
        setAiLoading(false)
      }
    }
  }

  async function downloadValuationPdf() {
    const valuation = buildValuationRequest()
    const analysis = selectedBands?.analysis || aiAnalysis
    if (!valuation) return

    setPdfLoading(true)
    setPdfError(null)

    try {
      const response = await fetch('/api/valorizador/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valuation, analysis }),
      })

      if (!response.ok) {
        throw new Error('No pudimos generar el PDF de valorizacion.')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${new Date().toISOString().slice(0, 10)}_Valorizacion_Vitacura.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      setPdfError(error instanceof Error ? error.message : 'No pudimos generar el PDF de valorizacion.')
    } finally {
      setPdfLoading(false)
    }
  }

  async function generateRoleReport(reportType: 'ceo_brief' | 'director_accounts' | 'seller_playbook') {
    const valuation = buildValuationRequest()
    if (!valuation) return

    setRoleReportLoading(reportType)
    setRoleReportError(null)
    setRoleReportMessage(null)

    const marketContext = {
      source: 'valorizador',
      neighborhood: valuation.neighborhood.name,
      area_m2: valuation.area_m2,
      price_uf: result?.price_uf || 0,
      price_uf_m2: result?.price_uf_m2 || 0,
      price_clp: result?.price_clp || 0,
      confidence: result?.confidence || 0,
      market_velocity: result?.market_velocity || 0,
      market_absorption: result?.market_absorption || 0,
      comparable_source: result?.comparable_source || '',
      comparable_range_uf: result?.comparable_range_uf || '',
      comparable_properties: result?.comparable_properties || 0,
      top_comparables: comparables.slice(0, 3).map((item) => ({
        id: item.id,
        address: item.address,
        neighborhood: item.neighborhood,
        price_uf: item.price_uf,
        score: item.score,
      })),
      publication_price_uf: selectedBands?.publication || result?.price_uf || 0,
      closing_price_uf: selectedBands?.closing || result?.price_uf || 0,
      negotiation_floor_uf: selectedBands?.floor || result?.price_uf || 0,
      report_role: reportType,
      insights: aiAnalysis
        ? {
            title: aiAnalysis.title,
            summary: aiAnalysis.summary,
            why_now: aiAnalysis.why_now,
            risks: aiAnalysis.risks,
            actions: aiAnalysis.actions,
            band_recommendation: aiAnalysis.band_recommendation,
          }
        : null,
    }

    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_type: reportType,
          market_context: marketContext,
        }),
      })

      const data = (await response.json().catch(() => ({}))) as {
        error?: string
        report?: { id?: string; title?: string; summary?: string }
      }

      if (!response.ok || !data.report) {
        throw new Error(data.error || 'No pudimos generar el reporte.')
      }

      const label = reportType === 'ceo_brief' ? 'CEO' : reportType === 'director_accounts' ? 'Director' : 'Vendedor'
      setRoleReportMessage(`Reporte ${label} generado: ${data.report.title || 'sin titulo'}`)
    } catch (error) {
      setRoleReportError(error instanceof Error ? error.message : 'No pudimos generar el reporte.')
    } finally {
      setRoleReportLoading(null)
    }
  }

  function calculate() {
    const nb = selectedNb
    if (!nb || !nb.price_per_sqm_uf) return

    setCalculating(true)
    setAiAnalysis(null)
    setAiError(null)
    setRoleReportMessage(null)
    setRoleReportError(null)
    setPdfError(null)

    const area = Number.parseFloat(form.area_m2)
    const ageYears = Number.parseInt(form.age_years, 10)
    const bedrooms = Number.parseInt(form.bedrooms, 10)
    const bathrooms = Number.parseInt(form.bathrooms, 10)
    const floorNum = Number.parseInt(form.floor, 10)

    const basePriceUFm2 = nb.price_per_sqm_uf
    const ageFactor = Math.max(0.75, 1 - ageYears * 0.02)
    const conditionFactor: Record<string, number> = {
      excelente: 1.08,
      bueno: 1.0,
      regular: 0.9,
      a_renovar: 0.78,
    }
    const bedroomFactor = bedrooms <= 1 ? 0.92 : bedrooms === 2 ? 0.97 : bedrooms === 3 ? 1.0 : bedrooms === 4 ? 1.03 : 1.05
    const parkingBonus = form.has_parking ? 0.04 : 0
    const storageBonus = form.has_storage ? 0.02 : 0
    const poolBonus = form.has_pool ? 0.03 : 0
    const floorFactor = floorNum <= 1 ? 0.95 : floorNum <= 3 ? 0.98 : floorNum <= 8 ? 1.02 : 1.01

    const benchmarkTotalUF = externalBenchmark?.low_price_clp && externalBenchmark?.high_price_clp
      ? ((externalBenchmark.low_price_clp + externalBenchmark.high_price_clp) / 2) / UF_VALUE
      : null

    const baselineUF = basePriceUFm2 * area
    const initialUF = baselineUF
      * ageFactor
      * conditionFactor[form.condition]
      * bedroomFactor
      * floorFactor
      * (1 + parkingBonus + storageBonus + poolBonus)

    const comparableMatches = buildComparables(nb.name, area, bedrooms, bathrooms, basePriceUFm2, initialUF)
    const weightedComparableUF = comparableMatches.length
      ? comparableMatches.reduce((sum, item) => sum + item.price_uf * item.score, 0) / comparableMatches.reduce((sum, item) => sum + item.score, 0)
      : null
    const topComparableScores = comparableMatches.slice(0, 3)
    const comparableLow = topComparableScores.length
      ? Math.min(...topComparableScores.map((item) => item.price_uf))
      : Math.round(initialUF * 0.92)
    const comparableHigh = topComparableScores.length
      ? Math.max(...topComparableScores.map((item) => item.price_uf))
      : Math.round(initialUF * 1.08)

    const blendedUF = (() => {
      const baselineWeight = comparableMatches.length ? 0.45 : 0.65
      const comparableWeight = weightedComparableUF ? 0.35 : 0
      const benchmarkWeight = benchmarkTotalUF ? 0.12 : 0
      const fallbackWeight = Math.max(0, 1 - baselineWeight - comparableWeight - benchmarkWeight)
      const comparableAnchor = weightedComparableUF || initialUF
      const benchmarkAnchor = benchmarkTotalUF || initialUF
      return (
        initialUF * baselineWeight +
        comparableAnchor * comparableWeight +
        benchmarkAnchor * benchmarkWeight +
        baselineUF * fallbackWeight
      )
    })()

    const totalUF = Math.round(blendedUF)
    const adjustedUFm2 = totalUF / Math.max(area, 1)

    const baseConf = 68
    const absConf = nb.absorption_rate > 0.85 ? 14 : nb.absorption_rate > 0.75 ? 10 : 5
    const invConf = nb.inventory_count > 30 ? 10 : nb.inventory_count > 15 ? 6 : 2
    const sourceConf = externalBenchmark ? 6 : 0
    const compConf = comparableMatches.length ? Math.min(12, Math.round(comparableMatches[0].score / 8)) : 0
    const confidence = Math.min(97, baseConf + absConf + invConf + sourceConf + compConf)

    const resultPayload = {
      price_uf: Math.round(totalUF),
      price_uf_m2: Math.round(adjustedUFm2 * 10) / 10,
      price_clp: Math.round(totalUF * UF_VALUE),
      confidence,
      comp_neighborhood: nb.name,
      market_velocity: nb.velocity_days,
      market_absorption: Math.round(nb.absorption_rate * 100),
      comparable_properties: comparableMatches.length,
      comparable_source: comparableMatches.length ? 'weighted_properties' : externalBenchmark ? 'external_benchmark' : 'neighborhood_index',
      comparable_range_uf: `${comparableLow.toLocaleString('es-CL')} - ${comparableHigh.toLocaleString('es-CL')}`,
    }

    const analysisPayload: ValuationRequest = {
      neighborhood: nb,
      area_m2: area,
      bedrooms,
      bathrooms,
      age_years: ageYears,
      floor: floorNum,
      condition: form.condition,
      has_parking: form.has_parking,
      has_storage: form.has_storage,
      has_pool: form.has_pool,
      estimated_uf: resultPayload.price_uf,
      estimated_uf_m2: resultPayload.price_uf_m2,
      estimated_clp: resultPayload.price_clp,
      confidence: resultPayload.confidence,
      comparable_source: resultPayload.comparable_source,
      comparable_range_uf: resultPayload.comparable_range_uf,
      market_velocity: resultPayload.market_velocity,
      market_absorption: resultPayload.market_absorption,
      comparable_properties: resultPayload.comparable_properties,
      selected_comparables: comparableMatches,
      benchmark: externalBenchmark,
    }

    setTimeout(() => {
      setResult(resultPayload)
      setComparables(comparableMatches)
      setCalculating(false)
      void requestAiAnalysis(analysisPayload)
    }, 350)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: '#e5e7eb', borderTopColor: '#d61f2c' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="pb-5" style={{ borderBottom: '1px solid #e5e7eb' }}>
        <h1 className="text-3xl font-bold text-gray-900">Valorizador IA</h1>
        <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
          Estimacion basada en datos reales de Vitacura, comparables recientes y un benchmark externo cuando esta disponible.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg p-6 shadow-sm space-y-4" style={{ border: '1px solid #e5e7eb' }}>
          <h2 className="font-semibold text-gray-900">Datos de la propiedad</h2>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#374151' }}>Barrio</label>
            <select
              value={form.neighborhood}
              onChange={(e) => { setForm({ ...form, neighborhood: e.target.value }); setResult(null) }}
              className="w-full px-3 py-2 rounded-lg text-sm text-gray-900"
              style={{ border: '1px solid #e5e7eb', background: '#f9fafb' }}
            >
              {neighborhoods.map((n) => <option key={n.name} value={n.name}>{n.name}</option>)}
            </select>
            {selectedNb && (
              <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
                Precio de referencia: <strong>{selectedNb.price_per_sqm_uf} UF/m2</strong> � Zona {selectedNb.zona_prc}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#374151' }}>Area m2</label>
              <input
                type="number"
                min="20"
                value={form.area_m2}
                onChange={(e) => { setForm({ ...form, area_m2: e.target.value }); setResult(null) }}
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900"
                style={{ border: '1px solid #e5e7eb', background: '#f9fafb' }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#374151' }}>Antiguedad</label>
              <input
                type="number"
                min="0"
                max="50"
                value={form.age_years}
                onChange={(e) => { setForm({ ...form, age_years: e.target.value }); setResult(null) }}
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900"
                style={{ border: '1px solid #e5e7eb', background: '#f9fafb' }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#374151' }}>Dormitorios</label>
              <input
                type="number"
                min="1"
                max="8"
                value={form.bedrooms}
                onChange={(e) => { setForm({ ...form, bedrooms: e.target.value }); setResult(null) }}
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900"
                style={{ border: '1px solid #e5e7eb', background: '#f9fafb' }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#374151' }}>Banos</label>
              <input
                type="number"
                min="1"
                max="6"
                value={form.bathrooms}
                onChange={(e) => { setForm({ ...form, bathrooms: e.target.value }); setResult(null) }}
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900"
                style={{ border: '1px solid #e5e7eb', background: '#f9fafb' }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#374151' }}>Piso</label>
              <input
                type="number"
                min="1"
                max="30"
                value={form.floor}
                onChange={(e) => { setForm({ ...form, floor: e.target.value }); setResult(null) }}
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900"
                style={{ border: '1px solid #e5e7eb', background: '#f9fafb' }}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#374151' }}>Estado</label>
            <div className="grid grid-cols-2 gap-2">
              {(['excelente', 'bueno', 'regular', 'a_renovar'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => { setForm({ ...form, condition: c }); setResult(null) }}
                  className="px-3 py-1.5 rounded text-xs font-medium capitalize transition-all"
                  style={{
                    background: form.condition === c ? '#d61f2c' : '#f9fafb',
                    color: form.condition === c ? '#fff' : '#374151',
                    border: `1px solid ${form.condition === c ? '#d61f2c' : '#e5e7eb'}`,
                  }}
                >
                  {c.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#374151' }}>Extras</label>
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'has_parking', label: 'Estacionamiento' },
                { key: 'has_storage', label: 'Bodega' },
                { key: 'has_pool', label: 'Piscina' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => { setForm((f) => ({ ...f, [key]: !f[key as keyof typeof f] })); setResult(null) }}
                  className="px-3 py-1.5 rounded text-xs font-medium transition-all"
                  style={{
                    background: form[key as keyof typeof form] ? '#f9fafb' : '#f9fafb',
                    color: form[key as keyof typeof form] ? '#111111' : '#6b7280',
                    border: `1px solid ${form[key as keyof typeof form] ? '#d61f2c' : '#e5e7eb'}`,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={calculate}
            disabled={calculating || !form.neighborhood}
            className="w-full py-2.5 rounded-lg font-semibold text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: '#d61f2c' }}
          >
            {calculating ? <><RefreshCw size={15} className="animate-spin" /> Calculando...</> : <><BarChart2 size={15} /> Calcular valor</>}
          </button>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {result ? (
            <>
              <div className="bg-white rounded-lg p-6 shadow-sm" style={{ border: '1px solid #d61f2c', borderLeft: '4px solid #d61f2c' }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#374151' }}>Valor estimado</p>
                <p className="text-4xl font-bold text-gray-900">{result.price_uf.toLocaleString('es-CL')} <span className="text-xl font-semibold" style={{ color: '#d61f2c' }}>UF</span></p>
                <p className="text-sm mt-1" style={{ color: '#6b7280' }}>~ ${result.price_clp.toLocaleString('es-CL')} CLP</p>

                <div className="flex items-center gap-2 mt-4">
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#e5e7eb' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${result.confidence}%`, background: result.confidence > 85 ? '#d61f2c' : result.confidence > 70 ? '#f59e0b' : '#d97706' }} />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: result.confidence > 85 ? '#d61f2c' : '#f59e0b' }}>{result.confidence}% confianza</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-4 shadow-sm" style={{ border: '1px solid #e5e7eb' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign size={15} style={{ color: '#d61f2c' }} />
                    <p className="text-xs font-semibold uppercase" style={{ color: '#374151' }}>Precio / m2</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{result.price_uf_m2} <span className="text-sm font-normal" style={{ color: '#6b7280' }}>UF/m2</span></p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm" style={{ border: '1px solid #e5e7eb' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={15} style={{ color: '#6b7280' }} />
                    <p className="text-xs font-semibold uppercase" style={{ color: '#374151' }}>Velocidad del barrio</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{result.market_velocity} <span className="text-sm font-normal" style={{ color: '#6b7280' }}>dias</span></p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm" style={{ border: '1px solid #e5e7eb' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart2 size={15} style={{ color: '#d61f2c' }} />
                    <p className="text-xs font-semibold uppercase" style={{ color: '#374151' }}>Absorcion</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{result.market_absorption}<span className="text-sm font-normal" style={{ color: '#6b7280' }}>%</span></p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm" style={{ border: '1px solid #e5e7eb' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Home size={15} style={{ color: '#f59e0b' }} />
                    <p className="text-xs font-semibold uppercase" style={{ color: '#374151' }}>Comparables</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{result.comparable_properties} <span className="text-sm font-normal" style={{ color: '#6b7280' }}>props</span></p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-lg p-4 bg-white shadow-sm" style={{ border: '1px solid #e5e7eb' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Precio de publicacion</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{selectedBands?.publication?.toLocaleString('es-CL') || result.price_uf.toLocaleString('es-CL')} UF</p>
                  <p className="mt-1 text-xs" style={{ color: '#6b7280' }}>Nivel aspiracional para abrir la negociacion con margen comercial.</p>
                </div>
                <div className="rounded-lg p-4 bg-white shadow-sm" style={{ border: '1px solid #e5e7eb' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Precio de cierre objetivo</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{selectedBands?.closing?.toLocaleString('es-CL') || result.price_uf.toLocaleString('es-CL')} UF</p>
                  <p className="mt-1 text-xs" style={{ color: '#6b7280' }}>Nivel de mercado para cerrar con buena velocidad y menos friccion.</p>
                </div>
                <div className="rounded-lg p-4 bg-white shadow-sm" style={{ border: '1px solid #e5e7eb' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Piso de negociacion</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{selectedBands?.floor?.toLocaleString('es-CL') || result.price_uf.toLocaleString('es-CL')} UF</p>
                  <p className="mt-1 text-xs" style={{ color: '#6b7280' }}>Umbral minimo recomendado para no regalar valor.</p>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm" style={{ border: '1px solid #e5e7eb' }}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Activar reportes por rol</p>
                    <p className="text-sm mt-1 max-w-2xl" style={{ color: '#6b7280' }}>
                      Usa esta valorizacion como insumo para el vendedor, el director o el CEO sin volver a rearmar contexto.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => void generateRoleReport('seller_playbook')}
                      disabled={Boolean(roleReportLoading)}
                      className="px-3 py-2 rounded-md text-sm font-medium text-white flex items-center gap-2 disabled:opacity-50"
                      style={{ background: '#d61f2c' }}
                    >
                      <Send size={14} />
                      {roleReportLoading === 'seller_playbook' ? 'Generando...' : 'Vendedor'}
                    </button>
                    <button
                      onClick={() => void generateRoleReport('director_accounts')}
                      disabled={Boolean(roleReportLoading)}
                      className="px-3 py-2 rounded-md text-sm font-medium text-white flex items-center gap-2 disabled:opacity-50"
                      style={{ background: '#6f8f89' }}
                    >
                      <Send size={14} />
                      {roleReportLoading === 'director_accounts' ? 'Generando...' : 'Director'}
                    </button>
                    <button
                      onClick={() => void generateRoleReport('ceo_brief')}
                      disabled={Boolean(roleReportLoading)}
                      className="px-3 py-2 rounded-md text-sm font-medium text-white flex items-center gap-2 disabled:opacity-50"
                      style={{ background: '#111111' }}
                    >
                      <Send size={14} />
                      {roleReportLoading === 'ceo_brief' ? 'Generando...' : 'CEO'}
                    </button>
                  </div>
                </div>
                {roleReportMessage && (
                  <p className="mt-3 text-sm text-red-700">{roleReportMessage}</p>
                )}
                {roleReportError && (
                  <p className="mt-3 text-sm text-rose-700">{roleReportError}</p>
                )}
              </div>

              {comparisonSummary && (
                <div className="bg-white rounded-lg p-4 shadow-sm" style={{ border: '1px solid #e5e7eb' }}>
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Comparacion rapida</p>
                      <p className="text-sm mt-1" style={{ color: '#6b7280' }}>Compara esta valorizacion con el historial guardado para leer tendencia y consistencia.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={exportUrl('csv')}
                        className="px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2"
                        style={{ background: '#f9fafb', color: '#111111', border: '1px solid #e5e7eb' }}
                      >
                        <Download size={14} />
                        CSV
                      </a>
                      <a
                        href={exportUrl('xlsx')}
                        className="px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2"
                        style={{ background: '#f9fafb', color: '#111111', border: '1px solid #e5e7eb' }}
                      >
                        <Download size={14} />
                        XLSX
                      </a>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="rounded-lg p-3" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Actual</p>
                      <p className="mt-2 text-xl font-semibold text-gray-900">{result?.price_uf.toLocaleString('es-CL')} UF</p>
                      <p className="text-xs" style={{ color: '#6b7280' }}>Cierre objetivo: {selectedBands?.closing?.toLocaleString('es-CL')} UF</p>
                    </div>
                    <div className="rounded-lg p-3" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Promedio historico</p>
                      <p className="mt-2 text-xl font-semibold text-gray-900">{Math.round(comparisonSummary.averageClosing).toLocaleString('es-CL')} UF</p>
                      <p className="text-xs" style={{ color: '#6b7280' }}>Confianza media: {Math.round(comparisonSummary.averageConfidence)}%</p>
                    </div>
                    <div className="rounded-lg p-3" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Ultima cotizacion</p>
                      <p className="mt-2 text-xl font-semibold text-gray-900">{comparisonSummary.previous ? Math.round(comparisonSummary.previous.closing_price_uf).toLocaleString('es-CL') : 'N/A'} UF</p>
                      <p className="text-xs" style={{ color: '#6b7280' }}>{comparisonSummary.previous ? comparisonSummary.previous.neighborhood : 'Sin historial'}</p>
                    </div>
                    <div className="rounded-lg p-3" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Tendencia</p>
                      <p className="mt-2 text-xl font-semibold text-gray-900">
                        {comparisonSummary.previous
                          ? `${(result.price_uf - Number(comparisonSummary.previous.closing_price_uf || 0)).toLocaleString('es-CL')} UF`
                          : 'N/A'}
                      </p>
                      <p className="text-xs" style={{ color: '#6b7280' }}>Vs. ultima cotizacion guardada</p>
                    </div>
                  </div>
                </div>
              )}

              {neighborhoodComparison && (
                <div className="bg-white rounded-lg p-4 shadow-sm" style={{ border: '1px solid #e5e7eb' }}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Comparacion por barrio</p>
                      <p className="text-sm mt-1" style={{ color: '#6b7280' }}>Promedio de cierres guardados por barrio para leer posicion relativa.</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full" style={{ background: '#f9fafb', color: '#374151', border: '1px solid #e5e7eb' }}>
                      {neighborhoodComparison.currentNeighborhood.count || 0} registros
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="rounded-lg p-3" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Promedio</p>
                      <p className="mt-2 text-xl font-semibold text-gray-900">{Math.round(neighborhoodComparison.currentNeighborhood.averageClosing).toLocaleString('es-CL')} UF</p>
                    </div>
                    <div className="rounded-lg p-3" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>P25</p>
                      <p className="mt-2 text-xl font-semibold text-gray-900">{Math.round(neighborhoodComparison.currentNeighborhood.p25 || neighborhoodComparison.currentNeighborhood.averageClosing).toLocaleString('es-CL')} UF</p>
                    </div>
                    <div className="rounded-lg p-3" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Mediana</p>
                      <p className="mt-2 text-xl font-semibold text-gray-900">{Math.round(neighborhoodComparison.currentNeighborhood.p50 || neighborhoodComparison.currentNeighborhood.averageClosing).toLocaleString('es-CL')} UF</p>
                    </div>
                    <div className="rounded-lg p-3" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>P75</p>
                      <p className="mt-2 text-xl font-semibold text-gray-900">{Math.round(neighborhoodComparison.currentNeighborhood.p75 || neighborhoodComparison.currentNeighborhood.averageClosing).toLocaleString('es-CL')} UF</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-3">
                    {[
                      {
                        label: neighborhoodComparison.currentNeighborhood.neighborhood,
                        value: neighborhoodComparison.currentNeighborhood.averageClosing,
                        accent: '#111111',
                      },
                      ...neighborhoodComparison.rows.filter((row) => row.neighborhood !== neighborhoodComparison.currentNeighborhood.neighborhood).map((row) => ({
                        label: row.neighborhood,
                        value: row.averageClosing,
                        accent: '#d61f2c',
                      })),
                    ].slice(0, 4).map((item) => {
                      const width = Math.max(12, Math.round((item.value / neighborhoodComparison.maxValue) * 100))
                      return (
                        <div key={item.label} className="flex items-center gap-3">
                          <div className="w-36 text-xs font-medium uppercase tracking-wide" style={{ color: '#374151' }}>
                            {item.label}
                          </div>
                          <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: '#eef4f2', border: '1px solid #e5e7eb' }}>
                            <div className="h-full rounded-full" style={{ width: `${width}%`, background: item.accent }} />
                          </div>
                          <div className="w-24 text-right text-sm font-semibold text-gray-900">
                            {Math.round(item.value).toLocaleString('es-CL')} UF
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {visibleHistory.length > 0 && (
                <div className="bg-white rounded-lg p-4 shadow-sm" style={{ border: '1px solid #e5e7eb' }}>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Historial de cotizaciones</p>
                      <p className="text-sm mt-1" style={{ color: '#6b7280' }}>Ultimas valuaciones guardadas para seguimiento comercial y comparacion rapida.</p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>
                        Filtrar barrio
                      </label>
                      <select
                        value={historyNeighborhoodFilter}
                        onChange={(e) => setHistoryNeighborhoodFilter(e.target.value)}
                        className="rounded-md px-3 py-2 text-sm"
                        style={{ background: '#f9fafb', color: '#111111', border: '1px solid #e5e7eb' }}
                      >
                        <option value="all">Todos los barrios</option>
                        {historyNeighborhoodOptions.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {visibleHistory.map((item) => (
                      <div key={item.quote_key} className="rounded-lg p-3" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{item.neighborhood}</p>
                            <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
                              {new Date(item.created_at).toLocaleString('es-CL')}
                            </p>
                          </div>
                          <span className="text-xs px-2 py-1 rounded-full" style={{ background: '#fff', color: '#374151', border: '1px solid #e5e7eb' }}>
                            {item.confidence}% confianza
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p style={{ color: '#6b7280' }}>Publicacion</p>
                            <p className="font-semibold text-gray-900">{Math.round(item.publication_price_uf).toLocaleString('es-CL')} UF</p>
                          </div>
                          <div>
                            <p style={{ color: '#6b7280' }}>Cierre</p>
                            <p className="font-semibold text-gray-900">{Math.round(item.closing_price_uf).toLocaleString('es-CL')} UF</p>
                          </div>
                          <div>
                            <p style={{ color: '#6b7280' }}>Base</p>
                            <p className="font-semibold text-gray-900">{Math.round(item.estimated_uf).toLocaleString('es-CL')} UF</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-lg p-5 shadow-sm" style={{ border: '1px solid #e5e7eb' }}>
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Lectura IA</p>
                    <h3 className="mt-1 text-lg font-semibold text-gray-900">{aiAnalysis?.title || 'Analisis comercial asistido'}</h3>
                    <p className="text-sm mt-1 max-w-3xl" style={{ color: '#6b7280' }}>
                      {aiLoading
                        ? 'La IA esta revisando comparables, absorcion y contexto del barrio para reforzar el relato comercial.'
                        : aiAnalysis?.summary || 'Se generara una lectura comercial apenas termine el calculo.'}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full self-start" style={{ background: '#f9fafb', color: '#374151', border: '1px solid #e5e7eb' }}>
                    {aiLoading ? 'Analizando' : aiAnalysis?.source === 'openai' ? 'OpenAI' : 'Fallback local'}
                  </span>
                </div>
                {aiError && (
                  <p className="mt-3 text-xs px-3 py-2 rounded-md" style={{ background: '#fff7ed', color: '#92400e', border: '1px solid #fdba74' }}>
                    {aiError}
                  </p>
                )}

                <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                  {(aiAnalysis?.price_bands || buildFallbackValuationAnalysis({
                    neighborhood: {
                      name: result.comp_neighborhood,
                      price_per_sqm_uf: selectedNb?.price_per_sqm_uf || 0,
                      velocity_days: result.market_velocity,
                      absorption_rate: result.market_absorption / 100,
                      inventory_count: selectedNb?.inventory_count || 0,
                      zona_prc: selectedNb?.zona_prc || '',
                    },
                    area_m2: Number(form.area_m2),
                    bedrooms: Number(form.bedrooms),
                    bathrooms: Number(form.bathrooms),
                    age_years: Number(form.age_years),
                    floor: Number(form.floor),
                    condition: form.condition,
                    has_parking: form.has_parking,
                    has_storage: form.has_storage,
                    has_pool: form.has_pool,
                    estimated_uf: result.price_uf,
                    estimated_uf_m2: result.price_uf_m2,
                    estimated_clp: result.price_clp,
                    confidence: result.confidence,
                    comparable_source: result.comparable_source,
                    comparable_range_uf: result.comparable_range_uf,
                    market_velocity: result.market_velocity,
                    market_absorption: result.market_absorption,
                    comparable_properties: result.comparable_properties,
                    selected_comparables: comparables,
                    benchmark: externalBenchmark,
                  }).price_bands).map((band) => (
                    <div key={band.label} className="rounded-lg p-3" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>
                        {band.label.replace('_', ' ')}
                      </p>
                      <p className="mt-2 text-xl font-semibold text-gray-900">{band.value_uf.toLocaleString('es-CL')} UF</p>
                      <p className="mt-1 text-xs" style={{ color: '#6b7280' }}>{band.note}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-lg p-3" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Por que este valor</p>
                    <ul className="mt-2 space-y-2 text-sm" style={{ color: '#374151' }}>
                      {(aiAnalysis?.why_now || []).slice(0, 3).map((item) => <li key={item}>- {item}</li>)}
                    </ul>
                  </div>
                  <div className="rounded-lg p-3" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Riesgos</p>
                    <ul className="mt-2 space-y-2 text-sm" style={{ color: '#374151' }}>
                      {(aiAnalysis?.risks || []).slice(0, 3).map((item) => <li key={item}>- {item}</li>)}
                    </ul>
                  </div>
                  <div className="rounded-lg p-3" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Acciones</p>
                    <ul className="mt-2 space-y-2 text-sm" style={{ color: '#374151' }}>
                      {(aiAnalysis?.actions || []).slice(0, 3).map((item) => <li key={item}>- {item}</li>)}
                    </ul>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-lg p-3" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Sensibilidad de precio</p>
                    <div className="mt-2 space-y-2">
                      {(aiAnalysis?.sensitivities || buildFallbackValuationAnalysis({
                        neighborhood: {
                          name: result.comp_neighborhood,
                          price_per_sqm_uf: selectedNb?.price_per_sqm_uf || 0,
                          velocity_days: result.market_velocity,
                          absorption_rate: result.market_absorption / 100,
                          inventory_count: selectedNb?.inventory_count || 0,
                          zona_prc: selectedNb?.zona_prc || '',
                        },
                        area_m2: Number(form.area_m2),
                        bedrooms: Number(form.bedrooms),
                        bathrooms: Number(form.bathrooms),
                        age_years: Number(form.age_years),
                        floor: Number(form.floor),
                        condition: form.condition,
                        has_parking: form.has_parking,
                        has_storage: form.has_storage,
                        has_pool: form.has_pool,
                        estimated_uf: result.price_uf,
                        estimated_uf_m2: result.price_uf_m2,
                        estimated_clp: result.price_clp,
                        confidence: result.confidence,
                        comparable_source: result.comparable_source,
                        comparable_range_uf: result.comparable_range_uf,
                        market_velocity: result.market_velocity,
                        market_absorption: result.market_absorption,
                        comparable_properties: result.comparable_properties,
                        selected_comparables: comparables,
                        benchmark: externalBenchmark,
                      }).sensitivities).map((item) => (
                        <div key={item.factor} className="flex items-center justify-between gap-3 text-sm">
                          <div>
                            <p className="font-medium text-gray-900">{item.factor}</p>
                            <p className="text-xs" style={{ color: '#6b7280' }}>{item.note}</p>
                          </div>
                          <span className="font-semibold text-gray-900">
                            {item.direction === 'down' ? '-' : '+'}{item.impact_uf.toLocaleString('es-CL')} UF
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg p-3" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Posicion comercial</p>
                    <p className="mt-2 text-sm font-medium text-gray-900">{aiAnalysis?.market_position || 'Se reforzara la posicion con la lectura IA.'}</p>
                    <p className="mt-2 text-sm" style={{ color: '#6b7280' }}>
                      {aiAnalysis?.band_recommendation || 'La IA ajustara el relato de salida, el piso y el espacio de negociacion.'}
                    </p>
                    <div className="mt-3 rounded-md px-3 py-2 text-xs" style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#374151' }}>
                      {aiAnalysis?.confidence_note || 'La confianza del relato dependera de la calidad de los comparables y la frescura del mercado.'}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={downloadValuationPdf}
                    disabled={pdfLoading}
                    className="px-3 py-2 rounded-md text-sm font-medium text-white flex items-center gap-2 disabled:opacity-50"
                    style={{ background: '#111111' }}
                  >
                    <Download size={14} />
                    {pdfLoading ? 'Generando PDF...' : 'Descargar PDF'}
                  </button>
                  <a
                    href="/dashboard/reportes"
                    className="px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2"
                    style={{ background: '#f9fafb', color: '#111111', border: '1px solid #e5e7eb' }}
                  >
                    <FileText size={14} />
                    Ir a reportes
                  </a>
                </div>
                {pdfError && (
                  <p className="mt-3 text-sm text-rose-700">{pdfError}</p>
                )}
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm" style={{ border: '1px solid #e5e7eb' }}>
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Rango comparable</p>
                    <p className="text-lg font-semibold text-gray-900">{result.comparable_range_uf} UF</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full" style={{ background: '#f9fafb', color: '#374151', border: '1px solid #e5e7eb' }}>
                    Fuente: {result.comparable_source}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  {comparables.length ? (
                    comparables.map((item) => (
                      <div key={item.id} className="rounded-lg px-3 py-2" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{item.address}</p>
                            <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
                              {item.neighborhood} � {item.bedrooms}D/{item.bathrooms}B � {item.area_m2} m� � {item.source || 'properties'}
                            </p>
                            <p className="text-xs mt-1" style={{ color: '#374151' }}>{item.match_label}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">{item.price_uf.toLocaleString('es-CL')} UF</p>
                            <p className="text-xs" style={{ color: '#6b7280' }}>Score {item.score.toFixed(0)}% � Similarity {item.similarity.toFixed(0)}%</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm" style={{ color: '#6b7280' }}>No hay comparables suficientes en `properties` todavia.</p>
                  )}
                </div>
              </div>

              <p className="text-xs px-1" style={{ color: '#6b7280' }}>
                Estimacion basada en datos reales de mercado para {result.comp_neighborhood}, comparables recientes de `properties` y el benchmark externo cuando esta disponible.
              </p>
            </>
          ) : (
            <div className="bg-white rounded-lg p-12 text-center shadow-sm flex flex-col items-center justify-center h-full min-h-[300px]" style={{ border: '1px dashed #e5e7eb' }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: '#f9fafb' }}>
                <Home size={26} style={{ color: '#d61f2c' }} />
              </div>
              <p className="font-semibold text-gray-900">Ingresa los datos de la propiedad</p>
              <p className="text-sm mt-1" style={{ color: '#6b7280' }}>El modelo usara precios reales de {neighborhoods.length} barrios de Vitacura</p>
            </div>
          )}
        </div>
      </div>

      {externalBenchmark && (
        <div className="bg-white rounded-lg p-5 shadow-sm" style={{ border: '1px solid #e5e7eb' }}>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Benchmark externo</p>
              <h3 className="mt-1 text-lg font-semibold text-gray-900">Realtor International</h3>
              <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
                {externalBenchmark.offer_count} ofertas detectadas en {externalBenchmark.neighborhood} � {new Date(externalBenchmark.recorded_at).toLocaleString('es-CL')}
              </p>
            </div>
            <a href={externalBenchmark.source_url} target="_blank" rel="noreferrer" className="px-3 py-1.5 text-sm rounded-md font-medium transition-colors" style={{ background: '#f9fafb', color: '#374151', border: '1px solid #e5e7eb' }}>
              Abrir fuente
            </a>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-lg p-3" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Precio minimo</p>
              <p className="mt-2 text-xl font-semibold text-gray-900">{externalBenchmark.low_price_clp?.toLocaleString('es-CL') || 'N/A'} <span className="text-sm font-normal" style={{ color: '#6b7280' }}>{externalBenchmark.price_currency || 'CLP'}</span></p>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Precio maximo</p>
              <p className="mt-2 text-xl font-semibold text-gray-900">{externalBenchmark.high_price_clp?.toLocaleString('es-CL') || 'N/A'} <span className="text-sm font-normal" style={{ color: '#6b7280' }}>{externalBenchmark.price_currency || 'CLP'}</span></p>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Titulo</p>
              <p className="mt-2 text-sm font-medium text-gray-900">{externalBenchmark.listing_title || 'Sin titulo'}</p>
            </div>
          </div>
        </div>
      )}

      {neighborhoods.length > 0 && (
        <div className="bg-white rounded-lg overflow-hidden shadow-sm" style={{ border: '1px solid #e5e7eb' }}>
          <div className="px-5 py-3" style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
            <h3 className="text-sm font-semibold text-gray-900">Precios de referencia por barrio</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  {['Barrio', 'UF/m2', 'Velocidad', 'Absorcion', 'Inventario'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {neighborhoods.map((n) => (
                  <tr
                    key={n.name}
                    onClick={() => { setForm((f) => ({ ...f, neighborhood: n.name })); setResult(null) }}
                    className="cursor-pointer transition-colors"
                    style={{
                      borderBottom: '1px solid #f5f5f5',
                      background: form.neighborhood === n.name ? '#f9fafb' : undefined,
                    }}
                  >
                    <td className="px-4 py-2.5 font-medium text-gray-900">{n.name}</td>
                    <td className="px-4 py-2.5 font-semibold" style={{ color: '#d61f2c' }}>{n.price_per_sqm_uf}</td>
                    <td className="px-4 py-2.5 text-gray-600">{n.velocity_days}d</td>
                    <td className="px-4 py-2.5 text-gray-600">{(n.absorption_rate * 100).toFixed(0)}%</td>
                    <td className="px-4 py-2.5 text-gray-600">{n.inventory_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}




