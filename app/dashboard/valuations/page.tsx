'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, RefreshCw } from 'lucide-react'
import { MetricStrip, WorkspaceField, WorkspaceHeader, WorkspaceSelect, WorkspaceShell } from '@/components/ui/workspace'
import { OperationalState } from '@/components/ui/operational-state'

type ValuationCase = {
  id: string
  status: string
  address: string | null
  neighborhood: string | null
  property_type: string | null
  estimated_value_uf: number | null
  confidence: string | null
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

  const nextReview = cases.find((item) => item.status === 'review')
  const nextDraft = cases.find((item) => item.status === 'draft')
  const actionCount = counts.review + counts.draft
  const actionMetrics = [
    ...(counts.review > 0 ? [{ label: 'En revisión', value: counts.review, tone: 'warning' as const }] : []),
    ...(counts.draft > 0 ? [{ label: 'Borradores', value: counts.draft }] : []),
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
      ) : null}

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
                  <p className="mt-1 break-words text-xs text-[var(--n3-text-muted)] sm:truncate">{item.neighborhood || 'Sin barrio'} · {item.property_type || 'Sin tipo'}</p>
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
    </WorkspaceShell>
  )
}
