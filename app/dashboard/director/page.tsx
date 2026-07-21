'use client'

import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { AgentActivity } from '@/lib/types'
import { PP_SCORECARD_DEFINITIONS, assessMetricStatus } from '@/lib/pp-scorecard'
import { buildAgentFallbackRows, buildOperationalSeries, getLatestLeadSnapshot, getOperationalSummary, getRoleActions, getYtdSummary } from '@/lib/crm-snapshot'
import { getTargetSource } from '@/lib/targets-2026'

type StatusKey = 'on_track' | 'warning' | 'behind' | 'inactive'

const STATUS_LABELS: Record<StatusKey, { label: string; bg: string; color: string }> = {
  on_track: { label: 'En Meta',  bg: '#dcfce7', color: '#16a34a' },
  warning:  { label: 'Atención', bg: '#fef3c7', color: '#d97706' },
  behind:   { label: 'En Riesgo',bg: '#fee2e2', color: '#dc2626' },
  inactive: { label: 'Sin meta', bg: '#f3f4f6', color: '#6b7280' },
}

function fmt(n: number) { return n.toLocaleString('es-CL') }

function scoreTone(status: 'good' | 'warning' | 'critical' | 'inactive') {
  if (status === 'good') return '#16a34a'
  if (status === 'warning') return '#d97706'
  if (status === 'critical') return '#dc2626'
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

export default function DirectorDashboard() {
  const fallbackSummary = getOperationalSummary()
  const agents = buildAgentFallbackRows()
  const chartData = buildOperationalSeries(6).map(({ mes, ventas, captaciones }) => ({ mes, ventas, captaciones }))
  const leadSnapshot = getLatestLeadSnapshot()
  const ytd = getYtdSummary()
  const directorActions = getRoleActions('director')
  const targets = getTargetSource()
  const activities: AgentActivity[] = []
  const directorScorecard = useMemo(() => {
    const states = PP_SCORECARD_DEFINITIONS.director.map((definition) => {
      const current = definition.id === 'classification-coverage'
        ? leadSnapshot.classificationCoverage
        : definition.id === 'stale-lead-rate'
          ? leadSnapshot.staleOver15Rate
          : definition.id === 'suspension-pressure'
            ? Number(((fallbackSummary.suspended / Math.max(1, fallbackSummary.stock)) * 100).toFixed(1))
            : null

      return {
        definition,
        current,
        status: assessMetricStatus(current, definition),
      }
    })

    const staleRate = leadSnapshot.staleOver15Rate ?? 0
    const suspensionRate = (fallbackSummary.suspended / Math.max(1, fallbackSummary.stock)) * 100
    const overall = Math.round(((leadSnapshot.classificationCoverage ?? 0) + Math.max(0, 100 - staleRate) + Math.max(0, 100 - suspensionRate)) / 3)

    return {
      overall,
      states,
      trend: overall === null ? 'Sin data' : overall >= 80 ? 'Equipo sólido' : overall >= 65 ? 'En vigilancia' : 'Requiere foco',
    }
  }, [fallbackSummary.stock, fallbackSummary.suspended, leadSnapshot.classificationCoverage, leadSnapshot.staleOver15Rate])

  const ACTIVITY_COLORS: Record<string, string> = { llamada: 'var(--n3-teal)', visita: '#6b7280', oferta: '#0ea5e9', cierre: 'var(--n3-teal)' }

  return (
    <div className="flex-1 overflow-y-auto px-8 py-8" style={{ background: '#fbfbfa' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-widest px-2 py-0.5 rounded" style={{ background: '#6b7280', color: '#fff' }}>Director</span>
            <span className="text-xs font-medium" style={{ color: 'var(--n3-teal)' }}>Vitacura CRM</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#111111' }}>
            Gestión comercial validada
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280' }}>Panel lado captador · {agents.length} agentes con cierres validados</p>
        </div>
        <div className="flex items-center gap-3 bg-white rounded-lg px-4 py-3" style={{ border: '1px solid #e8f0ed' }}>
          <div className="text-right"><div className="text-[11px] uppercase tracking-wider" style={{ color: '#6b7280' }}>Metas 2026</div><div className="text-sm font-bold" style={{ color: 'var(--n3-teal)' }}>{targets.cellCoverage.workbookCount} sucursales cargadas</div><div className="text-[10px] text-[#6b7280]">{targets.quality.criticalCount} incidencias críticas visibles</div></div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <KpiCard label="Ventas Vitacura" value={String(ytd.salesCount)} sub="cierres validados enero-junio" border="var(--n3-teal)" />
        <KpiCard
          label="UF vendidas"
          value={`${(ytd.salesUf / 1000).toFixed(1)}K`}
          sub="volumen de ventas validado"
          border="#6b7280"
        />
        <KpiCard label="Leads nuevos" value={String(fallbackSummary.leads)} sub={`${fallbackSummary.monthLabel} · no acumulados`} border="var(--n3-teal)" />
        <KpiCard label="Sin gestión >15d" value={String(leadSnapshot.staleOver15Total)} sub={`${leadSnapshot.stale15To90} entre 15-90d · ${leadSnapshot.staleOver90} sobre 90d`} border="#111111" />
      </div>

      {/* Director Scorecard */}
      <div className="grid grid-cols-5 gap-5 mb-8">
        <div className="col-span-2 bg-white rounded-lg p-5" style={{ border: '1px solid #e8f0ed' }}>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: '#111111' }}>Score de gestión</h2>
              <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Lectura operativa del equipo y su disciplina comercial</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold" style={{ color: directorScorecard.overall !== null && directorScorecard.overall >= 80 ? '#16a34a' : directorScorecard.overall !== null && directorScorecard.overall >= 65 ? '#d97706' : '#dc2626' }}>
                {directorScorecard.overall === null ? 'â€”' : directorScorecard.overall}
              </div>
              <div className="text-[11px]" style={{ color: '#6b7280' }}>{directorScorecard.trend}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {directorScorecard.states.map(({ definition, current, status }) => (
              <div key={definition.id} className="rounded-lg p-3" style={{ background: '#f8fbfa', border: '1px solid #edf4f1' }}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>{definition.label}</span>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: scoreTone(status) }} />
                </div>
                <div className="text-lg font-bold" style={{ color: '#111111' }}>
                  {current === null ? 'â€”' : `${current}${definition.unit ? definition.unit : ''}`}
                </div>
                <div className="text-[11px] leading-snug mt-1" style={{ color: '#6b7280' }}>{definition.note}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-3 bg-white rounded-lg p-5" style={{ border: '1px solid #e8f0ed' }}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: '#111111' }}>Métricas del director</h2>
              <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Definición, umbral y cadencia para el equipo</p>
            </div>
            <span className="text-[11px] px-2 py-1 rounded-full" style={{ background: '#f0f7f4', color: 'var(--n3-teal)' }}>Vitacura ventas</span>
          </div>
          <div className="space-y-3">
            {PP_SCORECARD_DEFINITIONS.director.map((metric) => (
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
      </div>

      {/* Agents Table + Chart */}
      <div className="grid grid-cols-5 gap-5 mb-8">
        {/* Agents */}
        <div className="col-span-3 bg-white rounded-lg overflow-hidden" style={{ border: '1px solid #e8f0ed' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #f0f5f3' }}>
            <h2 className="text-sm font-semibold" style={{ color: '#111111' }}>Desempeño del lado captador</h2>
            <span className="text-xs" style={{ color: '#6b7280' }}>6 meses · {agents.length} agentes</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#f8fbfa' }}>
                {['Agente','Cierres capt.','Captac.','Conv.','Veloc.','Estado'].map(h => (
                  <th key={h} className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider ${h === 'Agente' ? 'text-left' : 'text-right'}`} style={{ color: '#6b7280' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => {
                const s = STATUS_LABELS[a.status]
                return (
                  <tr key={a.id} style={{ borderTop: '1px solid #f0f5f3' }}>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: '#f0f7f4', color: 'var(--n3-teal)' }}>{a.name.charAt(0)}</div>
                        <span className="text-[13px] font-medium" style={{ color: '#111111' }}>{a.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right"><span className="text-[13px] font-semibold" style={{ color: '#111111' }}>{a.ventas}</span></td>
                    <td className="px-4 py-3.5 text-right"><span className="text-[13px]" style={{ color: '#374151' }}>{a.captaciones}</span></td>
                    <td className="px-4 py-3.5 text-right"><span className="text-[13px]" style={{ color: '#6b7280' }}>{a.conversion === null ? 'n/d' : `${a.conversion}%`}</span></td>
                    <td className="px-4 py-3.5 text-right"><span className="text-[13px]" style={{ color: '#6b7280' }}>{a.velocidad === null ? 'n/d' : `${a.velocidad}d`}</span></td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Trend chart */}
        <div className="col-span-2 bg-white rounded-lg" style={{ border: '1px solid #e8f0ed' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid #f0f5f3' }}>
            <h2 className="text-sm font-semibold" style={{ color: '#111111' }}>Ventas vs Captaciones</h2>
            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Equipo · últimos 6 meses</p>
          </div>
          <div className="px-4 pt-4 pb-2">
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f5f3" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e8f0ed', borderRadius: 6, fontSize: 12 }} />
                <Line type="monotone" dataKey="ventas" stroke="var(--n3-teal)" strokeWidth={2.5} dot={{ fill: 'var(--n3-teal)', r: 4 }} name="Ventas" />
                <Line type="monotone" dataKey="captaciones" stroke="#6b7280" strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="Captaciones" />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-1 justify-center">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--n3-teal)' }} /><span className="text-[11px]" style={{ color: '#6b7280' }}>Ventas</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-0.5" style={{ background: '#e5e7eb' }} /><span className="text-[11px]" style={{ color: '#6b7280' }}>Captaciones</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Activities Pending */}
      <div className="bg-white rounded-lg overflow-hidden" style={{ border: '1px solid #e8f0ed' }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #f0f5f3' }}>
          <h2 className="text-sm font-semibold" style={{ color: '#111111' }}>Acciones recomendadas para dirección</h2>
          <span className="text-xs" style={{ color: '#6b7280' }}>Corte CRM validado</span>
        </div>
        {activities.length === 0 ? (
          <div className="grid grid-cols-2 gap-0">
            {directorActions.map((item, index) => (
              <div key={item.title} className="px-5 py-4" style={{ borderRight: index % 2 === 0 ? '1px solid #f0f5f3' : undefined }}>
                <div className="text-[12px] font-semibold" style={{ color: '#111111' }}>{item.title}</div>
                <p className="mt-1 text-[11px]" style={{ color: '#6b7280' }}>{item.evidence}</p>
                <p className="mt-2 text-[12px] font-medium" style={{ color: 'var(--n3-teal)' }}>{item.action}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-0">
            {activities.map((act, i) => (
              <div key={act.id} className="px-5 py-3 flex items-start gap-3" style={{ borderTop: i >= 2 ? '1px solid #f0f5f3' : undefined, borderRight: i % 2 === 0 ? '1px solid #f0f5f3' : undefined }}>
                <div className="w-7 h-7 rounded flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${ACTIVITY_COLORS[act.activity_type]}20` }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: ACTIVITY_COLORS[act.activity_type] }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-semibold capitalize" style={{ color: ACTIVITY_COLORS[act.activity_type] }}>{act.activity_type}</span>
                    {act.scheduled_at && <span className="text-[10px]" style={{ color: '#6b7280' }}>{new Date(act.scheduled_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>}
                  </div>
                  <p className="text-[12px] leading-snug truncate" style={{ color: '#111111' }}>{act.description || 'â€”'}</p>
                  {act.value_uf && <span className="text-[11px]" style={{ color: '#6b7280' }}>{fmt(act.value_uf)} UF</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


