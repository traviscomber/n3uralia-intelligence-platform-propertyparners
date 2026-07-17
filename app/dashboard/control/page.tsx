'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, FunnelChart, Funnel, Cell } from 'recharts'
import { Target, TrendingUp } from 'lucide-react'

interface KPISnapshot {
  period_date: string
  ventas_count: number
  monthly_target: number
  velocidad_venta: number
  conversion_rate: number
}

const COLORS = ['#d61f2c', '#6b7280', '#d61f2c', '#f59e0b']

export default function ControlPage() {
  const [kpis, setKpis] = useState<KPISnapshot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('kpi_snapshots')
          .select('*')
          .order('period_date', { ascending: false })
          .limit(12)

        setKpis((data || []).reverse())
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchKPIs()
  }, [])

  const funnelData = [
    { name: 'Leads', value: 1200 },
    { name: 'Calificados', value: 450 },
    { name: 'Negociación', value: 180 },
    { name: 'Cierre', value: 64 },
  ]

  const directors = [
    { name: 'Juan Morales', target: 25, actual: 24, conversion: 8.8 },
    { name: 'María García', target: 22, actual: 21, conversion: 8.2 },
    { name: 'Carlos López', target: 20, actual: 19, conversion: 7.9 },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando datos...</p>
        </div>
      </div>
    )
  }

  const avgPerformance = kpis.length > 0 ? (kpis.reduce((sum, k) => sum + (k.ventas_count / (k.monthly_target || 1)), 0) / kpis.length * 100).toFixed(0) : '0'
  const avgVelocity = kpis.length > 0 ? (kpis.reduce((sum, k) => sum + k.velocidad_venta, 0) / kpis.length).toFixed(1) : '0'

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900">Control de Gestión</h1>
        <p className="text-sm text-gray-600 mt-2">Monitoreo de objetivos y performance de directores</p>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4" style={{ border: '1px solid #e5e7eb' }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Desempeno promedio</p>
          <p className="text-3xl font-bold mt-3" style={{ color: '#d61f2c' }}>{avgPerformance}%</p>
          <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Cumplimiento vs objetivo</p>
        </div>
        <div className="bg-white rounded-lg p-4" style={{ border: '1px solid #e5e7eb' }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Velocidad Promedio</p>
          <p className="text-3xl font-bold mt-3" style={{ color: '#6b7280' }}>{avgVelocity}</p>
          <p className="text-xs mt-1" style={{ color: '#6b7280' }}>dias promedio de venta</p>
        </div>
        <div className="bg-white rounded-lg p-4" style={{ border: '1px solid #e5e7eb' }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Directores</p>
          <p className="text-3xl font-bold mt-3" style={{ color: '#d61f2c' }}>{directors.length}</p>
          <p className="text-xs mt-1" style={{ color: '#6b7280' }}>en seguimiento activo</p>
        </div>
      </div>

      {/* Directors Performance Cards */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Desempeno por Director</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {directors.map(director => {
            const achievement = (director.actual / director.target * 100).toFixed(0)
            const onTrack = director.actual >= director.target
            return (
              <div key={director.name} className="bg-white rounded-lg p-5" style={{ border: '1px solid #e5e7eb' }}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold text-gray-900">{director.name}</p>
                    <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Director Comercial</p>
                  </div>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: onTrack ? '#f9fafb' : '#fef3f2' }}>
                    <Target className="w-4 h-4" style={{ color: onTrack ? '#d61f2c' : '#d97706' }} />
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs uppercase font-semibold mb-1" style={{ color: '#374151' }}>Ventas Mes</p>
                    <p className="text-2xl font-bold text-gray-900">{director.actual}/{director.target}</p>
                    <div className="w-full rounded-full h-1.5 mt-2" style={{ background: '#e5e7eb' }}>
                      <div className="h-1.5 rounded-full" style={{ background: onTrack ? '#d61f2c' : '#f59e0b', width: `${Math.min(parseInt(achievement), 100)}%` }}></div>
                    </div>
                    <p className="text-xs mt-1" style={{ color: '#6b7280' }}>{achievement}% del target</p>
                  </div>
                  <div className="pt-2" style={{ borderTop: '1px solid #f0f0f0' }}>
                    <p className="text-xs uppercase font-semibold mb-1" style={{ color: '#374151' }}>Conversión</p>
                    <p className="text-lg font-bold" style={{ color: '#6b7280' }}>{director.conversion}%</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #e5e7eb' }}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ventas vs Objetivo (12 meses)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={kpis}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="period_date" stroke="#6b7280" tick={{ fontSize: 12 }} />
              <YAxis stroke="#6b7280" />
              <Tooltip contentStyle={{ background: '#fbfbfa', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Legend />
              <Bar dataKey="ventas_count" fill="#d61f2c" name="Ventas Reales" />
              <Bar dataKey="monthly_target" fill="#e5e7eb" name="Objetivo" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #e5e7eb' }}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversión (Tendencia)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={kpis}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="period_date" stroke="#6b7280" tick={{ fontSize: 12 }} />
              <YAxis stroke="#6b7280" />
              <Tooltip contentStyle={{ background: '#fbfbfa', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="conversion_rate" stroke="#6b7280" strokeWidth={2} name="Conversión %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sales Funnel */}
      <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #e5e7eb' }}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Embudo de Ventas</h3>
        <ResponsiveContainer width="100%" height={250}>
          <FunnelChart>
            <Tooltip contentStyle={{ background: '#fbfbfa', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
            <Funnel dataKey="value" data={funnelData} fill="#d61f2c">
              {funnelData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}


