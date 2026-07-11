'use client'

import { useEffect, useState } from 'react'
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
  const chartData = [...kpis].reverse()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#d8e5e2', borderTopColor: '#8fb2aa' }}></div>
          <p style={{ color: '#9ca9a3' }}>Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="pb-6" style={{ borderBottom: '1px solid #d8e5e2' }}>
        <h1 className="text-4xl font-bold text-gray-900">Executive Dashboard</h1>
        <p className="mt-2" style={{ color: '#9ca9a3' }}>Real-time market intelligence and performance metrics</p>
        <p className="text-xs mt-3" style={{ color: '#b9bfbc' }}>
          {new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPI Grid */}
      {latestKPI && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Ventas Card */}
          <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-lg transition-all duration-300 border-l-4" style={{ border: '1px solid #d8e5e2', borderLeftColor: '#8fb2aa' }}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#555a56' }}>Ventas Mes</p>
                <p className="text-4xl font-bold text-gray-900 mt-3">{latestKPI.ventas_count}</p>
                <p className="text-xs mt-2" style={{ color: '#9ca9a3' }}>transacciones inmobiliarias</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-300 hover:scale-110" style={{ background: '#e8f3f0', color: '#8fb2aa' }}>
                <Home className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* UF Vendidas Card */}
          <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-lg transition-all duration-300 border-l-4" style={{ border: '1px solid #d8e5e2', borderLeftColor: '#b89a7e' }}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#555a56' }}>UF Vendidas</p>
                <p className="text-4xl font-bold text-gray-900 mt-3">{(latestKPI.ventas_uf / 1000).toFixed(1)}K</p>
                <p className="text-xs mt-2" style={{ color: '#9ca9a3' }}>en volumen de ventas</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-300 hover:scale-110" style={{ background: '#f5f9f7', color: '#b89a7e' }}>
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Conversión Card */}
          <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-lg transition-all duration-300 border-l-4" style={{ border: '1px solid #d8e5e2', borderLeftColor: '#10b981' }}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tasa Conversión</p>
                <p className="text-4xl font-bold text-gray-900 mt-3">{latestKPI.conversion_rate.toFixed(1)}%</p>
                <p className="text-xs text-gray-500 mt-2">leads a ventas</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center transition-transform duration-300 hover:scale-110">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Stock Activo Card */}
          <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-lg transition-all duration-300 border-l-4" style={{ border: '1px solid #d8e5e2', borderLeftColor: '#f59e0b' }}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock Activo</p>
                <p className="text-4xl font-bold text-gray-900 mt-3">{latestKPI.stock_count}</p>
                <p className="text-xs text-gray-500 mt-2">propiedades disponibles</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center transition-transform duration-300 hover:scale-110">
                <Activity className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ventas Tendencia */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Ventas Tendencia (Últimos 6 meses)</h3>
            <div className="w-2 h-2 rounded-full" style={{ background: '#8fb2aa' }}></div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8fb2aa" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8fb2aa" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="period_date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  background: 'white',
                  border: '1px solid #d8e5e2',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  padding: '12px',
                }}
                cursor={{ stroke: '#8fb2aa', strokeWidth: 1 }}
              />
              <Area type="monotone" dataKey="ventas_count" stroke="#8fb2aa" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVentas)" name="Ventas" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Tasa Conversión */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Tasa Conversión</h3>
            <div className="w-2 h-2 rounded-full" style={{ background: '#b89a7e' }}></div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="period_date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  background: 'white',
                  border: '1px solid #d8e5e2',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  padding: '12px',
                }}
                cursor={{ fill: '#e8f3f0' }}
              />
              <Bar dataKey="conversion_rate" fill="#b89a7e" name="Conversión %" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Summary Section */}
      <div className="rounded-lg p-8 border-l-4 hover:shadow-md transition-all duration-300" style={{ background: 'linear-gradient(135deg, #e8f3f0 0%, #f5f9f7 100%)', border: '1px solid #d8e5e2', borderLeftColor: '#8fb2aa' }}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold text-lg transition-transform duration-300 hover:scale-110" style={{ background: '#8fb2aa' }}>
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              Resumen Ejecutivo IA
              <span className="text-xs px-2 py-1 rounded-full font-semibold text-white" style={{ background: '#8fb2aa' }}>En Tiempo Real</span>
            </h3>
            <p className="mt-3 leading-relaxed" style={{ color: '#555a56' }}>
              El mercado inmobiliario continúa mostrando absorción sostenida. Las ventas del mes alcanzaron{' '}
              <span className="font-bold px-2 py-1 rounded" style={{ color: '#8fb2aa', background: '#e8f3f0' }}>{latestKPI.ventas_count} transacciones</span> con una tasa de conversión
              de <span className="font-bold px-2 py-1 rounded" style={{ color: '#b89a7e', background: '#f5f9f7' }}>{latestKPI.conversion_rate.toFixed(1)}%</span>. Se recomienda incrementar captaciones en zonas de alta demanda para
              maximizar el pipeline comercial.
            </p>
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(143, 178, 170, 0.2)' }}>
              <p className="text-xs font-semibold uppercase" style={{ color: '#8fb2aa' }}>Próximas Acciones:</p>
              <ul className="mt-2 space-y-1 text-xs" style={{ color: '#555a56' }}>
                <li>• Aumentar prospección en Nueva Costanera (90% absorción)</li>
                <li>• Optimizar timing de venta en La Dehesa (velocidad: 62 días)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg p-5 hover:shadow-md transition-all duration-300 border-l-4" style={{ background: '#e8f3f0', border: '1px solid #8fb2aa', borderLeftColor: '#8fb2aa' }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#8fb2aa' }}>Captaciones</p>
          <p className="text-3xl font-bold text-gray-900 mt-3">{latestKPI.captaciones_count}</p>
          <p className="text-xs mt-2" style={{ color: '#555a56' }}>oportunidades nuevas</p>
        </div>
        <div className="rounded-lg p-5 hover:shadow-md transition-all duration-300 border-l-4" style={{ background: '#f5f9f7', border: '1px solid #d8e5e2', borderLeftColor: '#b89a7e' }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#b89a7e' }}>Comisión Total</p>
          <p className="text-3xl font-bold text-gray-900 mt-3">${(latestKPI.comision_total / 1000000).toFixed(1)}M</p>
          <p className="text-xs mt-2" style={{ color: '#555a56' }}>ingresos acumulados</p>
        </div>
        <div className="rounded-lg p-5 hover:shadow-md transition-all duration-300 border-l-4" style={{ background: '#e8f3f0', border: '1px solid #10b981', borderLeftColor: '#10b981' }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#10b981' }}>Velocidad Venta</p>
          <p className="text-3xl font-bold text-gray-900 mt-3">{latestKPI.velocidad_venta.toFixed(0)} días</p>
          <p className="text-xs mt-2" style={{ color: '#555a56' }}>promedio de mercado</p>
        </div>
      </div>
    </div>
  )
}
