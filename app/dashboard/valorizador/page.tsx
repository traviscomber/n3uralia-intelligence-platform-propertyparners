'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, Home, DollarSign, BarChart2, RefreshCw } from 'lucide-react'

interface Neighborhood {
  name: string
  price_per_sqm_uf: number
  velocity_days: number
  absorption_rate: number
  inventory_count: number
  zona_prc: string
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

interface ComparableItem {
  id: string
  address: string
  neighborhood: string
  price_uf: number
  area_m2: number
  bedrooms: number
  bathrooms: number
  status: string
  source?: string | null
  similarity: number
  score: number
  price_per_m2: number
  delta_to_estimate_uf: number
  match_label: string
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
  const [comparables, setComparables] = useState<ComparableItem[]>([])

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
      const [nRes, pRes, bRes] = await Promise.all([
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
      ])

      setNeighborhoods((nRes.data || []) as Neighborhood[])
      setProperties((pRes.data || []) as PropertyComparable[])
      setExternalBenchmark((bRes.data?.[0] || null) as ExternalBenchmark | null)

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
          match_label: reasons.slice(0, 3).join(' · '),
        }
      })
      .filter((item) => item.score >= 35)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
  }

  function calculate() {
    const nb = selectedNb
    if (!nb || !nb.price_per_sqm_uf) return

    setCalculating(true)

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

    setTimeout(() => {
      setResult({
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
      })
      setComparables(comparableMatches)
      setCalculating(false)
    }, 450)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: '#d8e5e2', borderTopColor: '#8fb2aa' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="pb-5" style={{ borderBottom: '1px solid #d8e5e2' }}>
        <h1 className="text-3xl font-bold text-gray-900">Valorizador IA</h1>
        <p className="text-sm mt-1" style={{ color: '#9ca9a3' }}>
          Estimacion basada en datos reales de Vitacura, comparables recientes y un benchmark externo cuando esta disponible.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg p-6 shadow-sm space-y-4" style={{ border: '1px solid #d8e5e2' }}>
          <h2 className="font-semibold text-gray-900">Datos de la propiedad</h2>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#555a56' }}>Barrio</label>
            <select
              value={form.neighborhood}
              onChange={(e) => { setForm({ ...form, neighborhood: e.target.value }); setResult(null) }}
              className="w-full px-3 py-2 rounded-lg text-sm text-gray-900"
              style={{ border: '1px solid #d8e5e2', background: '#f5f9f7' }}
            >
              {neighborhoods.map((n) => <option key={n.name} value={n.name}>{n.name}</option>)}
            </select>
            {selectedNb && (
              <p className="text-xs mt-1" style={{ color: '#9ca9a3' }}>
                Precio de referencia: <strong>{selectedNb.price_per_sqm_uf} UF/m2</strong> · Zona {selectedNb.zona_prc}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#555a56' }}>Area m2</label>
              <input
                type="number"
                min="20"
                value={form.area_m2}
                onChange={(e) => { setForm({ ...form, area_m2: e.target.value }); setResult(null) }}
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900"
                style={{ border: '1px solid #d8e5e2', background: '#f5f9f7' }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#555a56' }}>Antiguedad</label>
              <input
                type="number"
                min="0"
                max="50"
                value={form.age_years}
                onChange={(e) => { setForm({ ...form, age_years: e.target.value }); setResult(null) }}
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900"
                style={{ border: '1px solid #d8e5e2', background: '#f5f9f7' }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#555a56' }}>Dormitorios</label>
              <input
                type="number"
                min="1"
                max="8"
                value={form.bedrooms}
                onChange={(e) => { setForm({ ...form, bedrooms: e.target.value }); setResult(null) }}
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900"
                style={{ border: '1px solid #d8e5e2', background: '#f5f9f7' }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#555a56' }}>Banos</label>
              <input
                type="number"
                min="1"
                max="6"
                value={form.bathrooms}
                onChange={(e) => { setForm({ ...form, bathrooms: e.target.value }); setResult(null) }}
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900"
                style={{ border: '1px solid #d8e5e2', background: '#f5f9f7' }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#555a56' }}>Piso</label>
              <input
                type="number"
                min="1"
                max="30"
                value={form.floor}
                onChange={(e) => { setForm({ ...form, floor: e.target.value }); setResult(null) }}
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900"
                style={{ border: '1px solid #d8e5e2', background: '#f5f9f7' }}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#555a56' }}>Estado</label>
            <div className="grid grid-cols-2 gap-2">
              {(['excelente', 'bueno', 'regular', 'a_renovar'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => { setForm({ ...form, condition: c }); setResult(null) }}
                  className="px-3 py-1.5 rounded text-xs font-medium capitalize transition-all"
                  style={{
                    background: form.condition === c ? '#8fb2aa' : '#f5f9f7',
                    color: form.condition === c ? '#fff' : '#555a56',
                    border: `1px solid ${form.condition === c ? '#8fb2aa' : '#d8e5e2'}`,
                  }}
                >
                  {c.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#555a56' }}>Extras</label>
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
                    background: form[key as keyof typeof form] ? '#e8f3f0' : '#f5f9f7',
                    color: form[key as keyof typeof form] ? '#173634' : '#9ca9a3',
                    border: `1px solid ${form[key as keyof typeof form] ? '#8fb2aa' : '#d8e5e2'}`,
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
            style={{ background: '#8fb2aa' }}
          >
            {calculating ? <><RefreshCw size={15} className="animate-spin" /> Calculando...</> : <><BarChart2 size={15} /> Calcular valor</>}
          </button>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {result ? (
            <>
              <div className="bg-white rounded-lg p-6 shadow-sm" style={{ border: '1px solid #8fb2aa', borderLeft: '4px solid #8fb2aa' }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#555a56' }}>Valor estimado</p>
                <p className="text-4xl font-bold text-gray-900">{result.price_uf.toLocaleString('es-CL')} <span className="text-xl font-semibold" style={{ color: '#8fb2aa' }}>UF</span></p>
                <p className="text-sm mt-1" style={{ color: '#9ca9a3' }}>~ ${result.price_clp.toLocaleString('es-CL')} CLP</p>

                <div className="flex items-center gap-2 mt-4">
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#d8e5e2' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${result.confidence}%`, background: result.confidence > 85 ? '#10b981' : result.confidence > 70 ? '#f59e0b' : '#d97706' }} />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: result.confidence > 85 ? '#10b981' : '#f59e0b' }}>{result.confidence}% confianza</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-4 shadow-sm" style={{ border: '1px solid #d8e5e2' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign size={15} style={{ color: '#8fb2aa' }} />
                    <p className="text-xs font-semibold uppercase" style={{ color: '#555a56' }}>Precio / m2</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{result.price_uf_m2} <span className="text-sm font-normal" style={{ color: '#9ca9a3' }}>UF/m2</span></p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm" style={{ border: '1px solid #d8e5e2' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={15} style={{ color: '#b89a7e' }} />
                    <p className="text-xs font-semibold uppercase" style={{ color: '#555a56' }}>Velocidad del barrio</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{result.market_velocity} <span className="text-sm font-normal" style={{ color: '#9ca9a3' }}>dias</span></p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm" style={{ border: '1px solid #d8e5e2' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart2 size={15} style={{ color: '#10b981' }} />
                    <p className="text-xs font-semibold uppercase" style={{ color: '#555a56' }}>Absorcion</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{result.market_absorption}<span className="text-sm font-normal" style={{ color: '#9ca9a3' }}>%</span></p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm" style={{ border: '1px solid #d8e5e2' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Home size={15} style={{ color: '#f59e0b' }} />
                    <p className="text-xs font-semibold uppercase" style={{ color: '#555a56' }}>Comparables</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{result.comparable_properties} <span className="text-sm font-normal" style={{ color: '#9ca9a3' }}>props</span></p>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm" style={{ border: '1px solid #d8e5e2' }}>
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#555a56' }}>Rango comparable</p>
                    <p className="text-lg font-semibold text-gray-900">{result.comparable_range_uf} UF</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full" style={{ background: '#f5f9f7', color: '#555a56', border: '1px solid #d8e5e2' }}>
                    Fuente: {result.comparable_source}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  {comparables.length ? (
                    comparables.map((item) => (
                      <div key={item.id} className="rounded-lg px-3 py-2" style={{ background: '#f5f9f7', border: '1px solid #d8e5e2' }}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{item.address}</p>
                            <p className="text-xs mt-1" style={{ color: '#9ca9a3' }}>
                              {item.neighborhood} · {item.bedrooms}D/{item.bathrooms}B · {item.area_m2} m² · {item.source || 'properties'}
                            </p>
                            <p className="text-xs mt-1" style={{ color: '#555a56' }}>{item.match_label}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">{item.price_uf.toLocaleString('es-CL')} UF</p>
                            <p className="text-xs" style={{ color: '#9ca9a3' }}>Score {item.score.toFixed(0)}% · Similarity {item.similarity.toFixed(0)}%</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm" style={{ color: '#9ca9a3' }}>No hay comparables suficientes en `properties` todavia.</p>
                  )}
                </div>
              </div>

              <p className="text-xs px-1" style={{ color: '#9ca9a3' }}>
                Estimacion basada en datos reales de mercado para {result.comp_neighborhood}, comparables recientes de `properties` y el benchmark externo cuando esta disponible.
              </p>
            </>
          ) : (
            <div className="bg-white rounded-lg p-12 text-center shadow-sm flex flex-col items-center justify-center h-full min-h-[300px]" style={{ border: '1px dashed #d8e5e2' }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: '#e8f3f0' }}>
                <Home size={26} style={{ color: '#8fb2aa' }} />
              </div>
              <p className="font-semibold text-gray-900">Ingresa los datos de la propiedad</p>
              <p className="text-sm mt-1" style={{ color: '#9ca9a3' }}>El modelo usara precios reales de {neighborhoods.length} barrios de Vitacura</p>
            </div>
          )}
        </div>
      </div>

      {externalBenchmark && (
        <div className="bg-white rounded-lg p-5 shadow-sm" style={{ border: '1px solid #d8e5e2' }}>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#555a56' }}>Benchmark externo</p>
              <h3 className="mt-1 text-lg font-semibold text-gray-900">Realtor International</h3>
              <p className="text-sm mt-1" style={{ color: '#9ca9a3' }}>
                {externalBenchmark.offer_count} ofertas detectadas en {externalBenchmark.neighborhood} · {new Date(externalBenchmark.recorded_at).toLocaleString('es-CL')}
              </p>
            </div>
            <a href={externalBenchmark.source_url} target="_blank" rel="noreferrer" className="px-3 py-1.5 text-sm rounded-md font-medium transition-colors" style={{ background: '#f5f9f7', color: '#555a56', border: '1px solid #d8e5e2' }}>
              Abrir fuente
            </a>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-lg p-3" style={{ background: '#f5f9f7', border: '1px solid #d8e5e2' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#555a56' }}>Precio minimo</p>
              <p className="mt-2 text-xl font-semibold text-gray-900">{externalBenchmark.low_price_clp?.toLocaleString('es-CL') || 'N/A'} <span className="text-sm font-normal" style={{ color: '#9ca9a3' }}>{externalBenchmark.price_currency || 'CLP'}</span></p>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#f5f9f7', border: '1px solid #d8e5e2' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#555a56' }}>Precio maximo</p>
              <p className="mt-2 text-xl font-semibold text-gray-900">{externalBenchmark.high_price_clp?.toLocaleString('es-CL') || 'N/A'} <span className="text-sm font-normal" style={{ color: '#9ca9a3' }}>{externalBenchmark.price_currency || 'CLP'}</span></p>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#f5f9f7', border: '1px solid #d8e5e2' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#555a56' }}>Titulo</p>
              <p className="mt-2 text-sm font-medium text-gray-900">{externalBenchmark.listing_title || 'Sin titulo'}</p>
            </div>
          </div>
        </div>
      )}

      {neighborhoods.length > 0 && (
        <div className="bg-white rounded-lg overflow-hidden shadow-sm" style={{ border: '1px solid #d8e5e2' }}>
          <div className="px-5 py-3" style={{ borderBottom: '1px solid #d8e5e2', background: '#f5f9f7' }}>
            <h3 className="text-sm font-semibold text-gray-900">Precios de referencia por barrio</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #d8e5e2' }}>
                  {['Barrio', 'UF/m2', 'Velocidad', 'Absorcion', 'Inventario'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#555a56' }}>{h}</th>
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
                      background: form.neighborhood === n.name ? '#e8f3f0' : undefined,
                    }}
                  >
                    <td className="px-4 py-2.5 font-medium text-gray-900">{n.name}</td>
                    <td className="px-4 py-2.5 font-semibold" style={{ color: '#8fb2aa' }}>{n.price_per_sqm_uf}</td>
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


