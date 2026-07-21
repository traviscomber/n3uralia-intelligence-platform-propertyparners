'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { AiReport } from '@/lib/types'
import { PP_SCORECARD_DEFINITIONS, assessMetricStatus, clampScore } from '@/lib/pp-scorecard'
import { buildDirectorFallbackRows, buildOperationalSeries, getDataQuality, getOperationalSummary, getRoleActions, getYtdSummary } from '@/lib/crm-snapshot'

function fmt(n: number) {
  return n.toLocaleString('es-CL')
}

function scoreTone(status: 'good' | 'warning' | 'critical' | 'inactive') {
  if (status === 'good') return 'var(--n3-teal)'
  if (status === 'warning') return '#f59e0b'
  if (status === 'critical') return '#ef4444'
  return '#6b7280'
}

function KpiCard({ label, value, sub, border }: { label: string; value: string; sub?: string; border: string }) {
  return (
    <div className="bg-white rounded-lg p-5 flex flex-col gap-1" style={{ border: '1px solid #e8f0ed', borderLeft: `3px solid ${border}` }}>
      <span className="text-[11px] uppercase tracking-wider font-medium" style={{ color: '#6b7280' }}>{label}</span>
      <span className="text-2xl font-bold tracking-tight" style={{ color: '#111111' }}>{value}</span>
      {sub && <span className="text-xs" style={{ color: '#6b7280' }}>{sub}</span>}
    </div>
  )
}

export default function CeoDashboard() {
  const fallbackSummary = getOperationalSummary()
  const fallbackSeries = buildOperationalSeries(6).map(({ mes, ventas, captaciones, leads }) => ({ mes, ventas, captaciones, leads }))
  const directors = buildDirectorFallbackRows()
  const chartData = fallbackSeries
  const ytd = getYtdSummary()
  const dataQuality = getDataQuality()
  const executiveActions = getRoleActions('ceo')
  const [reports, setReports] = useState<AiReport[]>([])
  const totals = {
    ventas: ytd.salesCount,
    uf: ytd.salesUf,
    conversion: fallbackSummary.leadToSaleProxy,
  }
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: reportRows } = await supabase.from('ai_reports').select('*').order('created_at', { ascending: false }).limit(3)
        if (reportRows) setReports(reportRows as AiReport[])
      } catch (_) {
        // keep snapshot fallback
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const executiveMetrics = PP_SCORECARD_DEFINITIONS.ceo
  const executiveStates = useMemo(() => {
    const scoreById: Record<string, number | null> = {
      'data-quality': dataQuality.sourceCoverage,
      'stock-retention': fallbackSummary.stock > 0 ? Number(((fallbackSummary.stock / (fallbackSummary.stock - ytd.stockChange)) * 100).toFixed(1)) : null,
      'forecast-discipline': null,
    }

    const states = executiveMetrics.map(metric => {
      const current = scoreById[metric.id] ?? null
      return {
        ...metric,
        current,
        status: assessMetricStatus(current, metric),
      }
    })

    const measured = states.filter((metric) => metric.current !== null)
    const score = measured.length ? clampScore(measured.reduce((sum, metric) => sum + (metric.current ?? 0), 0) / measured.length) : 0

    return {
      score,
      states,
      trend: score >= 80 ? 'Estable' : score >= 65 ? 'En vigilancia' : 'Bajo control',
    }
  }, [dataQuality.sourceCoverage, executiveMetrics, fallbackSummary.stock, ytd.stockChange])
  const recentReports = reports.slice(0, 3)

  return (
    <div className="flex-1 overflow-y-auto px-8 py-8" style={{ background: '#fbfbfa' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-widest px-2 py-0.5 rounded" style={{ background: '#111111', color: 'var(--n3-teal)' }}>CEO</span>
            <span className="text-xs" style={{ color: '#6b7280' }}>Vista Ejecutiva</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#111111' }}>Panel de Comando</h1>
            <p className="text-sm mt-1" style={{ color: '#6b7280' }}>Resumen global del negocio · {loading ? 'Cargando...' : 'Actualizado ahora'}</p>
        </div>
        <div className="text-right">
          <div className="text-xs" style={{ color: '#6b7280' }}>Acumulado 6 meses</div>
          <div className="text-sm font-semibold" style={{ color: '#111111' }}>{new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}</div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <KpiCard label="Ventas totales"     value={fmt(totals.ventas)}           sub="propiedades cerradas (6m)"  border="var(--n3-teal)" />
        <KpiCard
          label="UF vendidas"
          value={totals.uf > 0 ? `${(totals.uf / 1000).toFixed(0)}K UF` : 'n/d'}
          sub={totals.uf > 0 ? 'volumen validado enero-junio' : 'UF no disponible en el corte'}
          border="#6b7280"
        />
        <KpiCard label="Cobertura de fuentes" value={`${dataQuality.sourceCoverage}%`} sub="datasets mensuales presentes / esperados" border="var(--n3-teal)" />
        <KpiCard label="Cierres / leads Jun" value={`${totals.conversion}%`} sub="proxy mensual, no cohorte" border="#111111" />
      </div>

      {/* Executive Scorecard */}
      <div className="grid grid-cols-5 gap-5 mb-8">
        <div className="col-span-2 bg-white rounded-lg p-5" style={{ border: '1px solid #e8f0ed' }}>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: '#111111' }}>Score ejecutivo</h2>
              <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Lectura profesional para CEO y directorio</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold" style={{ color: executiveStates.score >= 80 ? 'var(--n3-teal)' : executiveStates.score >= 65 ? '#f59e0b' : '#ef4444' }}>
                {executiveStates.score}
              </div>
              <div className="text-[11px]" style={{ color: '#6b7280' }}>{executiveStates.trend}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {executiveStates.states.map(metric => (
              <div key={metric.id} className="rounded-lg p-3" style={{ background: '#f8fbfa', border: '1px solid #edf4f1' }}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>{metric.label}</span>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: scoreTone(metric.status) }} />
                </div>
                <div className="text-lg font-bold" style={{ color: '#111111' }}>
                  {metric.current === null ? 'â€”' : metric.unit ? `${metric.current}${metric.unit}` : metric.current}
                </div>
                <div className="text-[11px] leading-snug mt-1" style={{ color: '#6b7280' }}>{metric.note}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-2 bg-white rounded-lg p-5" style={{ border: '1px solid #e8f0ed' }}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: '#111111' }}>Métricas CEO</h2>
              <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Umbrales, cadencia y responsables</p>
            </div>
            <span className="text-[11px] px-2 py-1 rounded-full" style={{ background: '#f0f7f4', color: 'var(--n3-teal)' }}>Vitacura ventas</span>
          </div>
          <div className="space-y-3">
            {executiveMetrics.map(metric => (
              <div key={metric.id} className="rounded-lg p-3" style={{ background: '#fbfbfa', border: '1px solid #edf4f1' }}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-semibold" style={{ color: '#111111' }}>{metric.label}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: '#6b7280' }}>{metric.formula}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-medium" style={{ color: '#111111' }}>{metric.cadence}</div>
                    <div className="text-[11px]" style={{ color: '#6b7280' }}>Owner: {metric.owner}</div>
                  </div>
                </div>
                <div className="text-[11px] mt-2" style={{ color: '#6b7280' }}>{metric.threshold}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-1 bg-white rounded-lg p-5" style={{ border: '1px solid #e8f0ed' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: '#111111' }}>Últimos reportes IA</h2>
              <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Señales recientes para decisión</p>
            </div>
          </div>
          <div className="space-y-3">
            {recentReports.length === 0 ? (
              <div className="text-xs rounded-lg p-3" style={{ background: '#f8fbfa', color: '#6b7280', border: '1px dashed #dbe7e3' }}>
                No hay reportes aún.
              </div>
            ) : (
              recentReports.map(report => (
                <div key={report.id} className="rounded-lg p-3" style={{ background: '#f8fbfa', border: '1px solid #edf4f1' }}>
                  <div className="text-[12px] font-semibold leading-snug" style={{ color: '#111111' }}>{report.title}</div>
                  <div className="text-[11px] mt-1 line-clamp-3" style={{ color: '#6b7280' }}>{report.summary || 'Sin resumen disponible.'}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Director Ranking + Sales Chart */}
      <div className="grid grid-cols-5 gap-5 mb-8">
        {/* Ranking table */}
        <div className="col-span-3 bg-white rounded-lg overflow-hidden" style={{ border: '1px solid #e8f0ed' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #f0f5f3' }}>
            <h2 className="text-sm font-semibold" style={{ color: '#111111' }}>Ventas por sucursal</h2>
            <span className="text-xs" style={{ color: '#6b7280' }}>6 meses</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#f8fbfa' }}>
                <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>#</th>
                <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Sucursal</th>
                <th className="text-right px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Ventas</th>
                <th className="text-right px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>UF</th>
                <th className="text-right px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Meta</th>
                <th className="text-right px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Comisión</th>
              </tr>
            </thead>
            <tbody>
              {directors.map((d, i) => {
                const medals = ['#f59e0b', '#6b7280', '#6b7280']
                return (
                  <tr key={d.id} style={{ borderTop: '1px solid #f0f5f3' }}>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-bold" style={{ color: medals[i] || '#6b7280' }}>{i + 1}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0" style={{ background: '#f9fafb', color: 'var(--n3-teal)' }}>
                          {d.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-[13px] font-medium" style={{ color: '#111111' }}>{d.name}</div>
                          <div className="text-[11px]" style={{ color: '#6b7280' }}>{d.team}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-[13px] font-semibold" style={{ color: '#111111' }}>{d.ventas}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-[13px]" style={{ color: '#374151' }}>{d.uf === null ? 'n/d' : `${(d.uf / 1000).toFixed(0)}K`}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-[12px] font-semibold" style={{ color: '#6b7280' }}>No cargada</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-[13px]" style={{ color: '#374151' }}>n/d</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Sales trend */}
        <div className="col-span-2 bg-white rounded-lg" style={{ border: '1px solid #e8f0ed' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid #f0f5f3' }}>
            <h2 className="text-sm font-semibold" style={{ color: '#111111' }}>Tendencia operativa real</h2>
            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Últimos 6 meses</p>
          </div>
          <div className="px-4 pt-4 pb-2">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--n3-teal)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--n3-teal)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gCaptaciones" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6b7280" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6b7280" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#111111" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#111111" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f5f3" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e8f0ed', borderRadius: 6, fontSize: 12 }} />
                <Bar dataKey="ventas" fill="url(#gVentas)" radius={[4, 4, 0, 0]} name="Ventas" />
                <Bar dataKey="captaciones" fill="url(#gCaptaciones)" radius={[4, 4, 0, 0]} name="Captaciones" />
                <Bar dataKey="leads" fill="url(#gLeads)" radius={[4, 4, 0, 0]} name="Leads" />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 justify-center">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--n3-teal)' }} /><span className="text-[11px]" style={{ color: '#6b7280' }}>Ventas</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ background: '#6b7280' }} /><span className="text-[11px]" style={{ color: '#6b7280' }}>Captaciones</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ background: '#111111' }} /><span className="text-[11px]" style={{ color: '#6b7280' }}>Leads</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Decisions + Reports */}
      <div className="grid grid-cols-5 gap-5">
        <div className="col-span-3 bg-white rounded-lg" style={{ border: '1px solid #e8f0ed' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid #f0f5f3' }}>
            <h2 className="text-sm font-semibold" style={{ color: '#111111' }}>Decisiones ejecutivas sugeridas</h2>
            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Acciones calculadas desde el corte CRM validado</p>
          </div>
          <div className="divide-y" style={{ borderColor: '#f0f5f3' }}>
            {executiveActions.map((item) => (
              <div key={item.title} className="px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-[13px] font-semibold" style={{ color: '#111111' }}>{item.title}</h3>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase" style={{ background: item.priority === 'high' ? '#fff7ed' : '#f0f7f4', color: item.priority === 'high' ? '#c2410c' : 'var(--n3-teal)' }}>{item.priority}</span>
                </div>
                <p className="mt-1 text-xs" style={{ color: '#6b7280' }}>{item.evidence}</p>
                <p className="mt-2 text-xs font-medium" style={{ color: '#111111' }}>{item.action}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Latest AI Reports */}
        <div className="col-span-2 bg-white rounded-lg" style={{ border: '1px solid #e8f0ed' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid #f0f5f3' }}>
            <h2 className="text-sm font-semibold" style={{ color: '#111111' }}>Reportes IA Recientes</h2>
          </div>
          <div className="divide-y" style={{ borderColor: '#f0f5f3' }}>
            {reports.length === 0 ? (
              <div className="px-5 py-8 text-center">
            <p className="text-xs" style={{ color: '#6b7280' }}>Sin reportes generados aún.</p>
                <a href="/dashboard/reportes" className="text-xs mt-1 block hover:underline" style={{ color: 'var(--n3-teal)' }}>Generar primer reporte</a>
              </div>
            ) : (
              reports.map(r => (
                <div key={r.id} className="px-5 py-3.5">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-[12px] font-medium leading-snug" style={{ color: '#111111' }}>{r.title}</span>
                    <span className="text-[10px] shrink-0" style={{ color: '#6b7280' }}>
                      {r.period_date ? new Date(r.period_date).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }) : 'â€”'}
                    </span>
                  </div>
                  {r.summary && <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: '#6b7280' }}>{r.summary}</p>}
                  <span className="inline-block mt-1.5 text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#f0f7f4', color: 'var(--n3-teal)' }}>{r.report_type}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


