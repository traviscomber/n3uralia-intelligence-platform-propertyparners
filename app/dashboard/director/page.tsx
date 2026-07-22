'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { buildAgentFallbackRows, buildOperationalSeries, getLatestLeadSnapshot, getOperationalSummary, getYtdSummary } from '@/lib/crm-snapshot'
import { getTargetSource } from '@/lib/targets-2026'

type StatusKey = 'on_track' | 'warning' | 'behind' | 'inactive'

const STATUS_LABELS: Record<StatusKey, { label: string; bg: string; color: string }> = {
  on_track: { label: 'En Meta',  bg: 'var(--n3-deep)', color: 'var(--success)' },
  warning:  { label: 'Atención', bg: 'var(--accent)', color: 'var(--warning)' },
  behind:   { label: 'En Riesgo',bg: 'var(--accent)', color: 'var(--destructive)' },
  inactive: { label: 'Sin meta', bg: 'var(--n3-black)', color: 'var(--n3-text-muted)' },
}

function fmt(n: number) { return n.toLocaleString('es-CL') }

function KpiCard({ label, value, sub, border }: { label: string; value: string; sub?: string; border: string }) {
  return (
    <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5 flex flex-col gap-1" style={{ border: '1px solid var(--n3-line)', borderLeft: `3px solid ${border}` }}>
      <span className="text-[11px] uppercase tracking-wider font-medium" style={{ color: 'var(--n3-text-muted)' }}>{label}</span>
      <span className="text-2xl font-bold tracking-tight" style={{ color: 'var(--n3-text-light)' }}>{value}</span>
      {sub && <span className="text-xs" style={{ color: 'var(--n3-text-muted)' }}>{sub}</span>}
    </div>
  )
}

export default function DirectorDashboard() {
  const fallbackSummary = getOperationalSummary()
  const agents = buildAgentFallbackRows()
  const chartData = buildOperationalSeries(6).map(({ mes, ventas, captaciones }) => ({ mes, ventas, captaciones }))
  const leadSnapshot = getLatestLeadSnapshot()
  const ytd = getYtdSummary()
  const targets = getTargetSource()
  const suspensionRate = Number(((fallbackSummary.suspended / Math.max(1, fallbackSummary.stock)) * 100).toFixed(1))

  return (
    <div className="flex-1 overflow-y-auto px-8 py-8" style={{ background: 'var(--n3-black)' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-widest px-2 py-0.5 rounded" style={{ background: 'var(--n3-text-muted)', color: 'var(--n3-text-light)' }}>Director</span>
            <span className="text-xs font-medium" style={{ color: 'var(--n3-teal)' }}>Vitacura CRM</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--n3-text-light)' }}>
            Gestión comercial validada
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--n3-text-muted)' }}>Panel lado captador · {agents.length} agentes con cierres validados</p>
        </div>
        <div className="flex items-center gap-3 border border-[var(--n3-line)] bg-[var(--n3-deep)] px-4 py-3" style={{ border: '1px solid var(--n3-line)' }}>
          <div className="text-right"><div className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--n3-text-muted)' }}>Metas 2026</div><div className="text-sm font-bold" style={{ color: 'var(--n3-teal)' }}>{targets.cellCoverage.workbookCount} sucursales cargadas</div><div className="text-[10px] text-[var(--n3-text-muted)]">{targets.quality.criticalCount} incidencias críticas visibles</div></div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Ventas Vitacura" value={String(ytd.salesCount)} sub="cierres validados enero-junio" border="var(--n3-teal)" />
        <KpiCard
          label="UF vendidas"
          value={`${(ytd.salesUf / 1000).toFixed(1)}K`}
          sub="volumen de ventas validado"
          border="var(--n3-text-muted)"
        />
        <KpiCard label="Leads nuevos" value={String(fallbackSummary.leads)} sub={`${fallbackSummary.monthLabel} · no acumulados`} border="var(--n3-teal)" />
        <KpiCard label="Sin gestión >15d" value={String(leadSnapshot.staleOver15Total)} sub={`${leadSnapshot.stale15To90} entre 15-90d · ${leadSnapshot.staleOver90} sobre 90d`} border="var(--n3-teal)" />
      </div>

      <div className="mb-8 border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5" style={{ border: '1px solid var(--n3-line)' }}><div className="mb-4"><h2 className="text-sm font-semibold" style={{ color: 'var(--n3-text-light)' }}>Indicadores operativos</h2><p className="mt-0.5 text-xs" style={{ color: 'var(--n3-text-muted)' }}>Valores del corte; no forman un índice ni aplican umbrales adicionales.</p></div><div className="grid grid-cols-1 gap-3 md:grid-cols-3"><div className="rounded-lg p-3" style={{ background: 'var(--n3-black)', border: '1px solid var(--n3-line)' }}><div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--n3-text-muted)' }}>Cobertura de clasificación</div><div className="mt-1 text-lg font-bold" style={{ color: 'var(--n3-text-light)' }}>{leadSnapshot.classificationCoverage}%</div><div className="mt-1 text-[11px]" style={{ color: 'var(--n3-text-muted)' }}>(Clasificados + sin clasificar) / leads activos exportados.</div></div><div className="rounded-lg p-3" style={{ background: 'var(--n3-black)', border: '1px solid var(--n3-line)' }}><div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--n3-text-muted)' }}>Sin gestión +15 días</div><div className="mt-1 text-lg font-bold" style={{ color: 'var(--n3-text-light)' }}>{leadSnapshot.staleOver15Rate}%</div><div className="mt-1 text-[11px]" style={{ color: 'var(--n3-text-muted)' }}>Leads sin gestión / leads activos.</div></div><div className="rounded-lg p-3" style={{ background: 'var(--n3-black)', border: '1px solid var(--n3-line)' }}><div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--n3-text-muted)' }}>Suspensiones / cartera</div><div className="mt-1 text-lg font-bold" style={{ color: 'var(--n3-text-light)' }}>{suspensionRate}%</div><div className="mt-1 text-[11px]" style={{ color: 'var(--n3-text-muted)' }}>Suspensiones del mes / stock publicado al cierre.</div></div></div></div>

      {/* Agents Table + Chart */}
      <div className="mb-8 grid grid-cols-1 gap-5 xl:grid-cols-5">
        {/* Agents */}
        <div className="overflow-hidden border border-[var(--n3-line)] bg-[var(--n3-deep)] xl:col-span-3" style={{ border: '1px solid var(--n3-line)' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--n3-line)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--n3-text-light)' }}>Desempeño del lado captador</h2>
            <span className="text-xs" style={{ color: 'var(--n3-text-muted)' }}>6 meses · {agents.length} agentes</span>
          </div>
          <div className="overflow-x-auto"><table className="min-w-[760px] w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--n3-black)' }}>
                {['Agente','Cierres capt.','Captac.','Conv.','Veloc.','Estado'].map(h => (
                  <th key={h} className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider ${h === 'Agente' ? 'text-left' : 'text-right'}`} style={{ color: 'var(--n3-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => {
                const s = STATUS_LABELS[a.status]
                return (
                  <tr key={a.id} style={{ borderTop: '1px solid var(--n3-line)' }}>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: 'var(--n3-black)', color: 'var(--n3-teal)' }}>{a.name.charAt(0)}</div>
                        <span className="text-[13px] font-medium" style={{ color: 'var(--n3-text-light)' }}>{a.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right"><span className="text-[13px] font-semibold" style={{ color: 'var(--n3-text-light)' }}>{a.ventas}</span></td>
                    <td className="px-4 py-3.5 text-right"><span className="text-[13px]" style={{ color: 'var(--n3-text-light)' }}>{a.captaciones}</span></td>
                    <td className="px-4 py-3.5 text-right"><span className="text-[13px]" style={{ color: 'var(--n3-text-muted)' }}>{a.conversion === null ? 'n/d' : `${a.conversion}%`}</span></td>
                    <td className="px-4 py-3.5 text-right"><span className="text-[13px]" style={{ color: 'var(--n3-text-muted)' }}>{a.velocidad === null ? 'n/d' : `${a.velocidad}d`}</span></td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table></div>
        </div>

        {/* Trend chart */}
        <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] xl:col-span-2" style={{ border: '1px solid var(--n3-line)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--n3-line)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--n3-text-light)' }}>Ventas vs Captaciones</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--n3-text-muted)' }}>Equipo · últimos 6 meses</p>
          </div>
          <div className="px-4 pt-4 pb-2">
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--n3-line)" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'var(--n3-text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--n3-text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--n3-deep)', border: '1px solid var(--n3-line)', borderRadius: 0, fontSize: 12 }} />
                <Line type="monotone" dataKey="ventas" stroke="var(--n3-teal)" strokeWidth={2.5} dot={{ fill: 'var(--n3-teal)', r: 4 }} name="Ventas" />
                <Line type="monotone" dataKey="captaciones" stroke="var(--n3-text-muted)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="Captaciones" />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-1 justify-center">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--n3-teal)' }} /><span className="text-[11px]" style={{ color: 'var(--n3-text-muted)' }}>Ventas</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-0.5" style={{ background: 'var(--n3-line)' }} /><span className="text-[11px]" style={{ color: 'var(--n3-text-muted)' }}>Captaciones</span></div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
