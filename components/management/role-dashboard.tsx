'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  Home,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  UserRound,
  UsersRound,
} from 'lucide-react'
import {
  IntelligenceHeader,
  IntelligencePage,
  IntelligencePanel,
  MethodologyNote,
  MetricCard,
  MetricGrid,
  SectionHeading,
} from '@/components/intelligence/design-system'


type Metric = {
  code: string
  label: string
  unit: 'count' | 'uf' | 'percent' | 'days' | 'score'
  methodology: string
  value: number | null
  target: number | null
  compliance: number | null
  mom: number | null
  yoy: number | null
  sourceName: string | null
  periodStart: string | null
  periodEnd: string | null
  qualityStatus: string | null
}

type Entity = {
  id: string
  name: string
  entityType: string
  parentId: string | null
  classification?: string | null
  metrics: Metric[]
}

type Alert = {
  id: string
  severity: 'info' | 'warning' | 'critical'
  status: string
  title: string
  detail: string
  entityName: string
  createdAt: string
}

type Operational = {
  valuationCases: number
  valuationDrafts: number
  valuationInReview: number
  valuationApproved: number
  propertyAssignments: number
  activePropertyAssignments: number
  pausedPropertyAssignments: number
  teamMembers: number
  errors: string[]
}

type Access = {
  label: string
  href: string
  permission: 'read' | 'manage'
  detail: string
}

type Payload = {
  role: string
  scopeLabel: string
  entities: Entity[]
  alerts: Alert[]
  operational?: Operational | null
  accesses?: Access[]
  periodLabel: string
  dataProvenance?: string
}

const formatValue = (metric: Metric) => {
  if (metric.value === null) return 'Sin datos'
  if (metric.unit === 'uf') return `${metric.value.toLocaleString('es-CL', { maximumFractionDigits: 0 })} UF`
  if (metric.unit === 'percent') return `${metric.value.toLocaleString('es-CL', { maximumFractionDigits: 1 })}%`
  if (metric.unit === 'days') return `${metric.value.toLocaleString('es-CL', { maximumFractionDigits: 1 })} días`
  return metric.value.toLocaleString('es-CL', { maximumFractionDigits: 1 })
}

const variation = (value: number | null) => {
  if (value === null) return { text: 'n/d', icon: null }
  const icon = value > 0 ? <TrendingUp size={13} /> : value < 0 ? <TrendingDown size={13} /> : null
  return { text: `${value > 0 ? '+' : ''}${value.toFixed(1)}%`, icon }
}

function byCode(entity: Entity | undefined, code: string) {
  return entity?.metrics.find((metric) => metric.code === code)
}

function DirectorWorkspace({ payload }: { payload: Payload }) {
  const branch = payload.entities.find((entity) => entity.entityType === 'branch')
  const partners = payload.entities.filter((entity) => entity.entityType === 'partner')
  const operational = payload.operational
  const accesses = payload.accesses ?? []
  const branchHeadline = ['sales', 'sales_uf', 'cumulative_sales', 'cumulative_sales_uf', 'management_score', 'conversion']
    .map((code) => byCode(branch, code))
    .filter((metric): metric is Metric => Boolean(metric))

  return (
    <>
      <section>
        <SectionHeading
          eyebrow="01 · Estado operativo"
          title={`Dirección ${payload.scopeLabel}`}
          description="Resumen de la sucursal, equipo y operaciones disponibles para el perfil autenticado. Los conteos operativos respetan RLS."
        />
        <MetricGrid columns={4}>
          <MetricCard label="Ejecutivas en alcance" value={String(operational?.teamMembers ?? partners.length)} detail="Fichas canónicas vinculadas a la sucursal" />
          <MetricCard label="Valorizaciones visibles" value={String(operational?.valuationCases ?? 0)} detail={`${operational?.valuationInReview ?? 0} en revisión · ${operational?.valuationDrafts ?? 0} borradores`} />
          <MetricCard label="Asignaciones activas" value={String(operational?.activePropertyAssignments ?? 0)} detail={`${operational?.propertyAssignments ?? 0} asignaciones visibles en total`} />
          <MetricCard label="Alertas de gestión" value={String(payload.alerts.length)} detail="Derivadas de umbrales canónicos de scoring" />
        </MetricGrid>
        {operational?.errors.length ? (
          <div className="mt-4 border border-[#d7332b] bg-[#0c1111] p-4 text-sm text-[#ff766f]">
            Parte del estado operativo no pudo consultarse: {operational.errors.join(' · ')}
          </div>
        ) : null}
      </section>

      <section>
        <SectionHeading eyebrow="02 · Oficina" title={branch?.name ?? payload.scopeLabel} description="Resultados y scores del cierre canónico disponible." />
        {branchHeadline.length ? (
          <MetricGrid columns={3}>
            {branchHeadline.map((metric) => (
              <MetricCard key={metric.code} label={metric.label} value={formatValue(metric)} detail="Fuente canónica · cierre junio 2026" />
            ))}
          </MetricGrid>
        ) : (
          <div className="border border-dashed border-[var(--n3-line)] p-8 text-sm text-[var(--n3-text-muted)]">No existe una ficha canónica vinculada a la oficina.</div>
        )}
      </section>

      <section>
        <SectionHeading eyebrow="03 · Equipo" title="Ejecutivas bajo alcance" description="La vista no incluye integrantes de Nueva Costanera ni Santa María." />
        <div className="overflow-x-auto border border-[var(--n3-line)]">
          <table className="w-full min-w-[1050px] text-sm">
            <thead className="bg-[#080d0d] text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">
              <tr>
                <th className="px-4 py-3 text-left">Ejecutiva</th>
                <th className="px-4 py-3 text-left">Clasificación</th>
                <th className="px-4 py-3 text-right">Cierres</th>
                <th className="px-4 py-3 text-right">UF</th>
                <th className="px-4 py-3 text-right">Gestión</th>
                <th className="px-4 py-3 text-right">Cartera</th>
                <th className="px-4 py-3 text-right">Seguimiento</th>
                <th className="px-4 py-3 text-right">Conversión</th>
                <th className="px-4 py-3 text-right">Stock</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((entity) => (
                <tr key={entity.id} className="border-t border-[var(--n3-line)]">
                  <td className="px-4 py-3 font-semibold">{entity.name}</td>
                  <td className="px-4 py-3 text-[var(--n3-text-muted)]">{entity.classification ?? 'Sin clasificación'}</td>
                  {['sales', 'sales_uf', 'management_score', 'portfolio_score', 'follow_up_score', 'conversion', 'stock'].map((code) => {
                    const metric = byCode(entity, code)
                    return <td key={code} className="px-4 py-3 text-right tabular-nums">{metric ? formatValue(metric) : 'n/d'}</td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div>
          <SectionHeading eyebrow="04 · Prioridades" title="Alertas que requieren gestión" />
          <div className="space-y-3">
            {payload.alerts.length ? payload.alerts.slice(0, 12).map((alert) => (
              <article key={alert.id} className={`border bg-[#0c1111] p-4 ${alert.severity === 'critical' ? 'border-[#d7332b]' : 'border-[var(--n3-line)]'}`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle size={18} className={`mt-0.5 shrink-0 ${alert.severity === 'critical' ? 'text-[#ff766f]' : 'text-[#f6c453]'}`} />
                  <div>
                    <p className="font-semibold">{alert.entityName} · {alert.title}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--n3-text-muted)]">{alert.detail}</p>
                  </div>
                </div>
              </article>
            )) : (
              <div className="border border-dashed border-[var(--n3-line)] p-6 text-sm text-[var(--n3-text-muted)]">No existen alertas de scoring para el alcance visible.</div>
            )}
          </div>
        </div>

        <div>
          <SectionHeading eyebrow="05 · Accesos" title="Capacidades habilitadas" description="Cada acceso mantiene el alcance de Lo Beltrán en base de datos." />
          <div className="divide-y divide-[var(--n3-line)] border border-[var(--n3-line)] bg-[#0c1111]">
            {accesses.map((access) => (
              <Link key={access.href} href={access.href} className="group flex items-center gap-3 p-4 transition-colors hover:bg-white/[0.03]">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-[var(--n3-line)] text-[#ff766f]">
                  {access.permission === 'manage' ? <ShieldCheck size={17} /> : <ClipboardCheck size={17} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><strong>{access.label}</strong><span className="text-[9px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">{access.permission === 'manage' ? 'Gestionar' : 'Consultar'}</span></div>
                  <p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">{access.detail}</p>
                </div>
                <ArrowRight size={15} className="shrink-0 text-[var(--n3-text-muted)] transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="06 · Trazabilidad" title="Alcance y procedencia" />
        <MethodologyNote>{payload.dataProvenance ?? 'Datos canónicos y operativos limitados por el perfil autenticado.'} Esta cuenta de prueba usa una identidad canónica asociada a Lo Beltrán, pero no confirma el cargo real de esa persona.</MethodologyNote>
      </section>
    </>
  )
}

export function ManagementRoleDashboard({ view }: { view: 'ceo' | 'director' | 'partner' }) {
  const [payload, setPayload] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/management/summary', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No fue posible cargar el control de gestión.')
      setPayload(data)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible cargar el control de gestión.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const config = {
    ceo: { eyebrow: 'Módulo III · Vista CEO', title: 'Control consolidado de la compañía', description: 'Resultados consolidados, oficinas, partners, metas, variaciones, rankings y alertas contractuales.', icon: Building2 },
    director: { eyebrow: 'Dirección · Espacio de trabajo', title: 'Control de oficina y equipo', description: 'Resultados, equipo, valorizaciones, propiedades, alertas y accesos limitados a la sucursal autorizada.', icon: BarChart3 },
    partner: { eyebrow: 'Módulo III · Agente / Partner', title: 'Desempeño personal', description: 'Resultados, seguimiento, conversión, productividad, metas y posición personal.', icon: UserRound },
  }[view]

  const visibleEntities = useMemo(() => {
    if (!payload) return []
    if (view === 'partner') return payload.entities.filter((entity) => ['partner', 'agent'].includes(entity.entityType)).slice(0, 1)
    if (view === 'director') return payload.entities.filter((entity) => entity.entityType !== 'company')
    return payload.entities
  }, [payload, view])

  const primary = visibleEntities[0]
  const headlineMetrics = primary?.metrics.filter((metric) => ['sales', 'sales_uf', 'conversion', 'management_score', 'portfolio_score', 'follow_up_score'].includes(metric.code)).slice(0, 6) ?? []
  const ranking = [...visibleEntities]
    .filter((entity) => entity.entityType === 'partner')
    .map((entity) => ({ entity, sales: entity.metrics.find((metric) => metric.code === 'sales')?.value ?? null }))
    .filter((item) => item.sales !== null)
    .sort((a, b) => Number(b.sales) - Number(a.sales))

  const headerActions = view === 'director'
    ? [
        { label: 'Asignar propiedades', href: '/dashboard/properties/admin', primary: true },
        { label: 'Revisar valorizaciones', href: '/dashboard/valuations' },
      ]
    : [{ label: 'Control de gestión', href: '/dashboard/control', primary: true }, { label: 'Reportes', href: '/dashboard/reportes/autonomos' }]

  return (
    <IntelligencePage>
      <IntelligenceHeader
        eyebrow={config.eyebrow}
        title={config.title}
        description={config.description}
        actions={headerActions}
        meta={<div className="flex items-center gap-2 border border-[var(--n3-line)] bg-[#0c1111] px-4 py-3 text-xs text-[var(--n3-text-muted)]"><config.icon size={15} />{payload?.scopeLabel ?? 'Ámbito por resolver'} · {payload?.periodLabel ?? 'Sin período'}</div>}
      />

      {loading ? <div className="border border-[var(--n3-line)] p-8 text-sm text-[var(--n3-text-muted)]">Cargando métricas contractuales y estado operativo…</div> : null}
      {error ? <div className="border border-[#d7332b] p-5 text-sm text-[#ff766f]"><p>{error}</p><button onClick={() => void load()} className="mt-3 flex items-center gap-2 border border-[var(--n3-line)] px-3 py-2"><RefreshCw size={14} />Reintentar</button></div> : null}

      {!loading && !error && payload && view === 'director' ? <DirectorWorkspace payload={payload} /> : null}

      {!loading && !error && payload && view !== 'director' ? <>
        <section>
          <SectionHeading eyebrow="01 · Resultados" title={primary?.name ?? 'Sin entidad asignada'} description="La plataforma no presenta valores de demostración. Los campos sin fuente permanecen como pendientes." />
          {headlineMetrics.length ? <MetricGrid columns={3}>
            {headlineMetrics.map((metric) => {
              const mom = variation(metric.mom)
              return <MetricCard key={metric.code} label={metric.label} value={formatValue(metric)} detail={`${metric.target === null ? 'Sin meta aprobada' : `Meta ${metric.target.toLocaleString('es-CL')}`} · MoM ${mom.text}`} />
            })}
          </MetricGrid> : <div className="border border-dashed border-[var(--n3-line)] p-8 text-sm text-[var(--n3-text-muted)]">No existen métricas cargadas para este ámbito y período.</div>}
        </section>

        <section>
          <SectionHeading eyebrow="02 · Desglose" title="Entidades bajo el ámbito autorizado" />
          <div className="overflow-x-auto border border-[var(--n3-line)]">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-[#080d0d] text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]"><tr><th className="px-4 py-3 text-left">Entidad</th><th className="px-4 py-3 text-left">Tipo</th><th className="px-4 py-3 text-right">Cierres</th><th className="px-4 py-3 text-right">UF</th><th className="px-4 py-3 text-right">Gestión</th><th className="px-4 py-3 text-right">Seguimiento</th><th className="px-4 py-3 text-right">Conversión</th></tr></thead>
              <tbody>{visibleEntities.map((entity) => {
                const metrics = Object.fromEntries(entity.metrics.map((metric) => [metric.code, metric]))
                return <tr key={entity.id} className="border-t border-[var(--n3-line)]"><td className="px-4 py-3 font-semibold">{entity.name}</td><td className="px-4 py-3 capitalize text-[var(--n3-text-muted)]">{entity.entityType}</td>{['sales', 'sales_uf', 'management_score', 'follow_up_score', 'conversion'].map((code) => <td key={code} className="px-4 py-3 text-right">{metrics[code] ? formatValue(metrics[code]) : 'n/d'}</td>)}</tr>
              })}</tbody>
            </table>
          </div>
        </section>

        {view !== 'partner' ? <section>
          <SectionHeading eyebrow="03 · Ranking" title="Ranking por ventas confirmadas" description="Solo incluye entidades con datos atribuibles al período." />
          <IntelligencePanel eyebrow="Orden contractual" title="Desempeño por entidad" description="El ranking no mezcla entidades sin atribución o datos provisionales.">
            <div className="divide-y divide-[var(--n3-line)]">{ranking.length ? ranking.map((item, index) => <div key={item.entity.id} className="flex items-center justify-between p-4"><div><span className="mr-3 text-xs text-[var(--n3-text-muted)]">{String(index + 1).padStart(2, '0')}</span><strong>{item.entity.name}</strong></div><span>{Number(item.sales).toLocaleString('es-CL')} ventas</span></div>) : <p className="p-5 text-sm text-[var(--n3-text-muted)]">Sin datos suficientes para ranking.</p>}</div>
          </IntelligencePanel>
        </section> : null}

        <section>
          <SectionHeading eyebrow="04 · Alertas" title="Excepciones que requieren gestión" />
          <div className="space-y-3">{payload.alerts.length ? payload.alerts.map((alert) => <div key={alert.id} className={`border p-4 ${alert.severity === 'critical' ? 'border-[#d7332b]' : 'border-[var(--n3-line)]'}`}><div className="flex items-start gap-3"><AlertTriangle size={18} className="mt-0.5 text-[#ff766f]" /><div><p className="font-semibold">{alert.title}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{alert.entityName} · {alert.status}</p><p className="mt-2 text-sm text-[var(--n3-text-muted)]">{alert.detail}</p></div></div></div>) : <div className="border border-dashed border-[var(--n3-line)] p-6 text-sm text-[var(--n3-text-muted)]">No hay alertas abiertas en el ámbito visible.</div>}</div>
        </section>

        <section>
          <SectionHeading eyebrow="05 · Trazabilidad" title="Metodología y fuentes" />
          <div className="grid gap-4 lg:grid-cols-2">{primary?.metrics.map((metric) => <IntelligencePanel key={metric.code} eyebrow={metric.code} title={metric.label} description={metric.methodology}><div className="p-4 text-xs text-[var(--n3-text-muted)]"><p>Fuente: {metric.sourceName ?? 'Pendiente'}</p><p className="mt-1">Período: {metric.periodStart ?? 'n/d'} — {metric.periodEnd ?? 'n/d'}</p><p className="mt-1">Calidad: {metric.qualityStatus ?? 'sin datos'}</p></div></IntelligencePanel>)}</div>
          <div className="mt-4"><MethodologyNote>Las vistas por rol comparten definiciones de métricas, pero limitan las entidades según el perfil y la jerarquía configurada. Las funciones experimentales permanecen en Versión 2.</MethodologyNote></div>
        </section>
      </> : null}
    </IntelligencePage>
  )
}
