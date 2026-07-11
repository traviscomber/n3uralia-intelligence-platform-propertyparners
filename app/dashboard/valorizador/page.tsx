'use client'

import { useEffect, useState } from 'react'
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

interface ValorizationResult {
  price_uf: number
  price_uf_m2: number
  price_clp: number
  confidence: number
  comp_neighborhood: string
  market_velocity: number
  market_absorption: number
  comparable_properties: number
}

const UF_VALUE = 37500 // CLP por UF (referencia)

export default function ValorizadorPage() {
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([])
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [result, setResult] = useState<ValorizationResult | null>(null)

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
      const { data } = await supabase
        .from('neighborhoods')
        .select('name, price_per_sqm_uf, velocity_days, absorption_rate, inventory_count, zona_prc')
        .not('barrio_id', 'is', null)
        .order('price_per_sqm_uf', { ascending: false })
      setNeighborhoods(data || [])
      if (data && data.length > 0) setForm(f => ({ ...f, neighborhood: data[0].name }))
      setLoading(false)
    }
    load()
  }, [])

  function calculate() {
    const nb = neighborhoods.find(n => n.name === form.neighborhood)
    if (!nb || !nb.price_per_sqm_uf) return

    setCalculating(true)

    // Base price from real neighborhood data
    let basePriceUFm2 = nb.price_per_sqm_uf

    // Age depreciation (2% per year, max 25%)
    const ageFactor = Math.max(0.75, 1 - (parseInt(form.age_years) * 0.02))

    // Condition factor
    const conditionFactor: Record<string, number> = {
      excelente: 1.08, bueno: 1.0, regular: 0.90, a_renovar: 0.78
    }

    // Bedroom size factor (optimal is 3 bedrooms)
    const bedroomFactor = parseInt(form.bedrooms) <= 1 ? 0.92 :
      parseInt(form.bedrooms) === 2 ? 0.97 :
      parseInt(form.bedrooms) === 3 ? 1.0 :
      parseInt(form.bedrooms) === 4 ? 1.03 : 1.05

    // Amenities
    const parkingBonus = form.has_parking ? 0.04 : 0
    const storageBonus = form.has_storage ? 0.02 : 0
    const poolBonus = form.has_pool ? 0.03 : 0

    // Floor premium (floors 4-10 command premium in Vitacura)
    const floorNum = parseInt(form.floor)
    const floorFactor = floorNum <= 1 ? 0.95 : floorNum <= 3 ? 0.98 : floorNum <= 8 ? 1.02 : 1.01

    const adjustedUFm2 = basePriceUFm2
      * ageFactor
      * conditionFactor[form.condition]
      * bedroomFactor
      * floorFactor
      * (1 + parkingBonus + storageBonus + poolBonus)

    const area = parseFloat(form.area_m2)
    const totalUF = adjustedUFm2 * area

    // Confidence: higher when absorption is high and inventory is healthy
    const baseConf = 70
    const absConf = nb.absorption_rate > 0.85 ? 12 : nb.absorption_rate > 0.75 ? 8 : 4
    const invConf = nb.inventory_count > 30 ? 10 : nb.inventory_count > 15 ? 6 : 2
    const confidence = Math.min(96, baseConf + absConf + invConf)

    setTimeout(() => {
      setResult({
        price_uf: Math.round(totalUF),
        price_uf_m2: Math.round(adjustedUFm2 * 10) / 10,
        price_clp: Math.round(totalUF * UF_VALUE),
        confidence,
        comp_neighborhood: nb.name,
        market_velocity: nb.velocity_days,
        market_absorption: Math.round(nb.absorption_rate * 100),
        comparable_properties: nb.inventory_count,
      })
      setCalculating(false)
    }, 600)
  }

  const selectedNb = neighborhoods.find(n => n.name === form.neighborhood)

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
        <h1 className="text-3xl font-bold text-gray-900">Valorizador IA</h1>
        <p className="text-sm mt-1" style={{ color: '#9ca9a3' }}>Precio estimado basado en datos reales de mercado Vitacura · {neighborhoods.length} barrios indexados</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 bg-white rounded-lg p-6 shadow-sm space-y-4" style={{ border: '1px solid #d8e5e2' }}>
          <h2 className="font-semibold text-gray-900">Datos de la Propiedad</h2>

          {/* Neighborhood */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#555a56' }}>Barrio</label>
            <select
              value={form.neighborhood}
              onChange={e => { setForm({ ...form, neighborhood: e.target.value }); setResult(null) }}
              className="w-full px-3 py-2 rounded-lg text-sm text-gray-900"
              style={{ border: '1px solid #d8e5e2', background: '#f5f9f7' }}
            >
              {neighborhoods.map(n => <option key={n.name} value={n.name}>{n.name}</option>)}
            </select>
            {selectedNb && (
              <p className="text-xs mt-1" style={{ color: '#9ca9a3' }}>
                Precio ref: <strong>{selectedNb.price_per_sqm_uf} UF/m²</strong> · Zona {selectedNb.zona_prc}
              </p>
            )}
          </div>

          {/* Area & Age */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#555a56' }}>Superficie m²</label>
              <input type="number" min="20" value={form.area_m2} onChange={e => { setForm({ ...form, area_m2: e.target.value }); setResult(null) }}
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900" style={{ border: '1px solid #d8e5e2', background: '#f5f9f7' }} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#555a56' }}>Antigüedad (años)</label>
              <input type="number" min="0" max="50" value={form.age_years} onChange={e => { setForm({ ...form, age_years: e.target.value }); setResult(null) }}
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900" style={{ border: '1px solid #d8e5e2', background: '#f5f9f7' }} />
            </div>
          </div>

          {/* Dorm / Baños / Piso */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#555a56' }}>Dorm.</label>
              <input type="number" min="1" max="8" value={form.bedrooms} onChange={e => { setForm({ ...form, bedrooms: e.target.value }); setResult(null) }}
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900" style={{ border: '1px solid #d8e5e2', background: '#f5f9f7' }} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#555a56' }}>Baños</label>
              <input type="number" min="1" max="6" value={form.bathrooms} onChange={e => { setForm({ ...form, bathrooms: e.target.value }); setResult(null) }}
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900" style={{ border: '1px solid #d8e5e2', background: '#f5f9f7' }} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#555a56' }}>Piso</label>
              <input type="number" min="1" max="30" value={form.floor} onChange={e => { setForm({ ...form, floor: e.target.value }); setResult(null) }}
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900" style={{ border: '1px solid #d8e5e2', background: '#f5f9f7' }} />
            </div>
          </div>

          {/* Condition */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#555a56' }}>Estado</label>
            <div className="grid grid-cols-2 gap-2">
              {(['excelente', 'bueno', 'regular', 'a_renovar'] as const).map(c => (
                <button key={c} onClick={() => { setForm({ ...form, condition: c }); setResult(null) }}
                  className="px-3 py-1.5 rounded text-xs font-medium capitalize transition-all"
                  style={{
                    background: form.condition === c ? '#8fb2aa' : '#f5f9f7',
                    color: form.condition === c ? '#fff' : '#555a56',
                    border: `1px solid ${form.condition === c ? '#8fb2aa' : '#d8e5e2'}`,
                  }}>
                  {c.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Amenities */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#555a56' }}>Extras</label>
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'has_parking', label: 'Estacionamiento' },
                { key: 'has_storage', label: 'Bodega' },
                { key: 'has_pool', label: 'Piscina' },
              ].map(({ key, label }) => (
                <button key={key}
                  onClick={() => { setForm(f => ({ ...f, [key]: !f[key as keyof typeof f] })); setResult(null) }}
                  className="px-3 py-1.5 rounded text-xs font-medium transition-all"
                  style={{
                    background: form[key as keyof typeof form] ? '#e8f3f0' : '#f5f9f7',
                    color: form[key as keyof typeof form] ? '#173634' : '#9ca9a3',
                    border: `1px solid ${form[key as keyof typeof form] ? '#8fb2aa' : '#d8e5e2'}`,
                  }}>
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
            {calculating ? <><RefreshCw size={15} className="animate-spin" /> Calculando...</> : <><BarChart2 size={15} /> Calcular Valorización</>}
          </button>
        </div>

        {/* Result */}
        <div className="lg:col-span-3 space-y-4">
          {result ? (
            <>
              {/* Main price card */}
              <div className="bg-white rounded-lg p-6 shadow-sm" style={{ border: '1px solid #8fb2aa', borderLeft: '4px solid #8fb2aa' }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#555a56' }}>Valor Estimado</p>
                <p className="text-4xl font-bold text-gray-900">{result.price_uf.toLocaleString('es-CL')} <span className="text-xl font-semibold" style={{ color: '#8fb2aa' }}>UF</span></p>
                <p className="text-sm mt-1" style={{ color: '#9ca9a3' }}>≈ ${result.price_clp.toLocaleString('es-CL')} CLP</p>

                <div className="flex items-center gap-2 mt-4">
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#d8e5e2' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${result.confidence}%`, background: result.confidence > 85 ? '#10b981' : result.confidence > 70 ? '#f59e0b' : '#d97706' }} />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: result.confidence > 85 ? '#10b981' : '#f59e0b' }}>{result.confidence}% confianza</span>
                </div>
              </div>

              {/* Detail grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-4 shadow-sm" style={{ border: '1px solid #d8e5e2' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign size={15} style={{ color: '#8fb2aa' }} />
                    <p className="text-xs font-semibold uppercase" style={{ color: '#555a56' }}>Precio por m²</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{result.price_uf_m2} <span className="text-sm font-normal" style={{ color: '#9ca9a3' }}>UF/m²</span></p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm" style={{ border: '1px solid #d8e5e2' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={15} style={{ color: '#b89a7e' }} />
                    <p className="text-xs font-semibold uppercase" style={{ color: '#555a56' }}>Velocidad Barrio</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{result.market_velocity} <span className="text-sm font-normal" style={{ color: '#9ca9a3' }}>días</span></p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm" style={{ border: '1px solid #d8e5e2' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart2 size={15} style={{ color: '#10b981' }} />
                    <p className="text-xs font-semibold uppercase" style={{ color: '#555a56' }}>Absorción</p>
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

              {/* Disclaimer */}
              <p className="text-xs px-1" style={{ color: '#9ca9a3' }}>
                Estimación basada en datos reales de mercado del barrio {result.comp_neighborhood}. Los precios son referenciales y pueden variar según condiciones específicas de la propiedad.
              </p>
            </>
          ) : (
            <div className="bg-white rounded-lg p-12 text-center shadow-sm flex flex-col items-center justify-center h-full min-h-[300px]" style={{ border: '1px dashed #d8e5e2' }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: '#e8f3f0' }}>
                <Home size={26} style={{ color: '#8fb2aa' }} />
              </div>
              <p className="font-semibold text-gray-900">Ingresa los datos de la propiedad</p>
              <p className="text-sm mt-1" style={{ color: '#9ca9a3' }}>El modelo usará precios reales de {neighborhoods.length} barrios de Vitacura</p>
            </div>
          )}
        </div>
      </div>

      {/* Market reference table */}
      {neighborhoods.length > 0 && (
        <div className="bg-white rounded-lg overflow-hidden shadow-sm" style={{ border: '1px solid #d8e5e2' }}>
          <div className="px-5 py-3" style={{ borderBottom: '1px solid #d8e5e2', background: '#f5f9f7' }}>
            <h3 className="text-sm font-semibold text-gray-900">Precios de Referencia por Barrio</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #d8e5e2' }}>
                  {['Barrio', 'UF/m²', 'Velocidad', 'Absorción', 'Inventario'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#555a56' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {neighborhoods.map(n => (
                  <tr key={n.name}
                    onClick={() => { setForm(f => ({ ...f, neighborhood: n.name })); setResult(null) }}
                    className="cursor-pointer transition-colors"
                    style={{
                      borderBottom: '1px solid #f5f5f5',
                      background: form.neighborhood === n.name ? '#e8f3f0' : undefined,
                    }}>
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
