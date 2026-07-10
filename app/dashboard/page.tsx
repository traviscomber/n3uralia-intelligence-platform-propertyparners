'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, Users, Home, Target } from 'lucide-react'

interface KPISnapshot {
  period_date: string
  ventas_count: number
  ventas_uf: number
  captaciones_count: number
  conversion_rate: number
  comision_total: number
  stock_count: number
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--n-fg)' }}>
          Executive Dashboard
        </h1>
        <p style={{ color: 'var(--n-fg-muted)' }} className="text-sm mt-1">
          Real-time market intelligence and performance metrics
        </p>
      </div>

      {/* KPI Grid */}
      {latestKPI && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="n-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p style={{ color: 'var(--n-fg-subtle)' }} className="text-xs font-medium">
                  VENTAS MES
                </p>
                <p className="text-2xl font-bold mt-2" style={{ color: 'var(--n-primary)' }}>
                  {latestKPI.ventas_count}
                </p>
              </div>
              <Home className="w-8 h-8" style={{ color: 'var(--n-primary)' }} opacity={0.5} />
            </div>
          </div>

          <div className="n-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p style={{ color: 'var(--n-fg-subtle)' }} className="text-xs font-medium">
                  UF VENDIDAS
                </p>
                <p className="text-2xl font-bold mt-2" style={{ color: 'var(--n-accent)' }}>
                  {(latestKPI.ventas_uf / 1000).toFixed(1)}K
                </p>
              </div>
              <TrendingUp className="w-8 h-8" style={{ color: 'var(--n-accent)' }} opacity={0.5} />
            </div>
          </div>

          <div className="n-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p style={{ color: 'var(--n-fg-subtle)' }} className="text-xs font-medium">
                  CONVERSIÓN
                </p>
                <p className="text-2xl font-bold mt-2" style={{ color: 'var(--n-success)' }}>
                  {latestKPI.conversion_rate.toFixed(1)}%
                </p>
              </div>
              <Target className="w-8 h-8" style={{ color: 'var(--n-success)' }} opacity={0.5} />
            </div>
          </div>

          <div className="n-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p style={{ color: 'var(--n-fg-subtle)' }} className="text-xs font-medium">
                  STOCK ACTIVO
                </p>
                <p className="text-2xl font-bold mt-2" style={{ color: 'var(--n-warning)' }}>
                  {latestKPI.stock_count}
                </p>
              </div>
              <Users className="w-8 h-8" style={{ color: 'var(--n-warning)' }} opacity={0.5} />
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ventas Trend */}
        <div className="n-card p-6">
          <h2 style={{ color: 'var(--n-fg)' }} className="font-semibold mb-4">
            Ventas Tendencia (últimos 6 meses)
          </h2>
          {!loading && (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={kpis.reverse()}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--n-border)" />
                <XAxis
                  dataKey="period_date"
                  stroke="var(--n-fg-muted)"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="var(--n-fg-muted)" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: 'var(--n-surface-2)', border: '1px solid var(--n-border)' }}
                  labelStyle={{ color: 'var(--n-fg)' }}
                />
                <Legend wrapperStyle={{ color: 'var(--n-fg-muted)' }} />
                <Line
                  type="monotone"
                  dataKey="ventas_count"
                  stroke="var(--n-primary)"
                  name="Ventas"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Conversion Rate */}
        <div className="n-card p-6">
          <h2 style={{ color: 'var(--n-fg)' }} className="font-semibold mb-4">
            Tasa Conversión
          </h2>
          {!loading && (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={kpis}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--n-border)" />
                <XAxis
                  dataKey="period_date"
                  stroke="var(--n-fg-muted)"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="var(--n-fg-muted)" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: 'var(--n-surface-2)', border: '1px solid var(--n-border)' }}
                  labelStyle={{ color: 'var(--n-fg)' }}
                />
                <Legend wrapperStyle={{ color: 'var(--n-fg-muted)' }} />
                <Bar
                  dataKey="conversion_rate"
                  fill="var(--n-accent)"
                  name="Conversión %"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* AI Summary */}
      <div className="n-card p-6 border-l-4" style={{ borderLeftColor: 'var(--n-primary)' }}>
        <h3 style={{ color: 'var(--n-fg)' }} className="font-semibold mb-3 flex items-center gap-2">
          <span style={{ background: 'var(--n-primary-muted)' }} className="px-2 py-1 rounded text-xs">
            AI
          </span>
          Resumen Ejecutivo
        </h3>
        <p style={{ color: 'var(--n-fg-muted)' }} className="text-sm leading-relaxed">
          El mercado inmobiliario continúa mostrando absorción sostenida. Las ventas del mes alcanzaron{' '}
          <strong style={{ color: 'var(--n-primary)' }}>{latestKPI?.ventas_count} transacciones</strong> con una tasa de
          conversión de <strong style={{ color: 'var(--n-accent)' }}>{latestKPI?.conversion_rate}%</strong>. Se recomienda
          incrementar captaciones en zonas de alta demanda para maximizar el pipeline comercial.
        </p>
      </div>
    </div>
  )
}
