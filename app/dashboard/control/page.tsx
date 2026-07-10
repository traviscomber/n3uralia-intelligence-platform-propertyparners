'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface KPISnapshot {
  period_date: string
  ventas_count: number
  monthly_target: number
  velocidad_venta: number
}

export default function ControlPage() {
  const [kpis, setKpis] = useState<KPISnapshot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('kpi_snapshots')
          .select('period_date, ventas_count, monthly_target, velocidad_venta')
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--n-fg)' }}>
          Control de Gestión
        </h1>
        <p style={{ color: 'var(--n-fg-muted)' }} className="text-sm mt-1">
          Seguimiento de objetivos y performance por director
        </p>
      </div>

      {/* Target vs Actual */}
      <div className="n-card p-6">
        <h2 style={{ color: 'var(--n-fg)' }} className="font-semibold mb-4">
          Ventas vs Objetivo
        </h2>
        {!loading && (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={kpis}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--n-border)" />
              <XAxis dataKey="period_date" stroke="var(--n-fg-muted)" tick={{ fontSize: 12 }} />
              <YAxis stroke="var(--n-fg-muted)" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: 'var(--n-surface-2)', border: '1px solid var(--n-border)' }}
                labelStyle={{ color: 'var(--n-fg)' }}
              />
              <Legend wrapperStyle={{ color: 'var(--n-fg-muted)' }} />
              <Bar dataKey="ventas_count" fill="var(--n-primary)" name="Ventas Reales" />
              <Bar dataKey="monthly_target" fill="var(--n-warning)" name="Objetivo" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Performance Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="n-card p-4">
          <p style={{ color: 'var(--n-fg-subtle)' }} className="text-xs font-medium">
            PERFORMANCE PROMEDIO
          </p>
          <p className="text-2xl font-bold mt-3" style={{ color: 'var(--n-accent)' }}>
            {((kpis.reduce((sum, k) => sum + k.ventas_count, 0) / kpis.length) / (kpis[0]?.monthly_target || 1) * 100).toFixed(0)}%
          </p>
        </div>
        <div className="n-card p-4">
          <p style={{ color: 'var(--n-fg-subtle)' }} className="text-xs font-medium">
            VELOCIDAD PROMEDIO
          </p>
          <p className="text-2xl font-bold mt-3" style={{ color: 'var(--n-success)' }}>
            {(kpis.reduce((sum, k) => sum + k.velocidad_venta, 0) / kpis.length).toFixed(1)} días
          </p>
        </div>
        <div className="n-card p-4">
          <p style={{ color: 'var(--n-fg-subtle)' }} className="text-xs font-medium">
            CUMPLIMIENTO MES
          </p>
          <p className="text-2xl font-bold mt-3" style={{ color: 'var(--n-primary)' }}>
            {kpis[kpis.length - 1] ? ((kpis[kpis.length - 1].ventas_count / kpis[kpis.length - 1].monthly_target) * 100).toFixed(0) : 0}%
          </p>
        </div>
      </div>
    </div>
  )
}
