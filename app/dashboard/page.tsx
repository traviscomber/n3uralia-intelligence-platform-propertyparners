'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, Home, DollarSign, Target, Users, Activity } from 'lucide-react'

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
          <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow" style={{ border: '1px solid #d8e5e2' }}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#555a56' }}>Ventas Mes</p>
                <p className="text-3xl font-bold text-gray-900 mt-3">{latestKPI.ventas_count}</p>
                <p className="text-xs mt-2" style={{ color: '#9ca9a3' }}>transacciones inmobiliarias</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#e8f3f0', color: '#8fb2aa' }}>
                <Home className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* UF Vendidas Card */}
          <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow" style={{ border: '1px solid #d8e5e2' }}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#555a56' }}>UF Vendidas</p>
                <p className="text-3xl font-bold text-gray-900 mt-3">{(latestKPI.ventas_uf / 1000).toFixed(1)}K</p>
                <p className="text-xs mt-2" style={{ color: '#9ca9a3' }}>en volumen de ventas</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#f5f9f7', color: '#b89a7e' }}>
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Conversión Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tasa Conversión</p>
                <p className="text-3xl font-bold text-gray-900 mt-3">{latestKPI.conversion_rate.toFixed(1)}%</p>
                <p className="text-xs text-gray-500 mt-2">leads a ventas</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Stock Activo Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock Activo</p>
                <p className="text-3xl font-bold text-gray-900 mt-3">{latestKPI.stock_count}</p>
                <p className="text-xs text-gray-500 mt-2">propiedades disponibles</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                <Activity className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ventas Tendencia */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ventas Tendencia (Últimos 6 meses)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="period_date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  background: '#f8f9fb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="ventas_count" stroke="#8fb2aa" strokeWidth={2} name="Ventas" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Tasa Conversión */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tasa Conversión</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="period_date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  background: '#f8f9fb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey="conversion_rate" fill="#b89a7e" name="Conversión %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Summary Section */}
      <div className="rounded-lg p-8" style={{ background: 'linear-gradient(135deg, #e8f3f0 0%, #f5f9f7 100%)', border: '1px solid #d8e5e2' }}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold text-lg" style={{ background: '#8fb2aa' }}>
            AI
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">Resumen Ejecutivo</h3>
            <p className="mt-2" style={{ color: '#555a56' }}>
              El mercado inmobiliario continúa mostrando absorción sostenida. Las ventas del mes alcanzaron{' '}
              <span className="font-bold" style={{ color: '#8fb2aa' }}>{latestKPI.ventas_count} transacciones</span> con una tasa de conversión
              de <span className="font-bold" style={{ color: '#b89a7e' }}>{latestKPI.conversion_rate.toFixed(1)}%</span>. Se recomienda incrementar captaciones en zonas de alta demanda para
              maximizar el pipeline comercial.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg p-4" style={{ background: '#e8f3f0', border: '1px solid #8fb2aa' }}>
          <p className="text-xs font-semibold uppercase" style={{ color: '#8fb2aa' }}>Captaciones</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{latestKPI.captaciones_count}</p>
        </div>
        <div className="rounded-lg p-4" style={{ background: '#f5f9f7', border: '1px solid #d8e5e2' }}>
          <p className="text-xs font-semibold uppercase" style={{ color: '#b89a7e' }}>Comisión Total</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">${(latestKPI.comision_total / 1000000).toFixed(1)}M</p>
        </div>
        <div className="rounded-lg p-4" style={{ background: '#e8f3f0', border: '1px solid #10b981' }}>
          <p className="text-xs font-semibold uppercase" style={{ color: '#10b981' }}>Velocidad Venta</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{latestKPI.velocidad_venta.toFixed(0)} días</p>
        </div>
      </div>
    </div>
  )
}
