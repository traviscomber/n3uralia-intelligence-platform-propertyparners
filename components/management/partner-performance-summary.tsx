'use client'

import { useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'

type Metric = {
  code: string
  label: string
  unit: 'count' | 'uf' | 'percent' | 'days' | 'score'
  value: number | null
  target: number | null
  compliance: number | null
  mom: number | null
  yoy?: number | null
  periodStart?: string
  periodEnd?: string
  sourceName?: string
  sourceReference?: string | null
  qualityStatus?: string
}

type Entity = {
  id: string
  name: string
  entityType: string
  metrics: Metric[]
}

type Payload = {
  scopeLabel: string
  entities: Entity[]
  periodLabel: string
  generatedAt?: string
  dataProvenance?: string
  dataLayers?: { latestApprovedPeriodEnd?: string | null }
}

const fmt = (metric?: Metric) => {
  if (!metric || metric.value == null) return 'N/D'
  if (metric.unit === 'uf') return `${metric.value.toLocaleString('es-CL', { maximumFractionDigits: 0 })} UF`
  if (metric.unit === 'percent') return `${metric.value.toLocaleString('es-CL', { maximumFractionDigits: 1 })}%`
  return metric.value.toLocaleString('es-CL', { maximumFractionDigits: 1 })
}

export function PartnerPerformanceSummary() {
  const [payload, setPayload] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/management/summary', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No fue posible cargar el desempeño personal.')
      setPayload(data)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible cargar el desempeño personal.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const partner = payload?.entities.find((item) => item.entityType === 'partner')
  const metrics = useMemo(() => new Map((partner?.metrics ?? []).map((item) => [item.code, item])), [partner])
  const cards = [
    ['Cierres del período', metrics.get('sales') ?? metrics.get('management_credited_sales')],
    ['UF del período', metrics.get('sales_uf') ?? metrics.get('management_credited_sales_uf')],
    ['Captaciones', metrics.get('captations')],
    ['Leads activos', metrics.get('active_leads_snapshot') ?? metrics.get('active_leads')],
    ['Visitas agendadas', metrics.get('scheduled_visits')],
    ['Visitas realizadas', metrics.get('realized_visits')],
  ] as const
  const hasNominalMetrics = cards.some(([, item]) => item?.value != null)

  return <section className="mx-auto mt-8 max-w-7xl space-y-5">
    <div className="border-b border-[var(--n3-line)] pb-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--n3-teal-soft)]">Desempeño personal</p>
      <h1 className="mt-2 text-2xl font-semibold">Corte canónico vigente</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">
        {payload?.scopeLabel ?? 'Partner'} · {payload?.periodLabel ?? 'Cargando período…'}
      </p>
    </div>

    {loading ? <div role="status" aria-busy="true" className="border border-[var(--n3-line)] p-6 text-sm text-[var(--n3-text-muted)]">Cargando datos canónicos…</div> : null}
    {error ? <div role="alert" className="border border-[#d7332b] p-5 text-sm text-[#ff766f]"><p>{error}</p><button onClick={() => void load()} className="mt-3 inline-flex items-center gap-2 border border-[var(--n3-line)] px-3 py-2 text-xs"><RefreshCw size={14}/>Reintentar</button></div> : null}

    {!loading && payload && !hasNominalMetrics ? <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-6">
      <p className="text-sm font-semibold">Septiembre 2026 está actualizado a nivel compañía y oficina.</p>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">
        Este perfil no tiene todavía métricas nominales de septiembre aprobadas y vinculadas de forma inequívoca. No se muestran valores heredados de junio ni se infieren resultados desde la oficina.
      </p>
    </div> : null}

    {!loading && payload && hasNominalMetrics ? <div className="grid gap-px bg-[var(--n3-line)] sm:grid-cols-2 xl:grid-cols-3">
      {cards.map(([label, item]) => <article key={label} className="bg-[var(--n3-deep)] p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">{label}</p>
        <p className="mt-3 text-2xl font-semibold">{fmt(item)}</p>
        <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">
          {item?.periodEnd ? `Corte ${item.periodEnd}` : payload.periodLabel}
        </p>
      </article>)}
    </div> : null}

    {!loading && payload ? <details className="border-t border-[var(--n3-line)] pt-4">
      <summary className="cursor-pointer text-xs font-medium text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">Ver fuente y alcance</summary>
      <div className="mt-4 text-xs leading-5 text-[var(--n3-text-muted)]">
        <p>{payload.dataProvenance ?? 'Datos canónicos vigentes.'}</p>
        <p className="mt-2">Regla: no se heredan métricas de períodos anteriores para completar un corte nominal faltante.</p>
      </div>
    </details> : null}
  </section>
}
