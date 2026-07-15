'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { KpiSnapshot, Profile, AgentActivity } from '@/lib/types'

const DIRECTOR_ID = 'd0000000-0000-0000-0000-000000000001' // default: Juan Morales
const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

type StatusKey = 'on_track' | 'warning' | 'behind'
type AgentRow = { id: string; name: string; team: string; ventas: number; captaciones: number; conversion: number; velocidad: number; status: StatusKey }

const MOCK_AGENTS: AgentRow[] = [
  { id: '1', name: 'Sofía Ramos',   team: 'Equipo Alpha', ventas: 15, captaciones: 25, conversion: 11.1, velocidad: 31, status: 'on_track' },
  { id: '2', name: 'Diego Herrera', team: 'Equipo Alpha', ventas: 14, captaciones: 23, conversion:  9.1, velocidad: 34, status: 'warning'  },
]

const MOCK_CHART = [
  { mes: 'Feb', ventas: 4, target: 5 },
  { mes: 'Mar', ventas: 5, target: 5 },
  { mes: 'Abr', ventas: 6, target: 6 },
  { mes: 'May', ventas: 5, target: 6 },
  { mes: 'Jun', ventas: 7, target: 7 },
  { mes: 'Jul', ventas: 3, target: 7 },
]
const STATUS_LABELS: Record<StatusKey, { label: string; bg: string; color: string }> = {
  on_track: { label: 'En Meta',  bg: '#dcfce7', color: '#16a34a' },
  warning:  { label: 'Atención', bg: '#fef3c7', color: '#d97706' },
  behind:   { label: 'En Riesgo',bg: '#fee2e2', color: '#dc2626' },
}

function fmt(n: number) { return n.toLocaleString('es-CL') }

function KpiCard({ label, value, sub, border }: { label: string; value: string; sub?: string; border: string }) {
  return (
    <div className="bg-white rounded-lg p-5 flex flex-col gap-1" style={{ border: '1px solid #e8f0ed', borderLeft: `3px solid ${border}` }}>
      <span className="text-[11px] uppercase tracking-wider font-medium" style={{ color: '#9ca9a3' }}>{label}</span>
      <span className="text-2xl font-bold tracking-tight" style={{ color: '#173634' }}>{value}</span>
      {sub && <span className="text-xs" style={{ color: '#b89a7e' }}>{sub}</span>}
    </div>
  )
}

export default function DirectorDashboard() {
  const [director, setDirector] = useState<Profile | null>(null)
  const [agents, setAgents] = useState(MOCK_AGENTS)
  const [chartData, setChartData] = useState(MOCK_CHART)
  const [activities, setActivities] = useState<AgentActivity[]>([])
  const [totals, setTotals] = useState({ ventas: 30, uf: 138100, target: 36, conversion: 10.0, comision: 4119000 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const [{ data: profileData }, { data: agentProfiles }, { data: snapshots }, { data: activityData }] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', DIRECTOR_ID).single(),
          supabase.from('profiles').select('*').eq('role', 'seller').eq('team', 'Equipo Alpha'),
          supabase.from('kpi_snapshots').select('*').not('agent_id', 'is', null).eq('director_id', DIRECTOR_ID).order('period_date', { ascending: true }),
          supabase.from('agent_activities').select('*').in('agent_id', ['a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002']).eq('status', 'pending').order('scheduled_at', { ascending: true }).limit(8),
        ])

        if (profileData) setDirector(profileData as Profile)

        if (agentProfiles && snapshots && snapshots.length > 0) {
          // Build agent summary
          const agMap: Record<string, { ventas: number; captaciones: number; conversion: number; velocidad: number; count: number }> = {}
          for (const s of snapshots as KpiSnapshot[]) {
            if (!s.agent_id) continue
            if (!agMap[s.agent_id]) agMap[s.agent_id] = { ventas: 0, captaciones: 0, conversion: 0, velocidad: 0, count: 0 }
            agMap[s.agent_id].ventas       += s.ventas_count
            agMap[s.agent_id].captaciones  += s.captaciones_count
            agMap[s.agent_id].conversion   += s.conversion_rate
            agMap[s.agent_id].velocidad    += s.velocidad_venta
            agMap[s.agent_id].count        += 1
          }

          const dirSnaps = (snapshots as KpiSnapshot[]).filter(s => s.agent_id !== null)
          const totalVentas = dirSnaps.reduce((acc, s) => acc + (s.ventas_count || 0), 0) / 2 // sum unique by agent
          const monthlyTarget = dirSnaps.reduce((acc, s) => acc + (s.monthly_target || 0), 0) / dirSnaps.length * 6
          const avgConv = dirSnaps.reduce((acc, s) => acc + (s.conversion_rate || 0), 0) / dirSnaps.length

          setTotals({
            ventas: Math.round(totalVentas),
            uf: dirSnaps.reduce((a, s) => a + (s.ventas_uf || 0), 0) / 2,
            target: Math.round(monthlyTarget),
            conversion: Math.round(avgConv * 10) / 10,
            comision: dirSnaps.reduce((a, s) => a + (s.comision_total || 0), 0) / 2,
          })

          const newAgents = (agentProfiles as Profile[]).map(p => {
            const ag = agMap[p.id]
            const v   = ag?.ventas ?? 0
            const tgt = (dirSnaps.find(s => s.agent_id === p.id)?.monthly_target ?? 2) * 6
            const pct = tgt > 0 ? (v / tgt) * 100 : 0
            return {
              id: p.id,
              name: p.full_name || 'Agente',
              team: p.team || '—',
              ventas: v,
              captaciones: ag?.captaciones ?? 0,
              conversion: ag && ag.count > 0 ? Math.round((ag.conversion / ag.count) * 10) / 10 : 0,
              velocidad: ag && ag.count > 0 ? Math.round(ag.velocidad / ag.count) : 0,
              status: (pct >= 90 ? 'on_track' : pct >= 65 ? 'warning' : 'behind') as StatusKey,
            }
          }).sort((a, b) => b.ventas - a.ventas)
          setAgents(newAgents)

          // Monthly chart (team total)
          const months = [...new Set((snapshots as KpiSnapshot[]).map(s => s.period_date.slice(0, 7)))].sort().slice(-6)
          const chart = months.map(m => {
            const monthSnaps = (snapshots as KpiSnapshot[]).filter(s => s.period_date.startsWith(m))
            return {
              mes: MONTHS_ES[parseInt(m.slice(5, 7)) - 1],
              ventas: monthSnaps.reduce((a, s) => a + (s.ventas_count || 0), 0),
              target: monthSnaps.reduce((a, s) => a + (s.monthly_target || 0), 0),
            }
          })
          setChartData(chart)
        }

        if (activityData) setActivities(activityData as AgentActivity[])
      } catch (_) {
        // keep mocks
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const pctCumpl = totals.target > 0 ? Math.round((totals.ventas / totals.target) * 100) : 0

  const ACTIVITY_ICONS: Record<string, string> = { llamada: '📞', visita: '🏠', oferta: '📄', cierre: '✍️' }
  const ACTIVITY_COLORS: Record<string, string> = { llamada: '#8fb2aa', visita: '#b89a7e', oferta: '#0ea5e9', cierre: '#10b981' }

  return (
    <div className="flex-1 overflow-y-auto px-8 py-8" style={{ background: '#fbfbfa' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-widest px-2 py-0.5 rounded" style={{ background: '#b89a7e', color: '#fff' }}>Director</span>
            {director?.team && <span className="text-xs font-medium" style={{ color: '#8fb2aa' }}>{director.team}</span>}
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#173634' }}>
            {loading ? 'Cargando...' : director?.full_name || 'Juan Morales'}
          </h1>
          <p className="text-sm mt-1" style={{ color: '#9ca9a3' }}>Panel de tu equipo · {agents.length} agentes activos</p>
        </div>
        <div className="flex items-center gap-3 bg-white rounded-lg px-4 py-3" style={{ border: '1px solid #e8f0ed' }}>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider" style={{ color: '#9ca9a3' }}>Cumpl. 6 meses</div>
            <div className="text-xl font-bold" style={{ color: pctCumpl >= 90 ? '#10b981' : pctCumpl >= 70 ? '#f59e0b' : '#d97706' }}>{pctCumpl}%</div>
          </div>
          <div className="w-12 h-12 relative">
            <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f0f5f3" strokeWidth="3.8" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke={pctCumpl >= 90 ? '#10b981' : pctCumpl >= 70 ? '#f59e0b' : '#d97706'} strokeWidth="3.8" strokeDasharray={`${Math.min(pctCumpl, 100)} 100`} strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <KpiCard label="Ventas equipo" value={String(totals.ventas)} sub="propiedades cerradas (6m)" border="#8fb2aa" />
        <KpiCard label="UF vendidas"   value={`${(totals.uf/1000).toFixed(0)}K`} sub={`$${fmt(Math.round(totals.uf * 36300 / 1e6))}M CLP`} border="#b89a7e" />
        <KpiCard label="Conversión"    value={`${totals.conversion}%`} sub="leads → cierre promedio" border="#10b981" />
        <KpiCard label="Comisión eq."  value={`$${fmt(Math.round(totals.comision / 1000))}K`} sub="CLP acumulado 6m" border="#173634" />
      </div>

      {/* Agents Table + Chart */}
      <div className="grid grid-cols-5 gap-5 mb-8">
        {/* Agents */}
        <div className="col-span-3 bg-white rounded-lg overflow-hidden" style={{ border: '1px solid #e8f0ed' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #f0f5f3' }}>
            <h2 className="text-sm font-semibold" style={{ color: '#173634' }}>Mi Equipo de Agentes</h2>
            <span className="text-xs" style={{ color: '#9ca9a3' }}>6 meses · {agents.length} agentes</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#f8fbfa' }}>
                {['Agente','Ventas','Captac.','Conv.','Veloc.','Estado'].map(h => (
                  <th key={h} className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider ${h === 'Agente' ? 'text-left' : 'text-right'}`} style={{ color: '#9ca9a3' }}>{h}</th>
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
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: '#f0f7f4', color: '#8fb2aa' }}>{a.name.charAt(0)}</div>
                        <span className="text-[13px] font-medium" style={{ color: '#173634' }}>{a.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right"><span className="text-[13px] font-semibold" style={{ color: '#173634' }}>{a.ventas}</span></td>
                    <td className="px-4 py-3.5 text-right"><span className="text-[13px]" style={{ color: '#555a56' }}>{a.captaciones}</span></td>
                    <td className="px-4 py-3.5 text-right"><span className="text-[13px]" style={{ color: '#555a56' }}>{a.conversion}%</span></td>
                    <td className="px-4 py-3.5 text-right"><span className="text-[13px]" style={{ color: '#555a56' }}>{a.velocidad}d</span></td>
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
            <h2 className="text-sm font-semibold" style={{ color: '#173634' }}>Ventas vs Target</h2>
            <p className="text-xs mt-0.5" style={{ color: '#9ca9a3' }}>Equipo · últimos 6 meses</p>
          </div>
          <div className="px-4 pt-4 pb-2">
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f5f3" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9ca9a3' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca9a3' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e8f0ed', borderRadius: 6, fontSize: 12 }} />
                <Line type="monotone" dataKey="ventas" stroke="#8fb2aa" strokeWidth={2.5} dot={{ fill: '#8fb2aa', r: 4 }} name="Ventas" />
                <Line type="monotone" dataKey="target" stroke="#d8e5e2" strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="Target" />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-1 justify-center">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ background: '#8fb2aa' }} /><span className="text-[11px]" style={{ color: '#9ca9a3' }}>Ventas</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-0.5" style={{ background: '#d8e5e2' }} /><span className="text-[11px]" style={{ color: '#9ca9a3' }}>Target</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Activities Pending */}
      <div className="bg-white rounded-lg overflow-hidden" style={{ border: '1px solid #e8f0ed' }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #f0f5f3' }}>
          <h2 className="text-sm font-semibold" style={{ color: '#173634' }}>Actividades Pendientes del Equipo</h2>
          <span className="text-xs" style={{ color: '#9ca9a3' }}>{activities.length} pendientes hoy</span>
        </div>
        {activities.length === 0 ? (
          <div className="px-5 py-8 text-center"><p className="text-xs" style={{ color: '#9ca9a3' }}>Sin actividades pendientes.</p></div>
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
                    {act.scheduled_at && <span className="text-[10px]" style={{ color: '#9ca9a3' }}>{new Date(act.scheduled_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>}
                  </div>
                  <p className="text-[12px] leading-snug truncate" style={{ color: '#173634' }}>{act.description || '—'}</p>
                  {act.value_uf && <span className="text-[11px]" style={{ color: '#9ca9a3' }}>{fmt(act.value_uf)} UF</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
