'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, RefreshCw } from 'lucide-react'
import { DataStatusBar, MetricStrip, WorkspaceField, WorkspaceHeader, WorkspaceSelect, WorkspaceShell } from '@/components/ui/workspace'
import { OperationalState } from '@/components/ui/operational-state'

type ValuationCase = {
  id: string
  status: string
  address: string | null
  neighborhood: string | null
  property_type: string | null
  estimated_value_uf: number | null
  confidence: string | null
  subject_property_id: string | null
  condition_status: string | null
  condition_score: number | null
  warnings: string[] | null
  accepted_comparable_count: number
  uat_readiness: {
    ready: boolean
    stage: 'not_ready' | 'review_ready' | 'approved' | 'issued'
    blockers: string[]
  }
  updated_at: string
}

type Payload = { cases: ValuationCase[]; error?: string }

const money = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })
const statusLabels: Record<string, string> = { draft: 'Borrador', review: 'En revisión', approved: 'Aprobada', issued: 'Emitida' }
const allowedStatuses = new Set(['all', 'draft', 'review', 'approved', 'issued'])

export default function ValuationRegistryPage() {
  const [cases, setCases] = useState<ValuationCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/valuation/cases', { cache: 'no-store' })
      const payload = await response.json() as Payload
      if (!response.ok) throw new Error(payload.error || 'No fue posible cargar las valorizaciones')
      setCases(payload.cases || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de carga')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('status')
    if (requested && allowedStatuses.has(requested)) setStatus(requested)
    void load()
  }, [])

  const counts = useMemo(() => ({
    draft: cases.filter((item) => item.status === 'draft').length,
    review: cases.filter((item) => item.status === 'review').length,
    approved: cases.filter((item) => item.status === 'approved').length,
    issued: cases.filter((item) => item.status === 'issued').length,
  }), [cases])

  const filtered = useMemo(() => cases.filter((item) => {
    const text = `${item.address || ''} ${item.neighborhood || ''} ${item.property_type || ''} ${item.id}`.toLowerCase()
    return (status === 'all' || item.status === status) && text.includes(query.trim().toLowerCase())
  }), [cases, query, status])

  const uatReadyReview = cases.find((item) => item.status === 'review' && item.uat_readiness?.ready)
  const nextReview = uatReadyReview
  const nextDraft = cases.find((item) => item.status === 'draft' && item.uat_readiness?.ready)
  const uatReadyCount = cases.filter((item) => item.uat_readiness?.ready).length
  const reviewBlockedCount = cases.filter((item) => item.status === 'review' && !item.uat_readiness?.ready).length
  const unlinkedCount = cases.filter((item) => !item.subject_property_id).length
  const conditionBlockedCount = cases.filter((item) => item.condition_status === 'not_evaluable').length
  const actionCount = counts.review + counts.draft + unlinkedCount + conditionBlockedCount
  const actionMetrics = [
    { label: 'Listas para UAT', value: uatReadyCount, tone: uatReadyCount ? 'success' as const : 'warning' as const },
    ...(reviewBlockedCount > 0 ? [{ label: 'Review no apta UAT', value: reviewBlockedCount, tone: 'warning' as const }] : []),
    ...(counts.review > 0 ? [{ label: 'En revisión', value: counts.review }] : []),
    ...(counts.draft > 0 ? [{ label: 'Borradores', value: counts.draft }] : []),
    ...(unlinkedCount > 0 ? [{ label: 'Sin vínculo', value: unlinkedCount, tone: 'warning' as const }] : []),
    ...(conditionBlockedCount > 0 ? [{ label: 'Estado no evaluable', value: conditionBlockedCount, tone: 'danger' as const }] : []),
    { label: 'Aprobadas', value: counts.approved },
    { label: 'Emitidas', value: counts.issued, tone: counts.issued ? 'success' as const : 'default' as const },
  ]

  if (loading && cases.length === 0) {
    return <WorkspaceShell><OperationalState kind="loading" title="Cargando valorizaciones" description="Consultando expedientes, estados y valores autorizados." /></WorkspaceShell>
  }

  if (error && cases.length === 0) {
    return <WorkspaceShell><OperationalState kind="error" title="No fue posible consultar valorizaciones" description={error}><button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center gap-2 border border-[var(--n3-line)] px-4 text-sm font-semibold"><RefreshCw className="h-4 w-4" />Reintentar</button></OperationalState></WorkspaceShell>
  }

  return (
    <WorkspaceShell>
      <WorkspaceHeader
        eyebrow="Valorizaciones · Casas V1"
        title="Qué necesita avanzar"
        meta={actionCount > 0 ? `${actionCount} requieren acción` : undefined}
        actions={[
          { label: '', onClick: () => void load(), disabled: loading, icon: <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />, ariaLabel: 'Actualizar valorizaciones' },
          { label: 'Nueva valorización', href: '/dashboard/valuation', primary: true, icon: <Plus className="h-4 w-4" /> },
        ]}
      />

      {error ? <div role="alert" className="mt-4 border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-200">No se pudo actualizar. Se mantienen los últimos datos visibles. {error}</div> : null}

      <MetricStrip items={actionMetrics} />

      {nextReview || nextDraft ? (
        <section className="mt-7 max-w-5xl">
          <div className="border-b border-[var(--n3-line)] pb-2">
            <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Siguiente acción</h2>
          </div>
          <div className="divide-y divide-[var(--n3-line)]">
            {nextReview ? (
              <Link href={`/dashboard/valuations/${nextReview.id}`} className="grid min-h-20 gap-3 py-4 hover:bg-white/[0.02] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Revisar valorización</p>
                  <p className="mt-1 break-words text-sm text-[var(--n3-text-muted)]">{nextReview.address || 'Propiedad sin dirección'}{nextReview.neighborhood ? ` · ${nextReview.neighborhood}` : ''}</p>
                </div>
                <span className="text-xs font-semibold text-[var(--n3-teal-soft)]">Revisar ahora</span>
              </Link>
            ) : nextDraft ? (
              <Link href={`/dashboard/valuations/${nextDraft.id}`} className="grid min-h-20 gap-3 py-4 hover:bg-white/[0.02] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Completar borrador</p>
                  <p className="mt-1 break-words text-sm text-[var(--n3-text-muted)]">{nextDraft.address || 'Propiedad sin dirección'}{nextDraft.neighborhood ? ` · ${nextDraft.neighborhood}` : ''}</p>
                </div>
                <span className="text-xs font-semibold text-[var(--n3-teal-soft)]">Completar borrador</span>
              </Link>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="mt-7 max-w-5xl border-y border-[var(--n3-line)] py-5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Siguiente acción UAT</p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">Preparar un caso canónico desde una Ficha 360</p>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--n3-text-muted)]">Los expedientes históricos en revisión no cumplen el ciclo UAT actual. El caso debe estar vinculado a una propiedad, tener condición evaluable y al menos 3 comparables aceptados.</p>
            </div>
            <Link href="/dashboard/properties/prospects" className="inline-flex min-h-11 shrink-0 items-center justify-center border border-[var(--n3-line)] px-4 text-xs font-semibold hover:border-[#d7332b]">Abrir prospección</Link>
          </div>
        </section>
      )}

      <details className="mt-9 border-t border-[var(--n3-line)] pt-4">
        <summary className="flex min-h-11 cursor-pointer items-center text-xs font-medium text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">
          Ver todas las valorizaciones ({cases.length})
        </summary>
        <div className="mt-5">
          <div className="flex flex-col gap-3 border-y border-[var(--n3-line)] py-3 md:flex-row">
            <WorkspaceField value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar dirección o barrio" aria-label="Buscar valorizaciones" className="min-w-0 flex-1" />
            <WorkspaceSelect value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filtrar por estado">
              <option value="all">Todos los estados</option>
              <option value="draft">Borrador</option>
              <option value="review">En revisión</option>
              <option value="approved">Aprobada</option>
              <option value="issued">Emitida</option>
            </WorkspaceSelect>
          </div>

          <div className="divide-y divide-[var(--n3-line)]">
            {filtered.map((item) => (
              <Link key={item.id} href={`/dashboard/valuations/${item.id}`} className="grid gap-2 py-4 hover:bg-white/[0.02] sm:grid-cols-[minmax(0,1fr)_120px_140px_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium sm:truncate">{item.address || 'Sin dirección'}</p>
                  <p className="mt-1 break-words text-xs text-[var(--n3-text-muted)] sm:truncate">{item.neighborhood || 'Sin barrio'} · {item.property_type || 'Sin tipo'} · {item.accepted_comparable_count ?? 0} comparables aceptados</p>
                  <p className={`mt-1 text-[11px] ${item.uat_readiness?.ready ? 'text-[#9fd0c8]' : 'text-[#f0c96a]'}`}>{item.uat_readiness?.ready ? 'Apto para ciclo UAT actual' : `No apto UAT · ${item.uat_readiness?.blockers?.join(' · ') || 'evidencia insuficiente'}`}</p>
                </div>
                <span className="text-xs uppercase tracking-wide text-[var(--n3-text-muted)]">{statusLabels[item.status] || item.status}</span>
                <span className="text-sm font-medium tabular-nums">{item.estimated_value_uf == null ? '—' : `${money.format(item.estimated_value_uf)} UF`}</span>
                <span className="text-xs text-[var(--n3-text-muted)]">{new Date(item.updated_at).toLocaleDateString('es-CL')}</span>
              </Link>
            ))}
            {!loading && !filtered.length ? <div className="py-8 text-sm text-[var(--n3-text-muted)]">Sin valorizaciones para este filtro.</div> : null}
          </div>
        </div>
      </details>

      <DataStatusBar
        cutoff={cases.length ? new Date(cases[0].updated_at).toLocaleString('es-CL') : '—'}
        coverage={`${uatReadyCount} de ${cases.length} expedientes aptos para el ciclo UAT actual`}
        issues={cases.length - uatReadyCount}
        status={uatReadyCount > 0 ? 'ready' : cases.length ? 'partial' : 'blocked'}
      />
    </WorkspaceShell>
  )
}
