'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import type { KpiSnapshot, Profile, AgentActivity } from '@/lib/types'

const AGENT_ID = 'a0000000-0000-0000-0000-000000000001' // default: Sofía Ramos
const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const ACTIVITY_COLORS: Record<string, string> = {
  llamada: '#8fb2aa',
  visita:  '#b89a7e',
  oferta:  '#0ea5e9',
  cierre:  '#10b981',
}

const ACTIVITY_BORDER: Record<string, string> = {
  llamada: '#8fb2aa',
  visita:  '#b89a7e',
  oferta:  '#0ea5e9',
  cierre:  '#10b981',
}

const MOCK_ACTIVITIES: AgentActivity[] = [
  { id: '1', agent_id: AGENT_ID, activity_type: 'llamada', property_id: null, description: 'Seguimiento cliente Av. Vitacura 3200', value_uf: 14500, status: 'pending', scheduled_at: new Date().toISOString(), completed_at: null, created_at: new Date().toISOString() },
  { id: '2', agent_id: AGENT_ID, activity_type: 'visita',  property_id: null, description: 'Visita depto 2D La Dehesa',              value_uf: 18200, status: 'pending', scheduled_at: new Date().toISOString(), completed_at: null, created_at: new Date().toISOString() },
  { id: '3', agent_id: AGENT_ID, activity_type: 'oferta',  property_id: null, description: 'Enviar oferta Alonso de Córdova 4500',   value_uf: 23600, status: 'pending', scheduled_at: new Date().toISOString(), completed_at: null, created_at: new Date().toISOString() },
]

const MOCK_CHART = [
  { mes: 'Feb', ventas: 2, target: 3 },
  { mes: 'Mar', ventas: 3, target: 3 },
  { mes: 'Abr', ventas: 3, target: 3 },
  { mes: 'May', ventas: 2, target: 3 },
  { mes: 'Jun', ventas: 4, target: 4 },
  { mes: 'Jul', ventas: 2, target: 4 },
]

const MOCK_TEAMMATES = [
  { name: 'Sofía Ramos',   ventas: 15, isMe: true },
  { name: 'Diego Herrera', ventas: 14, isMe: false },
]

function fmt(n: number) { return n.toLocaleString('es-CL') }

function KpiCard({ label, value, sub, border, delta }: { label: string; value: string; sub?: string; border: string; delta?: number }) {
  return (
    <div className="bg-white rounded-lg p-5 flex flex-col gap-1" style={{ border: '1px solid #e8f0ed', borderLeft: `3px solid ${border}` }}>
      <span className="text-[11px] uppercase tracking-wider font-medium" style={{ color: '#9ca9a3' }}>{label}</span>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold tracking-tight" style={{ color: '#173634' }}>{value}</span>
        {delta !== undefined && (
          <span className="text-xs font-medium mb-0.5" style={{ color: delta >= 0 ? '#10b981' : '#d97706' }}>
            {delta >= 0 ? '+' : ''}{delta}%
          </span>
        )}
      </div>
      {sub && <span className="text-xs" style={{ color: '#b89a7e' }}>{sub}</span>}
    </div>
  )
}

export default function AgenteDashboard() {
  const [agent, setAgent] = useState<Profile | null>(null)
  const [activities, setActivities] = useState<AgentActivity[]>(MOCK_ACTIVITIES)
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set())
  const [chartData, setChartData] = useState(MOCK_CHART)
  const [teammates, setTeammates] = useState(MOCK_TEAMMATES)
  const [kpis, setKpis] = useState({ ventas: 15, comision: 2052000, captaciones: 25, velocidad: 31, deltaVentas: 33, deltaComision: 33 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const [{ data: profileData }, { data: snapshots }, { data: activityData }, { data: teamProfiles }] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', AGENT_ID).single(),
          supabase.from('kpi_snapshots').select('*').eq('agent_id', AGENT_ID).order('period_date', { ascending: true }),
          supabase.from('agent_activities').select('*').eq('agent_id', AGENT_ID).order('scheduled_at', { ascending: true }).limit(10),
          supabase.from('profiles').select('*').eq('role', 'seller').eq('team', 'Equipo Alpha'),
        ])

        if (profileData) setAgent(profileData as Profile)

        if (snapshots && snapshots.length > 0) {
          const snaps = snapshots as KpiSnapshot[]
          const last  = snaps[snaps.length - 1]
          const prev  = snaps.length >= 2 ? snaps[snaps.length - 2] : null
          const totalVentas   = snaps.reduce((a, s) => a + s.ventas_count, 0)
          const totalComision = snaps.reduce((a, s) => a + s.comision_total, 0)
          const totalCaptac   = snaps.reduce((a, s) => a + s.captaciones_count, 0)
          const avgVelocidad  = Math.round(snaps.reduce((a, s) => a + s.velocidad_venta, 0) / snaps.length)
          const deltaV = prev ? Math.round(((last.ventas_count - prev.ventas_count) / Math.max(prev.ventas_count, 1)) * 100) : 0
          const deltaC = prev ? Math.round(((last.comision_total - prev.comision_total) / Math.max(prev.comision_total, 1)) * 100) : 0

          setKpis({ ventas: totalVentas, comision: totalComision, captaciones: totalCaptac, velocidad: avgVelocidad, deltaVentas: deltaV, deltaComision: deltaC })

          const months = [...new Set(snaps.map(s => s.period_date.slice(0, 7)))].sort().slice(-6)
          const chart = months.map(m => {
            const s = snaps.find(ss => ss.period_date.startsWith(m))
            return { mes: MONTHS_ES[parseInt(m.slice(5, 7)) - 1], ventas: s?.ventas_count ?? 0, target: s?.monthly_target ?? 0 }
          })
          setChartData(chart)
        }

        if (activityData) setActivities(activityData as AgentActivity[])

        // Build teammate ranking from kpi_snapshots for same team
        if (teamProfiles && teamProfiles.length > 0) {
          const { data: teamSnaps } = await supabase
            .from('kpi_snapshots')
            .select('agent_id, ventas_count')
            .in('agent_id', (teamProfiles as Profile[]).map(p => p.id))
          if (teamSnaps) {
            const teamMap: Record<string, number> = {}
            for (const s of teamSnaps) {
              if (!s.agent_id) continue
              teamMap[s.agent_id] = (teamMap[s.agent_id] || 0) + s.ventas_count
            }
            const ranked = (teamProfiles as Profile[])
              .map(p => ({ name: p.full_name || 'Agente', ventas: teamMap[p.id] || 0, isMe: p.id === AGENT_ID }))
              .sort((a, b) => b.ventas - a.ventas)
            setTeammates(ranked)
          }
        }
      } catch (_) {
        // keep mocks
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Local toggle done
  function toggleDone(id: string) {
    setDoneIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const today = new Date()
  const todayActivities   = activities.filter(a => a.status === 'pending' || doneIds.has(a.id)).slice(0, 5)
  const myRankPos         = teammates.findIndex(t => t.isMe) + 1
  const todayStr          = today.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
  const todayStrCap       = todayStr.charAt(0).toUpperCase() + todayStr.slice(1)

  return (
    <div className="flex-1 overflow-y-auto px-8 py-8" style={{ background: '#fbfbfa' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="text-xs font-medium mb-1" style={{ color: '#9ca9a3' }}>{todayStrCap}</div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#173634' }}>
            {loading ? 'Cargando...' : `Hola, ${agent?.full_name?.split(' ')[0] || 'Sofía'}`}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs font-semibold uppercase tracking-widest px-2 py-0.5 rounded" style={{ background: '#e8f3f0', color: '#8fb2aa' }}>Agente</span>
            {agent?.team && <span className="text-xs" style={{ color: '#9ca9a3' }}>{agent.team}</span>}
            {myRankPos > 0 && <span className="text-xs font-medium" style={{ color: '#b89a7e' }}>#{myRankPos} en tu equipo</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2.5" style={{ border: '1px solid #e8f0ed' }}>
          <div className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} />
          <span className="text-xs font-medium" style={{ color: '#173634' }}>
            {todayActivities.filter(a => !doneIds.has(a.id)).length} pendiente{todayActivities.filter(a => !doneIds.has(a.id)).length !== 1 ? 's' : ''} hoy
          </span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <KpiCard label="Mis ventas"      value={String(kpis.ventas)}           sub="propiedades cerradas (6m)" border="#8fb2aa" delta={kpis.deltaVentas} />
        <KpiCard label="Mi comisión"     value={`$${fmt(Math.round(kpis.comision / 1000))}K`} sub="CLP acumulado" border="#b89a7e" delta={kpis.deltaComision} />
        <KpiCard label="Captaciones"     value={String(kpis.captaciones)}      sub="propiedades captadas" border="#10b981" />
        <KpiCard label="Días prom. venta" value={`${kpis.velocidad}d`}         sub="velocidad promedio" border="#173634" />
      </div>

      {/* Today + Chart + Ranking */}
      <div className="grid grid-cols-5 gap-5 mb-8">
        {/* Today's checklist */}
        <div className="col-span-2 bg-white rounded-lg" style={{ border: '1px solid #e8f0ed' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #f0f5f3' }}>
            <h2 className="text-sm font-semibold" style={{ color: '#173634' }}>Mis actividades de hoy</h2>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#f0f7f4', color: '#8fb2aa' }}>
              {todayActivities.filter(a => doneIds.has(a.id)).length}/{todayActivities.length}
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: '#f0f5f3' }}>
            {todayActivities.length === 0 && (
              <div className="px-5 py-8 text-center"><p className="text-xs" style={{ color: '#9ca9a3' }}>Sin actividades para hoy.</p></div>
            )}
            {todayActivities.map(act => {
              const done = doneIds.has(act.id) || act.status === 'done'
              return (
                <div key={act.id} className="px-5 py-3 flex items-start gap-3" onClick={() => toggleDone(act.id)} style={{ cursor: 'pointer' }}>
                  <div className="mt-0.5 shrink-0">
                    <div className="w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-all" style={{ borderColor: done ? '#8fb2aa' : '#d8e5e2', background: done ? '#8fb2aa' : 'transparent', width: 18, height: 18 }}>
                      {done && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] font-semibold capitalize" style={{ color: done ? '#9ca9a3' : ACTIVITY_COLORS[act.activity_type] }}>{act.activity_type}</span>
                      {act.scheduled_at && <span className="text-[10px]" style={{ color: '#9ca9a3' }}>{new Date(act.scheduled_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>}
                    </div>
                    <p className="text-[12px] leading-snug" style={{ color: done ? '#9ca9a3' : '#173634', textDecoration: done ? 'line-through' : 'none' }}>{act.description || '—'}</p>
                    {act.value_uf && !done && <span className="text-[11px]" style={{ color: '#9ca9a3' }}>{fmt(act.value_uf)} UF</span>}
                  </div>
                  <div className="w-1 self-stretch rounded-full mt-1" style={{ background: ACTIVITY_BORDER[act.activity_type] + '60', width: 3 }} />
                </div>
              )
            })}
          </div>
        </div>

        {/* Bar chart ventas vs target */}
        <div className="col-span-2 bg-white rounded-lg" style={{ border: '1px solid #e8f0ed' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid #f0f5f3' }}>
            <h2 className="text-sm font-semibold" style={{ color: '#173634' }}>Mi Pipeline Personal</h2>
            <p className="text-xs mt-0.5" style={{ color: '#9ca9a3' }}>Ventas vs target · 6 meses</p>
          </div>
          <div className="px-4 pt-4 pb-2">
            <ResponsiveContainer width="100%" height={175}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f5f3" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9ca9a3' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca9a3' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e8f0ed', borderRadius: 6, fontSize: 12 }} />
                <Bar dataKey="ventas" radius={[4, 4, 0, 0]} maxBarSize={32} name="Ventas">
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.ventas >= entry.target ? '#8fb2aa' : '#b89a7e'} />
                  ))}
                </Bar>
                <Bar dataKey="target" fill="#e8f0ed" radius={[4, 4, 0, 0]} maxBarSize={32} name="Target" />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-1 justify-center">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ background: '#8fb2aa' }} /><span className="text-[11px]" style={{ color: '#9ca9a3' }}>Meta alcanzada</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ background: '#b89a7e' }} /><span className="text-[11px]" style={{ color: '#9ca9a3' }}>Bajo meta</span></div>
            </div>
          </div>
        </div>

        {/* Team ranking */}
        <div className="col-span-1 bg-white rounded-lg" style={{ border: '1px solid #e8f0ed' }}>
          <div className="px-4 py-4" style={{ borderBottom: '1px solid #f0f5f3' }}>
            <h2 className="text-sm font-semibold" style={{ color: '#173634' }}>Mi Ranking</h2>
            <p className="text-xs mt-0.5" style={{ color: '#9ca9a3' }}>En el equipo</p>
          </div>
          <div className="px-4 py-3 flex flex-col gap-2">
            {teammates.map((t, i) => (
              <div key={t.name} className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 ${t.isMe ? '' : ''}`} style={{ background: t.isMe ? '#f0f7f4' : 'transparent', border: t.isMe ? '1px solid #d8e5e2' : '1px solid transparent' }}>
                <span className="text-sm font-bold w-5 text-center" style={{ color: i === 0 ? '#f59e0b' : '#9ca9a3' }}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium truncate" style={{ color: t.isMe ? '#173634' : '#555a56' }}>{t.isMe ? 'Tú' : t.name.split(' ')[0]}</div>
                  <div className="text-[11px]" style={{ color: '#9ca9a3' }}>{t.ventas} ventas</div>
                </div>
                {t.isMe && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#8fb2aa' }} />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
