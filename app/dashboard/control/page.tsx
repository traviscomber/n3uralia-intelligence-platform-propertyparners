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

const COLORS = ['#5b6ef5', '#00d9ff', '#10b981', '#f59e0b']

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
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Performance Promedio</p>
          <p className="text-3xl font-bold text-blue-600 mt-3">{avgPerformance}%</p>
          <p className="text-xs text-gray-500 mt-1">Cumplimiento vs objetivo</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Velocidad Promedio</p>
          <p className="text-3xl font-bold text-cyan-600 mt-3">{avgVelocity}</p>
          <p className="text-xs text-gray-500 mt-1">días promedio de venta</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Directores</p>
          <p className="text-3xl font-bold text-green-600 mt-3">{directors.length}</p>
          <p className="text-xs text-gray-500 mt-1">en seguimiento activo</p>
        </div>
      </div>

      {/* Directors Performance Cards */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Performance por Director</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {directors.map(director => {
            const achievement = (director.actual / director.target * 100).toFixed(0)
            const onTrack = director.actual >= director.target
            return (
              <div key={director.name} className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold text-gray-900">{director.name}</p>
                    <p className="text-xs text-gray-500 mt-1">Director Comercial</p>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${onTrack ? 'bg-green-100' : 'bg-orange-100'}`}>
                    <Target className={`w-4 h-4 ${onTrack ? 'text-green-600' : 'text-orange-600'}`} />
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Ventas Mes</p>
                    <p className="text-2xl font-bold text-gray-900">{director.actual}/{director.target}</p>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                      <div className={`h-1.5 rounded-full ${onTrack ? 'bg-green-500' : 'bg-orange-500'}`} style={{ width: `${Math.min(parseInt(achievement), 100)}%` }}></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{achievement}% del target</p>
                  </div>
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Conversión</p>
                    <p className="text-lg font-bold text-cyan-600">{director.conversion}%</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ventas vs Objetivo (12 meses)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={kpis}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="period_date" stroke="#9ca3af" tick={{ fontSize: 12 }} />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ background: '#f8f9fb', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Legend />
              <Bar dataKey="ventas_count" fill="#5b6ef5" name="Ventas Reales" />
              <Bar dataKey="monthly_target" fill="#cbd5e1" name="Objetivo" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversión (Tendencia)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={kpis}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="period_date" stroke="#9ca3af" tick={{ fontSize: 12 }} />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ background: '#f8f9fb', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="conversion_rate" stroke="#00d9ff" strokeWidth={2} name="Conversión %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sales Funnel */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Embudo de Ventas</h3>
        <ResponsiveContainer width="100%" height={250}>
          <FunnelChart>
            <Tooltip contentStyle={{ background: '#f8f9fb', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
            <Funnel dataKey="value" data={funnelData} fill="#5b6ef5">
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
