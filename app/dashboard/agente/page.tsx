'use client'

import { useState } from 'react'
import { getManagementEntities } from '@/lib/presentations-2026'

function n(value: number | null | undefined, digits = 1) {
  if (value == null) return 'n/d'
  return value.toLocaleString('es-CL', { maximumFractionDigits: digits })
}

function compliancePct(actual: number | null, target: number | null): number | null {
  if (actual == null || target == null || target === 0) return null
  return Math.round((actual / target) * 100)
}

function statusFromPct(pct: number | null): { label: string; color: string; bg: string } {
  if (pct == null) return { label: 'Sin meta', color: 'var(--n3-text-muted)', bg: 'transparent' }
  if (pct >= 100) return { label: 'En meta', color: 'var(--success, #4ade80)', bg: 'transparent' }
  if (pct >= 70) return { label: 'Atenci\u00f3n', color: 'var(--warning, #fbbf24)', bg: 'transparent' }
  return { label: 'En riesgo', color: 'var(--destructive, #f87171)', bg: 'transparent' }
}

function ScoreBar({ value, max = 100 }: { value: number | null; max?: number }) {
  if (value == null) return <span className="text-xs" style={{ color: 'var(--n3-text-muted)' }}>n/d</span>
  const pct = Math.min(100, (value / max) * 100)
  const color = value >= 70 ? 'var(--n3-teal, #8fb2aa)' : value >= 50 ? 'var(--warning, #fbbf24)' : 'var(--destructive, #f87171)'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5" style={{ background: 'var(--n3-line)', borderRadius: 2 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.3s' }} />
      </div>
      <span className="text-xs font-semibold w-10 text-right" style={{ color: 'var(--n3-text-light)' }}>{n(value)}</span>
    </div>
  )
}

const BRANCHES = ['Todas', 'Lo Beltr\u00e1n', 'Nueva Costanera', 'Santa Mar\u00eda']

export default function AgenteDashboard() {
  const { partners, branches } = getManagementEntities()
  const [selectedBranch, setSelectedBranch] = useState('Todas')
  const [sortBy, setSortBy] = useState<'score' | 'ventas' | 'cumplimiento'>('score')
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null)

  const filtered = partners
    .filter((p) => selectedBranch === 'Todas' || p.branch === selectedBranch)
    .map((p) => {
      const pct = compliancePct(
        p.salesSummary.cumulativeSalesCount,
        (p.salesSummary as any).cumulativeTargetSalesCount ?? null
      )
      return { ...p, compliancePct: pct }
    })
    .sort((a, b) => {
      if (sortBy === 'score') return (b.scores.management ?? 0) - (a.scores.management ?? 0)
      if (sortBy === 'ventas') return b.salesSummary.cumulativeSalesCount - a.salesSummary.cumulativeSalesCount
      return (b.compliancePct ?? 0) - (a.compliancePct ?? 0)
    })

  const activePartner = selectedPartner ? filtered.find((p) => p.name === selectedPartner) : null

  // Company-level stats from branches
  const totalVentas = partners.reduce((s, p) => s + p.salesSummary.cumulativeSalesCount, 0)
  const totalUf = partners.reduce((s, p) => s + p.salesSummary.cumulativeSalesUf, 0)
  const avgScore = partners.filter((p) => p.scores.management && p.scores.management > 0).reduce((s, p, _, arr) => s + (p.scores.management ?? 0) / arr.length, 0)
  const enMeta = filtered.filter((p) => (p.compliancePct ?? 0) >= 100).length

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8" style={{ background: 'var(--n3-black)' }}>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5" style={{ background: 'var(--n3-deep)', color: 'var(--n3-teal)', border: '1px solid var(--n3-line)' }}>
            Ejecutivos / Partners
          </span>
          <span className="text-[10px]" style={{ color: 'var(--n3-text-muted)' }}>Enero–Junio 2026 · {partners.length} partners activos</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--n3-text-light)' }}>
          Desempe\u00f1o por Partner
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--n3-text-muted)' }}>
          Datos extra\u00eddos directamente de las presentaciones del per\u00edodo. Sin interpolaci\u00f3n.
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Cierres acumulados', value: n(totalVentas), sub: 'Suma todos los partners' },
          { label: 'UF acumulada', value: `${n(totalUf / 1000)}K`, sub: 'Enero–Junio 2026' },
          { label: 'Score promedio', value: n(avgScore), sub: 'Calidad de gesti\u00f3n' },
          { label: 'En meta (100%+)', value: String(enMeta), sub: `de ${filtered.length} con meta asignada` },
        ].map((kpi) => (
          <div key={kpi.label} className="p-5 border" style={{ background: 'var(--n3-deep)', borderColor: 'var(--n3-line)', borderLeft: '3px solid var(--n3-teal)' }}>
            <p className="text-[11px] uppercase tracking-wider font-medium mb-1" style={{ color: 'var(--n3-text-muted)' }}>{kpi.label}</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--n3-text-light)' }}>{kpi.value}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--n3-text-muted)' }}>{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-1">
          {BRANCHES.map((b) => (
            <button
              key={b}
              onClick={() => setSelectedBranch(b)}
              className="px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                background: selectedBranch === b ? 'var(--n3-teal)' : 'var(--n3-deep)',
                color: selectedBranch === b ? 'var(--n3-black)' : 'var(--n3-text-muted)',
                border: '1px solid var(--n3-line)',
              }}
            >
              {b}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-[11px] mr-1" style={{ color: 'var(--n3-text-muted)' }}>Ordenar:</span>
          {(['score', 'ventas', 'cumplimiento'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className="px-3 py-1.5 text-xs font-semibold transition-colors capitalize"
              style={{
                background: sortBy === s ? 'var(--n3-deep)' : 'transparent',
                color: sortBy === s ? 'var(--n3-text-light)' : 'var(--n3-text-muted)',
                border: `1px solid ${sortBy === s ? 'var(--n3-line)' : 'transparent'}`,
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid xl:grid-cols-[1fr_380px] gap-5">

        {/* Partner Table */}
        <div style={{ border: '1px solid var(--n3-line)' }}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--n3-line)', background: 'var(--n3-deep)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--n3-text-light)' }}>Ranking de Partners</h2>
            <span className="text-[11px]" style={{ color: 'var(--n3-text-muted)' }}>{filtered.length} partners</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr style={{ background: 'var(--n3-black)' }}>
                  {['#', 'Partner', 'Sucursal', 'Cierres acum.', 'Meta', 'Cumpl.', 'Score gesti\u00f3n', 'Estado'].map((h) => (
                    <th key={h} className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider ${h === 'Partner' || h === '#' ? 'text-left' : 'text-right'}`} style={{ color: 'var(--n3-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const pct = p.compliancePct
                  const status = statusFromPct(pct)
                  const isSelected = selectedPartner === p.name
                  return (
                    <tr
                      key={p.name}
                      onClick={() => setSelectedPartner(isSelected ? null : p.name)}
                      className="cursor-pointer transition-colors"
                      style={{
                        borderTop: '1px solid var(--n3-line)',
                        background: isSelected ? 'var(--n3-deep)' : 'transparent',
                      }}
                      onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(143,178,170,0.04)' }}
                      onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      <td className="px-4 py-3 text-left">
                        <span className="text-[11px] font-semibold" style={{ color: 'var(--n3-text-muted)' }}>{String(i + 1).padStart(2, '0')}</span>
                      </td>
                      <td className="px-4 py-3 text-left">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 flex items-center justify-center text-xs font-bold shrink-0" style={{ background: 'var(--n3-black)', color: 'var(--n3-teal)', border: '1px solid var(--n3-line)' }}>
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-[13px] font-medium" style={{ color: 'var(--n3-text-light)' }}>{p.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[11px]" style={{ color: 'var(--n3-text-muted)' }}>{p.branch ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[13px] font-semibold" style={{ color: 'var(--n3-text-light)' }}>{n(p.salesSummary.cumulativeSalesCount)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[13px]" style={{ color: 'var(--n3-text-muted)' }}>
                          {n((p.salesSummary as any).cumulativeTargetSalesCount ?? null)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[13px] font-semibold" style={{ color: status.color }}>
                          {pct != null ? `${pct}%` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 min-w-[130px]">
                        <ScoreBar value={p.scores.management} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[11px] font-semibold px-2 py-0.5" style={{ color: status.color, border: `1px solid ${status.color}`, opacity: status.label === 'Sin meta' ? 0.5 : 1 }}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Panel */}
        <div style={{ border: '1px solid var(--n3-line)' }}>
          {activePartner ? (
            <>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--n3-line)', background: 'var(--n3-deep)' }}>
                <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--n3-teal)' }}>{activePartner.branch}</p>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--n3-text-light)' }}>{activePartner.name}</h2>
                <p className="text-xs mt-1" style={{ color: 'var(--n3-text-muted)' }}>{activePartner.scores.classification ?? 'Sin clasificaci\u00f3n'}</p>
              </div>
              <div className="p-5 space-y-5">

                {/* Sales Summary */}
                <div>
                  <p className="text-[11px] uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--n3-text-muted)' }}>Ventas</p>
                  <div className="grid grid-cols-2 gap-px" style={{ background: 'var(--n3-line)' }}>
                    {[
                      ['Cierres junio', n(activePartner.salesSummary.currentSalesCount)],
                      ['Meta junio', n((activePartner.salesSummary as any).currentTargetSalesCount ?? null)],
                      ['Cierres acumulados', n(activePartner.salesSummary.cumulativeSalesCount)],
                      ['Meta acumulada', n((activePartner.salesSummary as any).cumulativeTargetSalesCount ?? null)],
                      ['UF junio', `${n(activePartner.salesSummary.currentSalesUf, 0)} UF`],
                      ['UF acumulada', `${n(activePartner.salesSummary.cumulativeSalesUf, 0)} UF`],
                    ].map(([label, value]) => (
                      <div key={label} className="p-3" style={{ background: 'var(--n3-black)' }}>
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--n3-text-muted)' }}>{label}</p>
                        <p className="text-base font-semibold mt-1" style={{ color: 'var(--n3-text-light)' }}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Scores */}
                <div>
                  <p className="text-[11px] uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--n3-text-muted)' }}>Scores de gesti\u00f3n</p>
                  <div className="space-y-3">
                    {[
                      { label: 'Calidad gesti\u00f3n (total)', value: activePartner.scores.management },
                      { label: 'Calidad cartera (40%)', value: activePartner.scores.portfolio },
                      { label: 'Calidad seguimiento (30%)', value: activePartner.scores.followUp },
                      { label: 'Calidad conversi\u00f3n (30%)', value: activePartner.scores.conversion },
                    ].map((s) => (
                      <div key={s.label}>
                        <p className="text-[11px] mb-1" style={{ color: 'var(--n3-text-muted)' }}>{s.label}</p>
                        <ScoreBar value={s.value} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Indicators */}
                {activePartner.indicators && (
                  <div>
                    <p className="text-[11px] uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--n3-text-muted)' }}>Indicadores operativos</p>
                    <div className="grid grid-cols-2 gap-px" style={{ background: 'var(--n3-line)' }}>
                      {[
                        ['Stock', n(activePartner.indicators.stock, 0)],
                        ['Requerimientos', n(activePartner.indicators.requirements, 0)],
                        ['Leads activos', n(activePartner.indicators.activeLeads, 0)],
                        ['Leads clasif.', n(activePartner.indicators.classifiedLeads, 0)],
                        ['Visitas agend.', n(activePartner.indicators.scheduledVisits, 0)],
                        ['Visitas realiz.', n(activePartner.indicators.realizedVisits, 0)],
                      ].map(([label, value]) => (
                        <div key={label} className="p-3" style={{ background: 'var(--n3-black)' }}>
                          <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--n3-text-muted)' }}>{label}</p>
                          <p className="text-base font-semibold mt-1" style={{ color: 'var(--n3-text-light)' }}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Source */}
                <div className="pt-2" style={{ borderTop: '1px solid var(--n3-line)' }}>
                  <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--n3-text-muted)' }}>Fuente</p>
                  <p className="text-[11px]" style={{ color: 'var(--n3-text-muted)' }}>
                    {activePartner.salesSummary.source.deck} · l\u00e1mina {activePartner.salesSummary.source.slide}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 p-8 text-center">
              <p className="text-sm font-semibold" style={{ color: 'var(--n3-text-light)' }}>Selecciona un partner</p>
              <p className="text-xs mt-2" style={{ color: 'var(--n3-text-muted)' }}>
                Haz clic en cualquier fila para ver el detalle de ventas, scores e indicadores operativos.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Branch summary */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--n3-text-light)' }}>Resumen por sucursal</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {branches.map((b) => {
            const branchPartners = partners.filter((p) => p.branch === b.name)
            const branchSales = branchPartners.reduce((s, p) => s + p.salesSummary.cumulativeSalesCount, 0)
            const branchUf = branchPartners.reduce((s, p) => s + p.salesSummary.cumulativeSalesUf, 0)
            const avgBranchScore = branchPartners.filter((p) => (p.scores.management ?? 0) > 0).reduce((s, p, _, arr) => s + (p.scores.management ?? 0) / arr.length, 0)
            return (
              <div key={b.name} className="p-5" style={{ background: 'var(--n3-deep)', border: '1px solid var(--n3-line)', borderLeft: '3px solid var(--n3-teal)' }}>
                <p className="text-[11px] uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--n3-text-muted)' }}>{b.name}</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[10px]" style={{ color: 'var(--n3-text-muted)' }}>Partners</p>
                    <p className="text-xl font-bold mt-0.5" style={{ color: 'var(--n3-text-light)' }}>{branchPartners.length}</p>
                  </div>
                  <div>
                    <p className="text-[10px]" style={{ color: 'var(--n3-text-muted)' }}>Cierres</p>
                    <p className="text-xl font-bold mt-0.5" style={{ color: 'var(--n3-text-light)' }}>{n(branchSales)}</p>
                  </div>
                  <div>
                    <p className="text-[10px]" style={{ color: 'var(--n3-text-muted)' }}>Score prom.</p>
                    <p className="text-xl font-bold mt-0.5" style={{ color: 'var(--n3-text-light)' }}>{n(avgBranchScore)}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-[10px] mb-1" style={{ color: 'var(--n3-text-muted)' }}>UF acumulada: {n(branchUf / 1000)}K</p>
                  <p className="text-[10px]" style={{ color: 'var(--n3-text-muted)' }}>
                    Cierres: {n(b.salesSummary.cumulativeSalesCount)} · UF: {n(b.salesSummary.cumulativeSalesUf / 1000, 1)}K
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <p className="mt-6 text-[10px]" style={{ color: 'var(--n3-text-muted)' }}>
        Fuente: presentations-2026.json · Extra\u00eddo de Jun_Partners_*.pptx · Corte Enero–Junio 2026 · Sin interpolaci\u00f3n
      </p>
    </div>
  )
}
