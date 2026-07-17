'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts'
import { TrendingUp, Home, DollarSign, Target, Users, Activity, Sparkles } from 'lucide-react'

interface KPISnapshot {
  period_date: string
  ventas_count: number
  ventas_uf: number
  captaciones_count: number
  conversion_rate: number
  comision_total: number
  stock_count: number
  velocidad_venta: number
}

export default function DashboardHome() {
  const [kpis, setKpis] = useState<KPISnapshot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('kpi_snapshots')
          .select('*')
          .order('period_date', { ascending: false })
          .limit(6)

        if (error) throw error
        setKpis(data || [])
      } catch (err) {
        console.error('Error fetching KPIs:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchKPIs()
  }, [])

  const latestKPI = kpis[0]
  const previousKPI = kpis[1] || null
  const chartData = [...kpis].reverse()
  const executiveScore = useMemo(() => {
    if (!latestKPI) return null
    const salesComponent = Math.min(35, latestKPI.ventas_count * 1.8)
    const conversionComponent = Math.min(35, latestKPI.conversion_rate * 4)
    const captureComponent = Math.min(20, latestKPI.captaciones_count * 1.5)
    const stockComponent = Math.max(0, 10 - Math.min(latestKPI.stock_count, 10))
    const momentumBonus = previousKPI && latestKPI.ventas_count > previousKPI.ventas_count ? 8 : 0
    return Math.max(0, Math.min(100, Math.round(salesComponent + conversionComponent + captureComponent + stockComponent + momentumBonus)))
  }, [latestKPI, previousKPI])
  const salesDelta = latestKPI && previousKPI ? latestKPI.ventas_count - previousKPI.ventas_count : null
  const conversionDelta = latestKPI && previousKPI ? latestKPI.conversion_rate - previousKPI.conversion_rate : null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#e5e7eb', borderTopColor: '#d61f2c' }}></div>
          <p style={{ color: '#6b7280' }}>Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="pb-6" style={{ borderBottom: '1px solid #e5e7eb' }}>
        <h1 className="text-4xl font-bold text-gray-900">Ventas Vitacura</h1>
        <p className="mt-2" style={{ color: '#6b7280' }}>Inteligencia operativa y performance de ventas de casas y departamentos</p>
        <p className="text-xs mt-3" style={{ color: '#b9bfbc' }}>
          {new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPI Grid */}
      {latestKPI && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Ventas Card */}
          <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-lg transition-all duration-300 border-l-4" style={{ border: '1px solid #e5e7eb', borderLeftColor: '#d61f2c' }}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Ventas Vitacura</p>
                <p className="text-4xl font-bold text-gray-900 mt-3">{latestKPI.ventas_count}</p>
                <p className="text-xs mt-2" style={{ color: '#6b7280' }}>casas y departamentos</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-300 hover:scale-110" style={{ background: '#f9fafb', color: '#d61f2c' }}>
                <Home className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* UF Vendidas Card */}
          <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-lg transition-all duration-300 border-l-4" style={{ border: '1px solid #e5e7eb', borderLeftColor: '#6b7280' }}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>UF Vendidas</p>
                <p className="text-4xl font-bold text-gray-900 mt-3">{(latestKPI.ventas_uf / 1000).toFixed(1)}K</p>
                <p className="text-xs mt-2" style={{ color: '#6b7280' }}>en volumen de ventas Vitacura</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-300 hover:scale-110" style={{ background: '#f9fafb', color: '#6b7280' }}>
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Conversión Card */}
          <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-lg transition-all duration-300 border-l-4" style={{ border: '1px solid #e5e7eb', borderLeftColor: '#d61f2c' }}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tasa Conversión</p>
                <p className="text-4xl font-bold text-gray-900 mt-3">{latestKPI.conversion_rate.toFixed(1)}%</p>
                <p className="text-xs text-gray-500 mt-2">leads a ventas de Vitacura</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center transition-transform duration-300 hover:scale-110">
                <TrendingUp className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          {/* Stock Activo Card */}
          <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-lg transition-all duration-300 border-l-4" style={{ border: '1px solid #e5e7eb', borderLeftColor: '#f59e0b' }}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock Activo</p>
                <p className="text-4xl font-bold text-gray-900 mt-3">{latestKPI.stock_count}</p>
                <p className="text-xs text-gray-500 mt-2">casas y departamentos disponibles</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center transition-transform duration-300 hover:scale-110">
                <Activity className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {latestKPI && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-white rounded-lg p-6 shadow-sm border" style={{ borderColor: '#e5e7eb' }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Score ejecutivo</p>
                <h2 className="text-xl font-semibold mt-2" style={{ color: '#111111' }}>Panel de gestión</h2>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: '#f9fafb', color: '#d61f2c' }}>
                <Target className="w-6 h-6" />
              </div>
            </div>
            <p className="mt-4 text-4xl font-bold" style={{ color: '#111111' }}>
              {executiveScore === null ? 'n/d' : `${executiveScore}%`}
            </p>
            <p className="mt-2 text-sm" style={{ color: '#6b7280' }}>
              {salesDelta !== null ? `Ventas vs periodo previo: ${salesDelta >= 0 ? '+' : ''}${salesDelta}` : 'Sin comparación previa disponible'}
            </p>
            <p className="mt-1 text-sm" style={{ color: '#6b7280' }}>
              {conversionDelta !== null ? `Conversión vs periodo previo: ${conversionDelta >= 0 ? '+' : ''}${conversionDelta.toFixed(1)} pts` : 'Sin variación previa disponible'}
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border" style={{ borderColor: '#e5e7eb' }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Lectura actual</p>
            <h2 className="text-xl font-semibold mt-2" style={{ color: '#111111' }}>Qué está pasando hoy</h2>
            <ul className="mt-4 space-y-3 text-sm" style={{ color: '#374151' }}>
              <li>• Ventas: {latestKPI.ventas_count} transacciones activas.</li>
              <li>• Conversión: {latestKPI.conversion_rate.toFixed(1)}% de leads a ventas.</li>
              <li>• Captaciones: {latestKPI.captaciones_count} oportunidades nuevas en Vitacura.</li>
              <li>• Stock: {latestKPI.stock_count} propiedades en el inventario.</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border" style={{ borderColor: '#e5e7eb' }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Siguiente acción</p>
            <h2 className="text-xl font-semibold mt-2" style={{ color: '#111111' }}>Ir al centro de reportes</h2>
            <p className="mt-4 text-sm leading-6" style={{ color: '#374151' }}>
              Ahí quedan el scorecard, los reportes por audiencia, el aprendizaje IA y el seguimiento operativo del negocio.
            </p>
            <Link href="/dashboard/reportes" className="inline-flex mt-5 items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold" style={{ background: '#111111', color: '#f9fafb' }}>
              <Sparkles className="w-4 h-4" />
              Abrir reportes
            </Link>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ventas Tendencia */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Ventas de Casas (Últimos 6 meses)</h3>
            <div className="w-2 h-2 rounded-full" style={{ background: '#d61f2c' }}></div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d61f2c" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#d61f2c" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="period_date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  padding: '12px',
                }}
                cursor={{ stroke: '#d61f2c', strokeWidth: 1 }}
              />
              <Area type="monotone" dataKey="ventas_count" stroke="#d61f2c" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVentas)" name="Ventas" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Tasa Conversión */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Tasa Conversión Casas</h3>
            <div className="w-2 h-2 rounded-full" style={{ background: '#6b7280' }}></div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="period_date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  padding: '12px',
                }}
                cursor={{ fill: '#f9fafb' }}
              />
              <Bar dataKey="conversion_rate" fill="#6b7280" name="Conversión %" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Summary Section */}
      <div className="rounded-lg p-8 border-l-4 hover:shadow-md transition-all duration-300" style={{ background: 'linear-gradient(135deg, #f9fafb 0%, #f9fafb 100%)', border: '1px solid #e5e7eb', borderLeftColor: '#d61f2c' }}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold text-lg transition-transform duration-300 hover:scale-110" style={{ background: '#d61f2c' }}>
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              Resumen Ejecutivo IA
              <span className="text-xs px-2 py-1 rounded-full font-semibold text-white" style={{ background: '#d61f2c' }}>En Tiempo Real</span>
            </h3>
            <p className="mt-3 leading-relaxed" style={{ color: '#374151' }}>
              El mercado inmobiliario continúa mostrando absorción sostenida. Las ventas del mes alcanzaron{' '}
              <span className="font-bold px-2 py-1 rounded" style={{ color: '#d61f2c', background: '#f9fafb' }}>{latestKPI.ventas_count} transacciones</span> con una tasa de conversión
              de <span className="font-bold px-2 py-1 rounded" style={{ color: '#6b7280', background: '#f9fafb' }}>{latestKPI.conversion_rate.toFixed(1)}%</span>. Se recomienda incrementar captaciones en zonas de alta demanda para
              maximizar el pipeline comercial.
            </p>
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(143, 178, 170, 0.2)' }}>
              <p className="text-xs font-semibold uppercase" style={{ color: '#d61f2c' }}>Próximas Acciones:</p>
              <ul className="mt-2 space-y-1 text-xs" style={{ color: '#374151' }}>
                <li>• Aumentar prospección en Nueva Costanera (90% absorción)</li>
                <li>• Optimizar timing de venta en Lo Curro (velocidad: 62 días)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg p-5 hover:shadow-md transition-all duration-300 border-l-4" style={{ background: '#f9fafb', border: '1px solid #d61f2c', borderLeftColor: '#d61f2c' }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#d61f2c' }}>Captaciones</p>
          <p className="text-3xl font-bold text-gray-900 mt-3">{latestKPI.captaciones_count}</p>
          <p className="text-xs mt-2" style={{ color: '#374151' }}>oportunidades nuevas</p>
        </div>
        <div className="rounded-lg p-5 hover:shadow-md transition-all duration-300 border-l-4" style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderLeftColor: '#6b7280' }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>Comisión Total</p>
          <p className="text-3xl font-bold text-gray-900 mt-3">${(latestKPI.comision_total / 1000000).toFixed(1)}M</p>
          <p className="text-xs mt-2" style={{ color: '#374151' }}>ingresos acumulados</p>
        </div>
        <div className="rounded-lg p-5 hover:shadow-md transition-all duration-300 border-l-4" style={{ background: '#f9fafb', border: '1px solid #d61f2c', borderLeftColor: '#d61f2c' }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#d61f2c' }}>Velocidad Venta</p>
          <p className="text-3xl font-bold text-gray-900 mt-3">{latestKPI.velocidad_venta.toFixed(0)} días</p>
          <p className="text-xs mt-2" style={{ color: '#374151' }}>promedio de mercado</p>
        </div>
      </div>
    </div>
  )
}

