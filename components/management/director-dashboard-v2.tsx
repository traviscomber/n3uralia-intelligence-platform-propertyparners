'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, BarChart3, ClipboardCheck, RefreshCw, ShieldCheck, TrendingDown, TrendingUp } from 'lucide-react'
import { IntelligenceHeader, IntelligencePage, MethodologyNote, MetricCard, MetricGrid, SectionHeading } from '@/components/intelligence/design-system'

type Metric = {
  code: string
  label: string
  unit: 'count' | 'uf' | 'percent' | 'days' | 'score'
  value: number | null
  target: number | null
  compliance: number | null
  mom: number | null
  methodology: string
  sourceName: string | null
  sourceReference?: string | null
}

type EvolutionPoint = {
  period: string
  sales: number | null
  salesTarget: number | null
  salesUf: number | null
  salesUfTarget: number | null
  cumulativeSales: number | null
  cumulativeSalesTarget: number | null
}

type Entity = {
  id: string
  name: string
  entityType: string
  classification?: string | null
  metrics: Metric[]
  evolution?: EvolutionPoint[]
}

type Alert = {
  id: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  detail: string
  entityName: string
}

type Payload = {
  scopeLabel: string
  entities: Entity[]
  alerts: Alert[]
  operational?: {
    valuationCases: number
    valuationDrafts: number
    valuationInReview: number
    valuationApproved: number
    propertyAssignments: number
    activePropertyAssignments: number
    pausedPropertyAssignments: number
    teamMembers: number
    errors: string[]
  } | null
  accesses?: Array<{ label: string; href: string; permission: 'read' | 'manage'; detail: string }>
  periodLabel: string
  generatedAt?: string
  dataProvenance?: string
}

const months: Record<string, string> = {
  '2026-01': 'Ene', '2026-02': 'Feb', '2026-03': 'Mar', '2026-04': 'Abr', '2026-05': 'May', '2026-06': 'Jun',
}

function metric(entity: Entity | undefined, code: string) {
  return entity?.metrics.find((item) => item.code === code)
}

function format(metricItem: Metric | undefined) {
  if (!metricItem || metricItem.value === null) return 'n/d'
  if (metricItem.unit === 'uf') return `${metricItem.value.toLocaleString('es-CL', { maximumFractionDigits: 0 })} UF`
  return metricItem.value.toLocaleString('es-CL', { maximumFractionDigits: 1 })
}

function complianceTone(value: number | null) {
  if (value === null) return 'text-[var(--n3-text-muted)]'
  if (value >= 100) return 'text-[#65c780]'
  if (value >= 90) return 'text-[#f6c453]'
  return 'text-[#ff766f]'
}

function ScoreBadge({ value }: { value: number | null }) {
  const className = value === null ? 'border-[var(--n3-line)] text-[var(--n3-text-muted)]' : value >= 70 ? 'border-[#2f8f4e] text-[#65c780]' : value >= 50 ? 'border-[#a77a22] text-[#f6c453]' : 'border-[#d7332b] text-[#ff766f]'
  return <span className={`inline-flex min-w-12 justify-center border px-2 py-1 text-xs font-semibold tabular-nums ${className}`}>{value === null ? 'n/d' : value.toFixed(1)}</span>
}

function EvolutionChart({ points }: { points: EvolutionPoint[] }) {
  const max = Math.max(1, ...points.flatMap((point) => [point.sales ?? 0, point.salesTarget ?? 0]))
  return (
    <div className="border border-[var(--n3-line)] bg-[#0c1111] p-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Evolución mensual</p><h3 className="mt-1 text-lg font-semibold">Cierres reales vs meta</h3></div>
        <div className="flex gap-4 text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]"><span>Real</span><span>Meta</span></div>
      </div>
      <div className="grid grid-cols-6 gap-3">
        {points.map((point) => (
          <div key={point.period} className="min-w-0">
            <div className="flex h-44 items-end justify-center gap-1 border-b border-[var(--n3-line)] px-1">
              <div className="w-3 bg-[#d7332b]" style={{ height: `${Math.max(3, ((point.sales ?? 0) / max) * 100)}%` }} title={`Real ${point.sales ?? 'n/d'}`} />
              <div className="w-3 border border-[var(--n3-line)] bg-white/10" style={{ height: `${Math.max(3, ((point.salesTarget ?? 0) / max) * 100)}%` }} title={`Meta ${point.salesTarget ?? 'n/d'}`} />
            </div>
            <p className="mt-2 text-center text-xs text-[var(--n3-text-muted)]">{months[point.period] ?? point.period}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DirectorDashboardV2() {
  const [payload, setPayload] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sort, setSort] = useState<'management' | 'sales' | 'gap'>('management')

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/management/summary', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No fue posible cargar la vista de dirección.')
      setPayload(data)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible cargar la vista de dirección.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const branch = payload?.entities.find((entity) => entity.entityType === 'branch')
  const partners = useMemo(() => {
    const rows = payload?.entities.filter((entity) => entity.entityType === 'partner') ?? []
    return [...rows].sort((a, b) => {
      if (sort === 'sales') return Number(metric(b, 'sales')?.value ?? -1) - Number(metric(a, 'sales')?.value ?? -1)
      if (sort === 'gap') return Number(metric(a, 'management_score')?.value ?? 999) - Number(metric(b, 'management_score')?.value ?? 999)
      return Number(metric(b, 'management_score')?.value ?? -1) - Number(metric(a, 'management_score')?.value ?? -1)
    })
  }, [payload, sort])

  const headline = ['sales', 'sales_uf', 'cumulative_sales', 'cumulative_sales_uf'].map((code) => metric(branch, code)).filter(Boolean) as Metric[]

  return (
    <IntelligencePage>
      <IntelligenceHeader
        eyebrow="Dirección · Gestión comercial"
        title={`Oficina ${payload?.scopeLabel ?? ''}`}
        description="Metas, evolución, equipo, brechas operativas y acciones dentro del alcance autorizado."
        actions={[{ label: 'Asignar propiedades', href: '/dashboard/properties/admin', primary: true }, { label: 'Revisar valorizaciones', href: '/dashboard/valuations' }]}
        meta={<div className="flex items-center gap-2 border border-[var(--n3-line)] bg-[#0c1111] px-4 py-3 text-xs text-[var(--n3-text-muted)]"><BarChart3 size={15} />{payload?.periodLabel ?? 'Sin período'}</div>}
      />

      {loading ? <div className="border border-[var(--n3-line)] p-8 text-sm text-[var(--n3-text-muted)]">Cargando indicadores de oficina y equipo…</div> : null}
      {error ? <div className="border border-[#d7332b] p-5 text-sm text-[#ff766f]"><p>{error}</p><button onClick={() => void load()} className="mt-3 flex items-center gap-2 border border-[var(--n3-line)] px-3 py-2"><RefreshCw size={14} />Reintentar</button></div> : null}

      {!loading && !error && payload ? <>
        <section>
          <SectionHeading eyebrow="01 · Pulso de la oficina" title="Resultado contra meta" description="Junio y acumulado enero–junio. Cada indicador muestra objetivo, cumplimiento y variación mensual cuando existe base comparable." />
          <MetricGrid columns={4}>
            {headline.map((item) => {
              const trend = item.mom === null ? null : item.mom >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />
              return <MetricCard key={item.code} label={item.label} value={format(item)} detail={`${item.target === null ? 'Meta n/d' : `Meta ${item.target.toLocaleString('es-CL')}`} · ${item.compliance === null ? 'Cumpl. n/d' : `${item.compliance.toFixed(1)}%`} ${item.mom === null ? '' : `· MoM ${item.mom > 0 ? '+' : ''}${item.mom.toFixed(1)}%`}`} icon={trend} />
            })}
          </MetricGrid>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
          <EvolutionChart points={branch?.evolution ?? []} />
          <div className="border border-[var(--n3-line)] bg-[#0c1111] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Estado operativo</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="border border-[var(--n3-line)] p-4"><p className="text-2xl font-semibold">{payload.operational?.valuationInReview ?? 0}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Valorizaciones en revisión</p></div>
              <div className="border border-[var(--n3-line)] p-4"><p className="text-2xl font-semibold">{payload.operational?.activePropertyAssignments ?? 0}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Asignaciones activas</p></div>
              <div className="border border-[var(--n3-line)] p-4"><p className="text-2xl font-semibold">{payload.operational?.valuationDrafts ?? 0}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Borradores</p></div>
              <div className="border border-[var(--n3-line)] p-4"><p className="text-2xl font-semibold">{payload.alerts.length}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Brechas detectadas</p></div>
            </div>
          </div>
        </section>

        <section>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading eyebrow="02 · Equipo" title="Desempeño y brechas por ejecutiva" description="Ordena por gestión, cierres o mayor brecha para priorizar seguimiento." />
            <div className="flex gap-2 pb-5">{([['management', 'Gestión'], ['sales', 'Cierres'], ['gap', 'Mayor brecha']] as const).map(([value, label]) => <button key={value} onClick={() => setSort(value)} className={`border px-3 py-2 text-xs ${sort === value ? 'border-[#d7332b] text-white' : 'border-[var(--n3-line)] text-[var(--n3-text-muted)]'}`}>{label}</button>)}</div>
          </div>
          <div className="overflow-x-auto border border-[var(--n3-line)]">
            <table className="w-full min-w-[1180px] text-sm">
              <thead className="bg-[#080d0d] text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]"><tr><th className="px-4 py-3 text-left">Ejecutiva</th><th className="px-4 py-3 text-left">Clasificación</th><th className="px-4 py-3 text-right">Cierres / meta</th><th className="px-4 py-3 text-right">UF / meta</th><th className="px-4 py-3 text-right">Gestión</th><th className="px-4 py-3 text-right">Cartera</th><th className="px-4 py-3 text-right">Seguimiento</th><th className="px-4 py-3 text-right">Conversión</th><th className="px-4 py-3 text-right">Stock / meta</th></tr></thead>
              <tbody>{partners.map((entity) => {
                const sales = metric(entity, 'sales'); const salesUf = metric(entity, 'sales_uf'); const stock = metric(entity, 'stock')
                return <tr key={entity.id} className="border-t border-[var(--n3-line)] hover:bg-white/[0.02]"><td className="px-4 py-4 font-semibold">{entity.name}</td><td className="px-4 py-4 text-[var(--n3-text-muted)]">{entity.classification ?? 'Sin clasificación'}</td><td className={`px-4 py-4 text-right tabular-nums ${complianceTone(sales?.compliance ?? null)}`}>{sales?.value ?? 'n/d'} / {sales?.target ?? 'n/d'}<div className="text-[10px]">{sales?.compliance === null ? '' : `${sales.compliance.toFixed(0)}%`}</div></td><td className={`px-4 py-4 text-right tabular-nums ${complianceTone(salesUf?.compliance ?? null)}`}>{salesUf?.value?.toLocaleString('es-CL') ?? 'n/d'} / {salesUf?.target?.toLocaleString('es-CL') ?? 'n/d'}<div className="text-[10px]">{salesUf?.compliance === null ? '' : `${salesUf.compliance.toFixed(0)}%`}</div></td>{['management_score','portfolio_score','follow_up_score','conversion'].map((code) => <td key={code} className="px-4 py-4 text-right"><ScoreBadge value={metric(entity, code)?.value ?? null} /></td>)}<td className={`px-4 py-4 text-right tabular-nums ${complianceTone(stock?.compliance ?? null)}`}>{stock?.value ?? 'n/d'} / {stock?.target ?? 'n/d'}<div className="text-[10px]">{stock?.compliance === null ? '' : `${stock.compliance.toFixed(0)}%`}</div></td></tr>
              })}</tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div><SectionHeading eyebrow="03 · Prioridades" title="Brechas que requieren intervención" description="Combina scores bajo 70, metas comerciales en riesgo y cartera insuficiente." /><div className="space-y-3">{payload.alerts.slice(0, 16).map((alert) => <article key={alert.id} className={`border bg-[#0c1111] p-4 ${alert.severity === 'critical' ? 'border-[#d7332b]' : 'border-[#a77a22]'}`}><div className="flex gap-3"><AlertTriangle size={18} className={alert.severity === 'critical' ? 'text-[#ff766f]' : 'text-[#f6c453]'} /><div><p className="font-semibold">{alert.entityName} · {alert.title}</p><p className="mt-2 text-sm leading-6 text-[var(--n3-text-muted)]">{alert.detail}</p></div></div></article>)}</div></div>
          <div><SectionHeading eyebrow="04 · Acciones" title="Operación habilitada" description="Accesos sujetos a alcance RLS de la oficina." /><div className="divide-y divide-[var(--n3-line)] border border-[var(--n3-line)] bg-[#0c1111]">{payload.accesses?.map((access) => <Link key={access.href} href={access.href} className="group flex items-center gap-3 p-4 hover:bg-white/[0.03]"><div className="flex h-9 w-9 items-center justify-center border border-[var(--n3-line)] text-[#ff766f]">{access.permission === 'manage' ? <ShieldCheck size={17} /> : <ClipboardCheck size={17} />}</div><div className="min-w-0 flex-1"><p className="font-semibold">{access.label}</p><p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">{access.detail}</p></div><ArrowRight size={15} /></Link>)}</div></div>
        </section>

        <section><SectionHeading eyebrow="05 · Trazabilidad" title="Fuente, corte y alcance" /><MethodologyNote>{payload.dataProvenance} Generado {payload.generatedAt ? new Date(payload.generatedAt).toLocaleString('es-CL') : 'sin fecha disponible'}. La cuenta QA usa una identidad canónica de Lo Beltrán y no confirma el cargo real de esa persona.</MethodologyNote></section>
      </> : null}
    </IntelligencePage>
  )
}
