'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { KpiSnapshot, Profile, AiReport } from '@/lib/types'

// ── mock fallback data (shown while DB loads or if empty) ──
const MOCK_DIRECTORS = [
  { id: '1', name: 'Juan Morales',  team: 'Equipo Alpha', ventas: 30, uf: 138100, target: 36, comision: 4119000 },
  { id: '2', name: 'María García',  team: 'Equipo Beta',  ventas: 26, uf: 116700, target: 36, comision: 3528000 },
  { id: '3', name: 'Carlos López',  team: 'Equipo Gamma', ventas: 17, uf:  75900, target: 28, comision: 2286000 },
]

const MOCK_CHART = [
  { mes: 'Feb', alpha: 4, beta: 3, gamma: 2 },
  { mes: 'Mar', alpha: 5, beta: 4, gamma: 3 },
  { mes: 'Abr', alpha: 6, beta: 4, gamma: 3 },
  { mes: 'May', alpha: 5, beta: 6, gamma: 4 },
  { mes: 'Jun', alpha: 7, beta: 5, gamma: 4 },
  { mes: 'Jul', alpha: 3, beta: 4, gamma: 2 },
]

const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function fmt(n: number) {
  return n.toLocaleString('es-CL')
}

function KpiCard({ label, value, sub, border }: { label: string; value: string; sub?: string; border: string }) {
  return (
    <div className="bg-white rounded-lg p-5 flex flex-col gap-1" style={{ borderLeft: `3px solid ${border}`, border: '1px solid #e8f0ed', borderLeft: `3px solid ${border}` }}>
      <span className="text-[11px] uppercase tracking-wider font-medium" style={{ color: '#9ca9a3' }}>{label}</span>
      <span className="text-2xl font-bold tracking-tight" style={{ color: '#173634' }}>{value}</span>
      {sub && <span className="text-xs" style={{ color: '#b89a7e' }}>{sub}</span>}
    </div>
  )
}

export default function CeoDashboard() {
  const [directors, setDirectors] = useState(MOCK_DIRECTORS)
  const [chartData, setChartData] = useState(MOCK_CHART)
  const [reports, setReports] = useState<AiReport[]>([])
  const [totals, setTotals] = useState({ ventas: 73, uf: 330700, comision: 9933000, conversion: 9.6 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const [{ data: snapshots }, { data: reportRows }, { data: profileRows }] = await Promise.all([
          supabase.from('kpi_snapshots').select('*').is('agent_id', null).not('director_id', 'is', null).order('period_date', { ascending: true }),
          supabase.from('ai_reports').select('*').order('created_at', { ascending: false }).limit(3),
          supabase.from('profiles').select('*').eq('role', 'director'),
        ])

        if (snapshots && snapshots.length > 0 && profileRows && profileRows.length > 0) {
          // Build director summary from last 6 months of snapshots
          const dirMap: Record<string, { ventas: number; uf: number; comision: number; target: number }> = {}
          for (const s of snapshots as KpiSnapshot[]) {
            if (!s.director_id) continue
            if (!dirMap[s.director_id]) dirMap[s.director_id] = { ventas: 0, uf: 0, comision: 0, target: 0 }
            dirMap[s.director_id].ventas   += s.ventas_count
            dirMap[s.director_id].uf       += s.ventas_uf
            dirMap[s.director_id].comision += s.comision_total
            dirMap[s.director_id].target   += s.monthly_target
          }
          const newDirs = (profileRows as Profile[]).map(p => ({
            id: p.id,
            name: p.full_name || 'Director',
            team: p.team || '—',
            ventas:   dirMap[p.id]?.ventas   ?? 0,
            uf:       dirMap[p.id]?.uf       ?? 0,
            target:   dirMap[p.id]?.target   ?? 0,
            comision: dirMap[p.id]?.comision ?? 0,
          })).sort((a, b) => b.ventas - a.ventas)
          setDirectors(newDirs)

          const totalVentas   = newDirs.reduce((s, d) => s + d.ventas, 0)
          const totalUf       = newDirs.reduce((s, d) => s + d.uf, 0)
          const totalComision = newDirs.reduce((s, d) => s + d.comision, 0)
          const avgConv = (snapshots as KpiSnapshot[]).reduce((s, k) => s + (k.conversion_rate || 0), 0) / snapshots.length
          setTotals({ ventas: totalVentas, uf: totalUf, comision: totalComision, conversion: Math.round(avgConv * 10) / 10 })

          // Build 6-month chart grouped by director
          const months = [...new Set((snapshots as KpiSnapshot[]).map(s => s.period_date.slice(0, 7)))].sort().slice(-6)
          const dirIds = newDirs.map(d => d.id)
          const dirNames = newDirs.map(d => d.name.split(' ')[0])
          const chart = months.map(m => {
            const entry: Record<string, string | number> = { mes: MONTHS_ES[parseInt(m.slice(5, 7)) - 1] }
            dirIds.forEach((id, i) => {
              const snap = (snapshots as KpiSnapshot[]).find(s => s.director_id === id && s.period_date.startsWith(m))
              entry[dirNames[i]] = snap?.ventas_count ?? 0
            })
            return entry
          })
          setChartData(chart as typeof MOCK_CHART)
        }

        if (reportRows) setReports(reportRows as AiReport[])
      } catch (_) {
        // keep mocks
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const dirKeys  = directors.map(d => d.name.split(' ')[0])
  const dirColors = ['#8fb2aa', '#b89a7e', '#10b981']

  return (
    <div className="flex-1 overflow-y-auto px-8 py-8" style={{ background: '#fbfbfa' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-widest px-2 py-0.5 rounded" style={{ background: '#173634', color: '#8fb2aa' }}>CEO</span>
            <span className="text-xs" style={{ color: '#9ca9a3' }}>Vista Ejecutiva</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#173634' }}>Panel de Comando</h1>
          <p className="text-sm mt-1" style={{ color: '#9ca9a3' }}>Resumen global del negocio · {loading ? 'Cargando...' : 'Actualizado ahora'}</p>
        </div>
        <div className="text-right">
          <div className="text-xs" style={{ color: '#9ca9a3' }}>Acumulado 6 meses</div>
          <div className="text-sm font-semibold" style={{ color: '#173634' }}>{new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}</div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <KpiCard label="Ventas totales"     value={fmt(totals.ventas)}           sub="propiedades cerradas (6m)"  border="#8fb2aa" />
        <KpiCard label="UF vendidas"        value={`${(totals.uf/1000).toFixed(0)}K UF`} sub={`$${fmt(Math.round(totals.uf * 36300 / 1e6))}M CLP`} border="#b89a7e" />
        <KpiCard label="Comisión acumulada" value={`$${fmt(Math.round(totals.comision / 1000))}K`} sub="CLP comisión total" border="#10b981" />
        <KpiCard label="Conversión global"  value={`${totals.conversion}%`}      sub="leads → cierre promedio"   border="#173634" />
      </div>

      {/* Director Ranking + Sales Chart */}
      <div className="grid grid-cols-5 gap-5 mb-8">
        {/* Ranking table */}
        <div className="col-span-3 bg-white rounded-lg overflow-hidden" style={{ border: '1px solid #e8f0ed' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #f0f5f3' }}>
            <h2 className="text-sm font-semibold" style={{ color: '#173634' }}>Ranking de Directores</h2>
            <span className="text-xs" style={{ color: '#9ca9a3' }}>6 meses</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#f8fbfa' }}>
                <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#9ca9a3' }}>#</th>
                <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#9ca9a3' }}>Director</th>
                <th className="text-right px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#9ca9a3' }}>Ventas</th>
                <th className="text-right px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#9ca9a3' }}>UF</th>
                <th className="text-right px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#9ca9a3' }}>Cumpl.</th>
                <th className="text-right px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#9ca9a3' }}>Comisión</th>
              </tr>
            </thead>
            <tbody>
              {directors.map((d, i) => {
                const pct = d.target > 0 ? Math.round((d.ventas / d.target) * 100) : 0
                const medals = ['#f59e0b', '#9ca9a3', '#b89a7e']
                return (
                  <tr key={d.id} style={{ borderTop: '1px solid #f0f5f3' }}>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-bold" style={{ color: medals[i] || '#9ca9a3' }}>{i + 1}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0" style={{ background: '#e8f3f0', color: '#8fb2aa' }}>
                          {d.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-[13px] font-medium" style={{ color: '#173634' }}>{d.name}</div>
                          <div className="text-[11px]" style={{ color: '#9ca9a3' }}>{d.team}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-[13px] font-semibold" style={{ color: '#173634' }}>{d.ventas}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-[13px]" style={{ color: '#555a56' }}>{(d.uf / 1000).toFixed(0)}K</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[12px] font-semibold" style={{ color: pct >= 100 ? '#10b981' : pct >= 80 ? '#f59e0b' : '#d97706' }}>{pct}%</span>
                        <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: '#e8f0ed' }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: pct >= 100 ? '#10b981' : pct >= 80 ? '#f59e0b' : '#d97706' }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-[13px]" style={{ color: '#555a56' }}>${fmt(Math.round(d.comision / 1000))}K</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Sales AreaChart */}
        <div className="col-span-2 bg-white rounded-lg" style={{ border: '1px solid #e8f0ed' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid #f0f5f3' }}>
            <h2 className="text-sm font-semibold" style={{ color: '#173634' }}>Ventas por Director</h2>
            <p className="text-xs mt-0.5" style={{ color: '#9ca9a3' }}>Últimos 6 meses</p>
          </div>
          <div className="px-4 pt-4 pb-2">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  {dirKeys.map((k, i) => (
                    <linearGradient key={k} id={`g${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={dirColors[i]} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={dirColors[i]} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f5f3" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9ca9a3' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca9a3' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e8f0ed', borderRadius: 6, fontSize: 12 }} />
                {dirKeys.map((k, i) => (
                  <Area key={k} type="monotone" dataKey={k} stroke={dirColors[i]} strokeWidth={2} fill={`url(#g${i})`} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 justify-center">
              {dirKeys.map((k, i) => (
                <div key={k} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: dirColors[i] }} />
                  <span className="text-[11px]" style={{ color: '#9ca9a3' }}>{k}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Comision BarChart + Reports */}
      <div className="grid grid-cols-5 gap-5">
        {/* Comision bar */}
        <div className="col-span-3 bg-white rounded-lg" style={{ border: '1px solid #e8f0ed' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid #f0f5f3' }}>
            <h2 className="text-sm font-semibold" style={{ color: '#173634' }}>Comisiones por Director</h2>
            <p className="text-xs mt-0.5" style={{ color: '#9ca9a3' }}>En miles de pesos CLP</p>
          </div>
          <div className="px-4 pt-4 pb-4">
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={directors.map(d => ({ name: d.name.split(' ')[0], comision: Math.round(d.comision / 1000) }))} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f5f3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca9a3' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca9a3' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => [`$${fmt(v)}K`, 'Comisión']} contentStyle={{ background: '#fff', border: '1px solid #e8f0ed', borderRadius: 6, fontSize: 12 }} />
                <Bar dataKey="comision" fill="#8fb2aa" radius={[4, 4, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Latest AI Reports */}
        <div className="col-span-2 bg-white rounded-lg" style={{ border: '1px solid #e8f0ed' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid #f0f5f3' }}>
            <h2 className="text-sm font-semibold" style={{ color: '#173634' }}>Reportes IA Recientes</h2>
          </div>
          <div className="divide-y" style={{ borderColor: '#f0f5f3' }}>
            {reports.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-xs" style={{ color: '#9ca9a3' }}>Sin reportes generados aún.</p>
                <a href="/dashboard/reportes" className="text-xs mt-1 block hover:underline" style={{ color: '#8fb2aa' }}>Generar primer reporte</a>
              </div>
            ) : (
              reports.map(r => (
                <div key={r.id} className="px-5 py-3.5">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-[12px] font-medium leading-snug" style={{ color: '#173634' }}>{r.title}</span>
                    <span className="text-[10px] shrink-0" style={{ color: '#9ca9a3' }}>
                      {r.period_date ? new Date(r.period_date).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }) : '—'}
                    </span>
                  </div>
                  {r.summary && <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: '#9ca9a3' }}>{r.summary}</p>}
                  <span className="inline-block mt-1.5 text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#f0f7f4', color: '#8fb2aa' }}>{r.report_type}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
