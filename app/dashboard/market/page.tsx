'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, MapPin, Clock, Package } from 'lucide-react'

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
}

interface MarketRow {
  neighborhood: string
  avg_price_uf: number
  avg_price_m2_uf: number
  inventory_count: number
  absorption_rate: number
  avg_days_on_market: number
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
  const [marketRows, setMarketRows] = useState<MarketRow[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'prices' | 'velocity'>('overview')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [nRes, mRes] = await Promise.all([
        supabase.from('neighborhoods').select('id,name,barrio_id,sector_name,velocity_days,price_per_sqm_uf,absorption_rate,inventory_count,zona_prc,tipo').not('barrio_id', 'is', null).order('absorption_rate', { ascending: false }),
        supabase.from('market_data').select('neighborhood,avg_price_uf,avg_price_m2_uf,inventory_count,absorption_rate,avg_days_on_market').order('avg_price_m2_uf', { ascending: false }),
      ])
      setNeighborhoods(nRes.data || [])
      setMarketRows(mRes.data || [])
      setLoading(false)
    }
    load()
  }, [])

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
      <div className="pb-5" style={{ borderBottom: '1px solid #d8e5e2' }}>
        <h1 className="text-3xl font-bold text-gray-900">Market Intelligence</h1>
        <p className="text-sm mt-1" style={{ color: '#9ca9a3' }}>Vitacura — {neighborhoods.length} barrios activos · datos en tiempo real</p>
      </div>

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
        {(['overview', 'prices', 'velocity'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-1.5 rounded text-sm font-medium transition-all"
            style={{
              background: activeTab === tab ? '#8fb2aa' : 'transparent',
              color: activeTab === tab ? '#ffffff' : '#9ca9a3',
            }}
          >
            {tab === 'overview' ? 'Tabla General' : tab === 'prices' ? 'Precios' : 'Velocidad'}
          </button>
        ))}
      </div>

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
                formatter={(val: number) => [`${val.toFixed(1)} UF/m²`, 'Precio']}
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
    </div>
  )
}
