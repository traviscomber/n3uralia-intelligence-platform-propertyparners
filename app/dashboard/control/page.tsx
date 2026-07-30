'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, BarChart3, Building2, RefreshCw, Target, TrendingDown, TrendingUp, Users } from 'lucide-react'
import {
  IntelligenceHeader,
  IntelligencePage,
  IntelligencePanel,
  MethodologyNote,
  MetricCard,
  MetricGrid,
  SectionHeading,
} from '@/components/intelligence/design-system'

type Entity = { id: string; name: string; entity_type: string; parent_id: string | null; profile_id: string | null }
type Definition = { code: string; label: string; description: string; unit: string; methodology: string }
type Metric = { id: string; entity_id: string; metric_code: string; value: number; source_name: string; quality_status: string }
type Goal = { entity_id: string; metric_code: string; target_value: number; source_name: string }
type Alert = { id: string; entity_id: string; metric_code: string; severity: string; status: string; title: string; detail: string }
type Comparison = { entityId: string; metricCode: string; mom: number | null; yoy: number | null }
type Summary = {
  period: string
  profile: { role: string; fullName: string | null }
  entities: Entity[]
  definitions: Definition[]
  metrics: Metric[]
  goals: Goal[]
  alerts: Alert[]
  comparisons: Comparison[]
}

function formatValue(value: number, unit: string) {
  if (unit === 'uf') return `${Math.round(value).toLocaleString('es-CL')} UF`
  if (unit === 'percent') return `${value.toLocaleString('es-CL', { maximumFractionDigits: 1 })}%`
  if (unit === 'days') return `${value.toLocaleString('es-CL', { maximumFractionDigits: 1 })} días`
  return value.toLocaleString('es-CL', { maximumFractionDigits: 1 })
}

function Variation({ value, label }: { value: number | null; label: string }) {
  if (value === null) return <span className="text-[10px] text-[var(--n3-text-muted)]">{label}: n/d</span>
  const positive = value >= 0
  return <span className={`inline-flex items-center gap-1 text-[10px] ${positive ? 'text-emerald-300' : 'text-[#ff766f]'}`}>{positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{label}: {value.toLocaleString('es-CL', { maximumFractionDigits: 1 })}%</span>
}

export default function ControlPage() {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/management/summary?period=${period}`, { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No fue posible cargar el control de gestión.')
      setSummary(payload)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible cargar el control de gestión.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [period])

  const companyOrFirst = summary?.entities.find((entity) => entity.entity_type === 'company') ?? summary?.entities[0]
  const executiveMetrics = useMemo(() => {
    if (!summary || !companyOrFirst) return []
    return summary.definitions.map((definition) => {
      const metric = summary.metrics.find((item) => item.entity_id === companyOrFirst.id && item.metric_code === definition.code)
      const goal = summary.goals.find((item) => item.entity_id === companyOrFirst.id && item.metric_code === definition.code)
      const comparison = summary.comparisons.find((item) => item.entityId === companyOrFirst.id && item.metricCode === definition.code)
      return { definition, metric, goal, comparison }
    }).filter((item) => item.metric)
  }, [summary, companyOrFirst])

  const rankings = useMemo(() => {
    if (!summary) return []
    return summary.entities
      .filter((entity) => ['office', 'team', 'partner', 'agent'].includes(entity.entity_type))
      .map((entity) => {
        const sales = summary.metrics.find((metric) => metric.entity_id === entity.id && metric.metric_code === 'sales')
        const listings = summary.metrics.find((metric) => metric.entity_id === entity.id && metric.metric_code === 'listings')
        const followups = summary.metrics.find((metric) => metric.entity_id === entity.id && metric.metric_code === 'followups')
        const score = Number(sales?.value ?? 0) * 5 + Number(listings?.value ?? 0) * 2 + Number(followups?.value ?? 0) * 0.2
        return { entity, sales: Number(sales?.value ?? 0), listings: Number(listings?.value ?? 0), followups: Number(followups?.value ?? 0), score }
      })
      .sort((a, b) => b.score - a.score)
  }, [summary])

  return (
    <IntelligencePage>
      <IntelligenceHeader
        eyebrow="Módulo III · Control de Gestión"
        title="Desempeño comercial trazable"
        description="Resultados por empresa, oficina, equipo, partner y agente, con metas, variaciones mensuales y anuales, rankings y alertas operativas."
        actions={[{ label: 'Reportes periódicos', href: '/dashboard/reportes/autonomos' }]}
        meta={<div className="flex items-center gap-3 border border-[var(--n3-line)] bg-[#0c1111] px-4 py-3 text-xs"><input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} className="bg-transparent outline-none" /><button type="button" onClick={() => void load()} aria-label="Actualizar"><RefreshCw size={14} /></button></div>}
      />

      {error ? <div className="border border-[#d7332b] bg-[#1a0d0d] p-4 text-sm text-[#ff766f]">{error}</div> : null}
      {loading ? <div className="border border-[var(--n3-line)] p-8 text-sm text-[var(--n3-text-muted)]">Cargando métricas verificadas…</div> : null}

      {!loading && summary ? <>
        <section>
          <SectionHeading eyebrow="01 · Consolidado" title={companyOrFirst?.name ?? 'Ámbito del usuario'} description={`Rol activo: ${summary.profile.role || 'sin rol'} · período ${summary.period}`} />
          {executiveMetrics.length ? <MetricGrid columns={4}>
            {executiveMetrics.slice(0, 8).map(({ definition, metric, goal, comparison }) => {
              const compliance = goal && Number(goal.target_value) !== 0 ? Number(metric?.value ?? 0) / Number(goal.target_value) * 100 : null
              return <MetricCard key={definition.code} label={definition.label} value={formatValue(Number(metric?.value ?? 0), definition.unit)} detail={goal ? `Meta: ${formatValue(Number(goal.target_value), definition.unit)} · Cumplimiento ${compliance?.toLocaleString('es-CL', { maximumFractionDigits: 1 })}%` : `Fuente: ${metric?.source_name ?? 'sin fuente'}`} />
            })}
          </MetricGrid> : <IntelligencePanel eyebrow="Sin datos" title="No existen métricas cargadas para este período" description="La aplicación no genera resultados demostrativos. Cargue métricas verificadas y metas aprobadas en Supabase."><div className="p-5"><MethodologyNote>Las definiciones contractuales ya están disponibles; los valores operativos deben provenir del CRM, libros conciliados o una fuente registrada.</MethodologyNote></div></IntelligencePanel>}
          {executiveMetrics.length ? <div className="mt-3 flex flex-wrap gap-4 border border-[var(--n3-line)] bg-[#0c1111] p-4">{executiveMetrics.slice(0, 4).map(({ definition, comparison }) => <div key={definition.code} className="flex gap-3"><span className="text-xs font-semibold">{definition.label}</span><Variation value={comparison?.mom ?? null} label="MoM" /><Variation value={comparison?.yoy ?? null} label="YoY" /></div>)}</div> : null}
        </section>

        <section>
          <SectionHeading eyebrow="02 · Desglose" title="Oficinas, equipos, partners y agentes" />
          <div className="grid gap-4 xl:grid-cols-2">
            {summary.entities.filter((entity) => entity.id !== companyOrFirst?.id).map((entity) => {
              const values = summary.metrics.filter((metric) => metric.entity_id === entity.id)
              return <IntelligencePanel key={entity.id} eyebrow={entity.entity_type} title={entity.name} description={`${values.length} métricas disponibles en el período.`}>
                <div className="grid gap-px bg-[var(--n3-line)] sm:grid-cols-3">
                  {['listings', 'sales', 'conversion'].map((code) => {
                    const definition = summary.definitions.find((item) => item.code === code)
                    const metric = values.find((item) => item.metric_code === code)
                    return <div key={code} className="bg-[#0c1111] p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{definition?.label ?? code}</p><p className="mt-2 text-2xl font-semibold">{metric && definition ? formatValue(Number(metric.value), definition.unit) : 'n/d'}</p></div>
                  })}
                </div>
              </IntelligencePanel>
            })}
          </div>
        </section>

        <section>
          <SectionHeading eyebrow="03 · Ranking" title="Productividad relativa" description="Orden basado en ventas, captaciones y seguimientos del mismo período. No reemplaza la evaluación humana." />
          <IntelligencePanel eyebrow="Ranking operativo" title={`${rankings.length} entidades evaluadas`} description="La fórmula visible evita puntajes opacos.">
            <div className="divide-y divide-[var(--n3-line)]">
              {rankings.length ? rankings.map((row, index) => <div key={row.entity.id} className="grid grid-cols-[40px_1fr_repeat(4,minmax(70px,auto))] items-center gap-3 px-4 py-3 text-sm"><strong>{index + 1}</strong><div><p className="font-semibold">{row.entity.name}</p><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">{row.entity.entity_type}</p></div><span>{row.sales} ventas</span><span>{row.listings} captaciones</span><span>{row.followups} seguimientos</span><strong>{row.score.toLocaleString('es-CL', { maximumFractionDigits: 1 })}</strong></div>) : <p className="p-5 text-sm text-[var(--n3-text-muted)]">Sin entidades o métricas suficientes.</p>}
            </div>
          </IntelligencePanel>
        </section>

        <section>
          <SectionHeading eyebrow="04 · Alertas" title="Desviaciones y responsables" />
          <div className="grid gap-4 lg:grid-cols-3">
            {summary.alerts.length ? summary.alerts.map((alert) => <div key={alert.id} className={`border p-5 ${alert.severity === 'critical' ? 'border-[#d7332b]' : alert.severity === 'warning' ? 'border-amber-500/60' : 'border-[var(--n3-line)]'}`}><div className="flex items-center gap-2"><AlertTriangle size={16} /><span className="text-[10px] font-semibold uppercase tracking-[0.12em]">{alert.severity} · {alert.status}</span></div><h3 className="mt-3 font-semibold">{alert.title}</h3><p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">{alert.detail}</p></div>) : <div className="col-span-full border border-[var(--n3-line)] p-6 text-sm text-[var(--n3-text-muted)]">No existen alertas abiertas para el ámbito y período seleccionado.</div>}
          </div>
        </section>

        <section>
          <SectionHeading eyebrow="05 · Metodología" title="Definiciones contractuales" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{summary.definitions.map((definition) => <div key={definition.code} className="border border-[var(--n3-line)] bg-[#0c1111] p-4"><div className="flex items-center gap-2">{definition.code === 'sales' ? <BarChart3 size={15} /> : definition.code === 'goal_compliance' ? <Target size={15} /> : definition.code === 'listings' ? <Building2 size={15} /> : <Users size={15} />}<h3 className="text-sm font-semibold">{definition.label}</h3></div><p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">{definition.methodology}</p></div>)}</div>
        </section>
      </> : null}
    </IntelligencePage>
  )
}
