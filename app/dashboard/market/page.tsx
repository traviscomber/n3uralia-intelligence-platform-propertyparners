'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import type { Neighborhood as MapNeighborhood, PrcZone as MapPrcZone } from '@/components/map/VitacuraMap'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, MapPin, Clock, Package } from 'lucide-react'

const VitacuraMap = dynamic(() => import('@/components/map/VitacuraMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-sm" style={{ color: '#9ca9a3' }}>
      Cargando mapa...
    </div>
  ),
})

interface Neighborhood {
  id: number
  name: string
  barrio_id: string
  sector_name: string
  velocity_days: number
  price_per_sqm_uf: number
  absorption_rate: number
  inventory_count: number
  zona_prc: string
  tipo: string
  geometry?: { type: string; coordinates: number[][][] }
}

interface PrcZone {
  id: number
  zona: string
  subzona: string
  uso_suelo: string
  geometry?: { type: string; coordinates: number[][][] }
}

interface Property {
  id: number
  lat: number
  lng: number
  price_uf: number
  area_m2: number
  bedrooms: number
  bathrooms: number
  status: 'available' | 'sold' | 'reserved'
  days_on_market: number
  barrio_id: string
}

interface MarketRow {
  neighborhood: string
  avg_price_uf: number
  avg_price_m2_uf: number
  inventory_count: number
  absorption_rate: number
  avg_days_on_market: number
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

interface MarketHistoryRow {
  id: number
  snapshot_date: string
  neighborhood: string
  avg_price_uf: number | null
  avg_price_m2_uf: number | null
  absorption_rate: number | null
  inventory_count: number
  avg_days_on_market: number | null
  opportunity_score: number
  created_at: string
}

const TIPO_LABEL: Record<string, string> = {
  residencial_alto: 'Res. Alto',
  residencial_medio_alto: 'Res. Medio-Alto',
  residencial_medio: 'Res. Medio',
  comercial_servicios: 'Comercial',
}

const TIPO_COLOR: Record<string, string> = {
  residencial_alto: '#8fb2aa',
  residencial_medio_alto: '#b89a7e',
  residencial_medio: '#10b981',
  comercial_servicios: '#f59e0b',
}

function TrendBadge({ value }: { value: number }) {
  if (value >= 0.85) return <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded"><TrendingUp size={11} />{(value * 100).toFixed(0)}%</span>
  if (value >= 0.70) return <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded"><Minus size={11} />{(value * 100).toFixed(0)}%</span>
  return <span className="flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded"><TrendingDown size={11} />{(value * 100).toFixed(0)}%</span>
}

export default function MarketPage() {
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([])
  const [prcZones, setPrcZones] = useState<PrcZone[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [marketRows, setMarketRows] = useState<MarketRow[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [showPrc, setShowPrc] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [realtorBenchmark, setRealtorBenchmark] = useState<ExternalBenchmark | null>(null)
  const [portalBenchmark, setPortalBenchmark] = useState<ExternalBenchmark | null>(null)
  const [benchmarksLoading, setBenchmarksLoading] = useState(false)
  const [realtorError, setRealtorError] = useState<string | null>(null)
  const [portalError, setPortalError] = useState<string | null>(null)
  const [marketHistory, setMarketHistory] = useState<MarketHistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'mapa' | 'overview' | 'prices' | 'velocity'>('mapa')

  const supabase = createClient()

  const loadNeighborhoods = useCallback(async () => {
    const [nRes, mRes, pRes] = await Promise.all([
      supabase.rpc('get_neighborhoods_geojson'),
      supabase.from('market_data').select('neighborhood,avg_price_uf,avg_price_m2_uf,inventory_count,absorption_rate,avg_days_on_market').order('avg_price_m2_uf', { ascending: false }),
      supabase.from('properties').select('id,lat,lng,price_uf,area_m2,bedrooms,bathrooms,status,days_on_market,barrio_id').eq('status', 'available'),
    ])
    setNeighborhoods((nRes.data as Neighborhood[]) || [])
    setMarketRows(mRes.data || [])
    setProperties((pRes.data as Property[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadNeighborhoods() }, [loadNeighborhoods])

  useEffect(() => {
    const loadMarketInsights = async () => {
      try {
        const res = await fetch('/api/market/insights', { cache: 'no-store' })
        const json = await res.json()
        if (json.history) {
          setMarketHistory((json.history || []) as MarketHistoryRow[])
        }
      } catch {
        // best effort only
      }
    }

    void loadMarketInsights()
  }, [])

  const loadBenchmarks = useCallback(async () => {
    setBenchmarksLoading(true)
    setRealtorError(null)
    setPortalError(null)
    try {
      const [realtorResult, portalResult] = await Promise.allSettled([
        fetch('/api/benchmarks/realtor', { cache: 'no-store' }).then(async (res) => {
          const json = await res.json()
          if (!res.ok) throw new Error(json.error || 'No pudimos actualizar el benchmark de Realtor.')
          return json.benchmark as ExternalBenchmark
        }),
        fetch('/api/benchmarks/portal-inmobiliario', { cache: 'no-store' }).then(async (res) => {
          const json = await res.json()
          if (!res.ok) throw new Error(json.error || 'No pudimos actualizar el benchmark de Portal Inmobiliario.')
          return json.benchmark as ExternalBenchmark
        }),
      ])

      if (realtorResult.status === 'fulfilled') {
        setRealtorBenchmark(realtorResult.value)
      } else {
        setRealtorError(realtorResult.reason instanceof Error ? realtorResult.reason.message : 'No pudimos actualizar el benchmark de Realtor.')
      }

      if (portalResult.status === 'fulfilled') {
        setPortalBenchmark(portalResult.value)
      } else {
        setPortalError(portalResult.reason instanceof Error ? portalResult.reason.message : 'No pudimos actualizar el benchmark de Portal Inmobiliario.')
      }
    } finally {
      setBenchmarksLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadBenchmarks()
  }, [loadBenchmarks])

  const loadPrcZones = useCallback(async () => {
    const res = await fetch('/api/prc/zones')
    const json = await res.json()
    if (json.zones) setPrcZones(json.zones as PrcZone[])
  }, [])

  useEffect(() => {
    if (showPrc && prcZones.length === 0) loadPrcZones()
  }, [showPrc, prcZones.length, loadPrcZones])

  const handleSyncPrc = async () => {
    setSyncing(true)
    setSyncMsg('')
    try {
      const res = await fetch('/api/prc/sync', { method: 'POST' })
      const json = await res.json()
      if (res.ok) {
        setSyncMsg(`Sync completado: ${json.synced ?? 0} zonas PRC importadas desde ArcGIS.`)
        await loadPrcZones()
        await supabase.rpc('enrich_neighborhoods_zona_prc')
        await loadNeighborhoods()
        setShowPrc(true)
      } else {
        setSyncMsg(`Error: ${json.error || 'Fallo al sincronizar PRC'}`)
      }
    } catch {
      setSyncMsg('Error de red al contactar ArcGIS')
    } finally {
      setSyncing(false)
    }
  }

  const selectedNeighborhood = neighborhoods.find(n => n.barrio_id === selected)
  const selectedMarket = marketRows.find(m => m.neighborhood === selectedNeighborhood?.name)

  const priceChartData = neighborhoods.map(n => ({
    name: n.name.replace(' ', '\n'),
    shortName: n.sector_name,
    precio: n.price_per_sqm_uf,
    tipo: n.tipo,
  }))

  const velocityChartData = neighborhoods.map(n => ({
    shortName: n.sector_name,
    velocidad: n.velocity_days,
    absorcion: Math.round(n.absorption_rate * 100),
    inventario: n.inventory_count,
  }))

  // Summary stats
  const avgPrice = neighborhoods.length ? (neighborhoods.reduce((s, n) => s + (n.price_per_sqm_uf || 0), 0) / neighborhoods.length) : 0
  const avgVelocity = neighborhoods.length ? Math.round(neighborhoods.reduce((s, n) => s + (n.velocity_days || 0), 0) / neighborhoods.length) : 0
  const totalInventory = neighborhoods.reduce((s, n) => s + (n.inventory_count || 0), 0)
  const avgAbsorption = neighborhoods.length ? (neighborhoods.reduce((s, n) => s + (n.absorption_rate || 0), 0) / neighborhoods.length) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: '#d8e5e2', borderTopColor: '#8fb2aa' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="pb-5 flex items-start justify-between" style={{ borderBottom: '1px solid #d8e5e2' }}>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inteligencia de Mercado Vitacura</h1>
          <p className="text-sm mt-1" style={{ color: '#9ca9a3' }}>Vitacura - {neighborhoods.length} barrios activos - datos en tiempo real</p>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none" style={{ color: '#555a56' }}>
            <input type="checkbox" checked={showPrc} onChange={e => setShowPrc(e.target.checked)} className="accent-green-600" />
            Overlay PRC
          </label>
          <button
            onClick={handleSyncPrc}
            disabled={syncing}
            className="px-3 py-1.5 text-sm rounded-md font-medium transition-colors disabled:opacity-60"
            style={{ background: '#8fb2aa', color: '#fff' }}
          >
            {syncing ? 'Sincronizando...' : 'Sync PRC ArcGIS'}
          </button>
        </div>
      </div>
      {syncMsg && (
        <div className="text-sm px-4 py-2 rounded-md" style={{ background: syncMsg.startsWith('Error') ? '#fef2f2' : '#f0fdf4', color: syncMsg.startsWith('Error') ? '#991b1b' : '#166534' }}>
          {syncMsg}
        </div>
      )}

      {(realtorBenchmark || portalBenchmark || realtorError || portalError || benchmarksLoading) && (
        <div className="bg-white rounded-lg p-5 shadow-sm" style={{ border: '1px solid #d8e5e2' }}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#555a56' }}>Benchmarks externos</p>
              <h2 className="mt-1 text-lg font-semibold text-gray-900">Realtor International + Portal Inmobiliario</h2>
              <p className="text-sm mt-1" style={{ color: '#9ca9a3' }}>
                Comparaci�n de fuentes externas para reforzar `Inteligencia de Mercado`.
              </p>
            </div>
            <button
              onClick={() => void loadBenchmarks()}
              disabled={benchmarksLoading}
              className="px-3 py-1.5 text-sm rounded-md font-medium transition-colors disabled:opacity-60"
              style={{ background: '#8fb2aa', color: '#fff' }}
            >
              {benchmarksLoading ? 'Actualizando...' : 'Actualizar benchmarks'}
            </button>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {[
              { title: 'Realtor International', benchmark: realtorBenchmark, error: realtorError },
              { title: 'Portal Inmobiliario Benchmark', benchmark: portalBenchmark, error: portalError },
            ].map(({ title, benchmark, error }) => (
              <div key={title} className="rounded-lg p-4" style={{ background: '#f5f9f7', border: '1px solid #d8e5e2' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#555a56' }}>Benchmark externo</p>
                    <h3 className="mt-1 text-base font-semibold text-gray-900">{title}</h3>
                    <p className="text-sm mt-1" style={{ color: '#9ca9a3' }}>
                      {benchmark
                        ? `${benchmark.offer_count} ofertas detectadas en ${benchmark.neighborhood} · ${new Date(benchmark.recorded_at).toLocaleString('es-CL')}`
                        : error || 'No disponible'}
                    </p>
                  </div>
                  {benchmark && (
                    <a href={benchmark.source_url} target="_blank" rel="noreferrer" className="px-3 py-1.5 text-xs rounded-md font-medium transition-colors" style={{ background: '#fff', color: '#555a56', border: '1px solid #d8e5e2' }}>
                      Abrir fuente
                    </a>
                  )}
                </div>
                {benchmark && (
                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="rounded-lg p-3 bg-white" style={{ border: '1px solid #d8e5e2' }}>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#555a56' }}>Oferta mínima</p>
                      <p className="mt-2 text-lg font-semibold text-gray-900">{benchmark.low_price_clp?.toLocaleString('es-CL') || 'N/A'} <span className="text-sm font-normal" style={{ color: '#9ca9a3' }}>{benchmark.price_currency || 'CLP'}</span></p>
                    </div>
                    <div className="rounded-lg p-3 bg-white" style={{ border: '1px solid #d8e5e2' }}>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#555a56' }}>Oferta máxima</p>
                      <p className="mt-2 text-lg font-semibold text-gray-900">{benchmark.high_price_clp?.toLocaleString('es-CL') || 'N/A'} <span className="text-sm font-normal" style={{ color: '#9ca9a3' }}>{benchmark.price_currency || 'CLP'}</span></p>
                    </div>
                    <div className="rounded-lg p-3 bg-white" style={{ border: '1px solid #d8e5e2' }}>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#555a56' }}>Título fuente</p>
                      <p className="mt-2 text-sm font-medium text-gray-900 line-clamp-2">{benchmark.listing_title || 'Sin título'}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Precio Prom. UF/m²', value: avgPrice.toFixed(1), unit: 'UF/m²', icon: <TrendingUp size={18} />, color: '#8fb2aa' },
          { label: 'Velocidad Promedio', value: avgVelocity, unit: 'días', icon: <Clock size={18} />, color: '#b89a7e' },
          { label: 'Inventario Total', value: totalInventory, unit: 'props', icon: <Package size={18} />, color: '#10b981' },
          { label: 'Absorción Promedio', value: (avgAbsorption * 100).toFixed(0), unit: '%', icon: <MapPin size={18} />, color: '#f59e0b' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-lg p-4 shadow-sm" style={{ border: '1px solid #d8e5e2' }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#555a56' }}>{kpi.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{kpi.value} <span className="text-sm font-normal" style={{ color: '#9ca9a3' }}>{kpi.unit}</span></p>
              </div>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${kpi.color}18`, color: kpi.color }}>
                {kpi.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Nav */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: '#f5f9f7', border: '1px solid #d8e5e2' }}>
        {(['mapa', 'overview', 'prices', 'velocity'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-1.5 rounded text-sm font-medium transition-all"
            style={{
              background: activeTab === tab ? '#8fb2aa' : 'transparent',
              color: activeTab === tab ? '#ffffff' : '#9ca9a3',
            }}
          >
            {tab === 'mapa' ? 'Mapa' : tab === 'overview' ? 'Tabla General' : tab === 'prices' ? 'Precios' : 'Velocidad'}
          </button>
        ))}
      </div>

      {/* Tab: Mapa */}
      {activeTab === 'mapa' && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden" style={{ border: '1px solid #d8e5e2', height: '520px' }}>
          <VitacuraMap
            neighborhoods={neighborhoods as MapNeighborhood[]}
            prcZones={prcZones as MapPrcZone[]}
            properties={properties}
            selected={selected}
            onSelect={setSelected}
            showPrc={showPrc}
          />
        </div>
      )}

      {/* Tab: Overview Table */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden" style={{ border: '1px solid #d8e5e2' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #d8e5e2', background: '#f5f9f7' }}>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#555a56' }}>Barrio</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#555a56' }}>Tipo</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#555a56' }}>UF/m²</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#555a56' }}>Velocidad</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#555a56' }}>Absorción</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#555a56' }}>Inventario</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#555a56' }}>Zona PRC</th>
              </tr>
            </thead>
            <tbody>
              {neighborhoods.map((n) => (
                <tr
                  key={n.id}
                  onClick={() => setSelected(selected === n.barrio_id ? null : n.barrio_id)}
                  className="cursor-pointer transition-colors"
                  style={{
                    borderBottom: '1px solid #f0f0f0',
                    background: selected === n.barrio_id ? '#e8f3f0' : undefined,
                  }}
                >
                  <td className="px-5 py-3 font-medium text-gray-900">{n.name}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: `${TIPO_COLOR[n.tipo]}18`, color: TIPO_COLOR[n.tipo] }}>
                      {TIPO_LABEL[n.tipo] || n.tipo}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-semibold text-gray-900">{n.price_per_sqm_uf?.toFixed(1)}</td>
                  <td className="px-5 py-3 text-gray-700">{n.velocity_days} días</td>
                  <td className="px-5 py-3"><TrendBadge value={n.absorption_rate} /></td>
                  <td className="px-5 py-3 text-gray-700">{n.inventory_count}</td>
                  <td className="px-5 py-3 text-xs font-mono" style={{ color: '#9ca9a3' }}>{n.zona_prc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Prices Chart */}
      {activeTab === 'prices' && (
        <div className="bg-white rounded-lg p-6 shadow-sm" style={{ border: '1px solid #d8e5e2' }}>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Precio UF/m² por Barrio</h2>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={priceChartData} margin={{ bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="shortName" stroke="#9ca3af" tick={{ fontSize: 11 }} angle={-40} textAnchor="end" height={70} />
              <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} tickFormatter={v => `${v} UF`} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #d8e5e2', borderRadius: '8px', fontSize: 12 }}
                formatter={(val) => [typeof val === 'number' ? `${val.toFixed(1)} UF/m²` : String(val ?? '—'), 'Precio']}
                labelFormatter={(label) => `Sector: ${label}`}
              />
              <Bar dataKey="precio" fill="#8fb2aa" radius={[4, 4, 0, 0]} name="UF/m²" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tab: Velocity Chart */}
      {activeTab === 'velocity' && (
        <div className="bg-white rounded-lg p-6 shadow-sm" style={{ border: '1px solid #d8e5e2' }}>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Velocidad de Venta y Absorción por Barrio</h2>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={velocityChartData} margin={{ bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="shortName" stroke="#9ca3af" tick={{ fontSize: 11 }} angle={-40} textAnchor="end" height={70} />
              <YAxis yAxisId="days" stroke="#8fb2aa" tick={{ fontSize: 11 }} tickFormatter={v => `${v}d`} />
              <YAxis yAxisId="pct" orientation="right" stroke="#b89a7e" tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #d8e5e2', borderRadius: '8px', fontSize: 12 }}
              />
              <Legend />
              <Bar yAxisId="days" dataKey="velocidad" fill="#8fb2aa" radius={[4, 4, 0, 0]} name="Días en mercado" />
              <Bar yAxisId="pct" dataKey="absorcion" fill="#b89a7e" radius={[4, 4, 0, 0]} name="Absorción %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Detail Panel - shown when a row is selected */}
      {selectedNeighborhood && (
        <div className="rounded-lg p-6" style={{ background: '#e8f3f0', border: '1px solid #8fb2aa' }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{selectedNeighborhood.name}</h3>
              <p className="text-sm" style={{ color: '#555a56' }}>Zona {selectedNeighborhood.zona_prc} · {TIPO_LABEL[selectedNeighborhood.tipo] || selectedNeighborhood.tipo}</p>
            </div>
            <button onClick={() => setSelected(null)} className="text-xs px-3 py-1 rounded" style={{ background: '#d8e5e2', color: '#555a56' }}>Cerrar</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Precio UF/m²', value: `${selectedNeighborhood.price_per_sqm_uf?.toFixed(1)} UF` },
              { label: 'Velocidad', value: `${selectedNeighborhood.velocity_days} días` },
              { label: 'Absorción', value: `${(selectedNeighborhood.absorption_rate * 100).toFixed(0)}%` },
              { label: 'Inventario', value: `${selectedNeighborhood.inventory_count} props` },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-lg p-3" style={{ border: '1px solid #d8e5e2' }}>
                <p className="text-xs font-semibold uppercase" style={{ color: '#9ca9a3' }}>{stat.label}</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
            ))}
          </div>
          {selectedMarket && (
            <p className="text-xs mt-4" style={{ color: '#555a56' }}>
              Precio promedio propiedad: <strong>{selectedMarket.avg_price_uf?.toLocaleString('es-CL')} UF</strong> · Días en mercado: <strong>{selectedMarket.avg_days_on_market?.toFixed(0)} días</strong>
            </p>
          )}
        </div>
      )}

      {marketHistory.length > 0 && (
        <div className="bg-white rounded-lg p-5 shadow-sm" style={{ border: '1px solid #d8e5e2' }}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#555a56' }}>Historial de barrio</p>
              <h3 className="mt-1 text-lg font-semibold text-gray-900">Neighborhood market snapshots</h3>
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ background: '#f5f9f7', color: '#555a56', border: '1px solid #d8e5e2' }}>
              {marketHistory.length} snapshots
            </span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {marketHistory.slice(0, 3).map((row) => (
              <div key={row.id} className="rounded-lg p-3" style={{ background: '#f5f9f7', border: '1px solid #d8e5e2' }}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">{row.neighborhood}</p>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#e8f3f0', color: '#166534' }}>
                    {row.opportunity_score}/100
                  </span>
                </div>
                <p className="text-xs mt-1" style={{ color: '#9ca9a3' }}>
                  {new Date(row.snapshot_date).toLocaleDateString('es-CL')} · {row.inventory_count} inventario · {(row.absorption_rate || 0) * 100}% absorción
                </p>
                <p className="text-xs mt-1" style={{ color: '#555a56' }}>
                  {row.avg_price_m2_uf?.toFixed(1) || 'N/A'} UF/m² · {row.avg_days_on_market ? `${row.avg_days_on_market.toFixed(0)} días` : 'sin días'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}



