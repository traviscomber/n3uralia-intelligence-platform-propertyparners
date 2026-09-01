import Link from 'next/link'
import { AlertTriangle, CheckCircle2, ExternalLink, MapPinned, ShieldCheck, XCircle } from 'lucide-react'
import { MetricStrip, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import { requireAnyPageCapability } from '@/lib/access-guards'
import { createClient } from '@/lib/supabase/server'
import { reviewNeighborhoodAction } from './actions'

type QueueRow = {
  review_id: string | null
  source_listing_id: string
  raw_address: string | null
  title: string | null
  url: string | null
  classification: string | null
  proposed_neighborhood_id: string | null
  proposed_neighborhood_name: string | null
  resolution_kind: 'direct_kml' | 'unique_kml_candidate' | 'territorial_evidence' | 'manual'
  reason: string
  can_decide: boolean
  observed_at: string | null
}

function ActionButtons({ row }: { row: QueueRow }) {
  if (!row.can_decide || !row.review_id) return null
  return (
    <div className="flex flex-wrap gap-2">
      <form action={reviewNeighborhoodAction}>
        <input type="hidden" name="reviewId" value={row.review_id} />
        <input type="hidden" name="decision" value="accepted" />
        <button type="submit" className="inline-flex min-h-11 items-center gap-2 border border-[var(--n3-accent)] px-5 text-xs font-semibold text-[var(--n3-accent)] transition-colors hover:bg-[var(--n3-accent)] hover:text-[#081111]">
          <CheckCircle2 size={15} /> Aprobar
        </button>
      </form>
      <form action={reviewNeighborhoodAction}>
        <input type="hidden" name="reviewId" value={row.review_id} />
        <input type="hidden" name="decision" value="discarded" />
        <button type="submit" className="inline-flex min-h-11 items-center gap-2 border border-[#7d514d] px-5 text-xs font-semibold text-[#ff8d87] transition-colors hover:border-[#d7332b]">
          <XCircle size={15} /> Rechazar
        </button>
      </form>
    </div>
  )
}

function DecisionCard({ row, compact = false }: { row: QueueRow; compact?: boolean }) {
  const evidenceLabel = row.resolution_kind === 'direct_kml'
    ? 'Coincidencia KML directa'
    : row.resolution_kind === 'unique_kml_candidate'
      ? 'Único candidato KML'
      : row.resolution_kind === 'territorial_evidence'
        ? 'Evidencia territorial cruzada'
        : 'Revisión manual'

  return (
    <article className={`grid gap-4 py-5 ${compact ? 'lg:grid-cols-[minmax(0,1fr)_auto]' : 'lg:grid-cols-[minmax(0,1.35fr)_minmax(210px,0.55fr)_auto]'} lg:items-center`}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${row.can_decide ? 'text-[var(--n3-accent)]' : 'text-[#ff8d87]'}`}>{evidenceLabel}</span>
          {!row.can_decide ? <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-[#ff8d87]"><AlertTriangle size={12} /> Excepción</span> : null}
        </div>
        <p className="mt-2 text-sm font-medium leading-6 text-[var(--n3-text-light)]">{row.raw_address || row.title || 'Dirección no disponible'}</p>
        {row.title && row.raw_address ? <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{row.title}</p> : null}
        <p className="mt-2 max-w-3xl text-xs leading-5 text-[var(--n3-text-muted)]">{row.reason}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--n3-text-muted)]">
          <span>MLC-{row.source_listing_id}</span>
          {row.url ? <Link href={row.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-[var(--n3-accent)] hover:underline">Ver aviso <ExternalLink size={12} /></Link> : null}
        </div>
      </div>

      {!compact ? (
        <div className="border-l border-[var(--n3-line)] pl-4">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Barrio propuesto</p>
          <p className="mt-1 text-lg font-semibold text-[var(--n3-text-light)]">{row.proposed_neighborhood_name || '—'}</p>
          {row.can_decide ? <p className="mt-2 flex items-start gap-1 text-[11px] leading-4 text-[var(--n3-text-muted)]"><MapPinned size={12} className="mt-0.5 shrink-0" /> Evidencia suficiente para decisión ejecutiva.</p> : null}
        </div>
      ) : null}

      <div className="lg:justify-self-end">
        {row.can_decide ? <ActionButtons row={row} /> : <span className="inline-flex min-h-11 items-center border border-[#7d514d] px-3 text-xs text-[#ff8d87]">Requiere criterio humano</span>}
      </div>
    </article>
  )
}

export default async function NeighborhoodReviewPage() {
  await requireAnyPageCapability(['market.manage_sources', 'management.global.read'])
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_ceo_market_neighborhood_queue_v1')
  const rows = (data ?? []) as QueueRow[]
  const fastRows = rows.filter((row) => row.can_decide)
  const manualRows = rows.filter((row) => !row.can_decide)

  return (
    <WorkspaceShell>
      <WorkspaceHeader
        eyebrow="Mercado · Decisión CEO"
        title="Aprobar barrios pendientes"
        meta={`${fastRows.length} rápidos · ${manualRows.length} excepciones · ${rows.length} casas activas`}
        actions={[{ label: 'Volver a Mercado', href: '/dashboard/market' }]}
      />

      {error ? <div className="mt-5 border border-[#d7332b] bg-[#0c1111] p-4 text-sm text-[#ff766f]">No fue posible cargar la cola canónica de aprobación territorial.</div> : null}

      <MetricStrip items={[
        { label: 'Casas activas', value: rows.length.toLocaleString('es-CL') },
        { label: 'Listas para decidir', value: fastRows.length.toLocaleString('es-CL'), tone: 'success' },
        { label: 'Revisión manual', value: manualRows.length.toLocaleString('es-CL'), tone: manualRows.length ? 'warning' : 'default' },
        { label: 'Cobertura rápida', value: rows.length ? `${Math.round(fastRows.length / rows.length * 100)}%` : '—' },
      ]} />

      <section className="mt-6 border-y border-[var(--n3-line)] py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-[var(--n3-text-light)]">El CEO decide; el sistema prepara la evidencia.</p>
            <p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">La cola muestra sólo casas activas V1. Se eliminaron snapshots repetidos, departamentos y proyectos. Aprobar publica únicamente el barrio propuesto y deja trazabilidad; Rechazar conserva el inmueble sin barrio.</p>
          </div>
          <div className="inline-flex items-center gap-2 text-xs text-[var(--n3-text-muted)]"><ShieldCheck size={15} className="text-[var(--n3-accent)]" /> Aprobación protegida por AAL2</div>
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Decisiones rápidas</p>
            <h2 className="mt-1 text-lg font-medium text-[var(--n3-text-light)]">{fastRows.length} casas con evidencia suficiente</h2>
          </div>
          <p className="hidden text-xs text-[var(--n3-text-muted)] sm:block">Dirección · barrio · evidencia · Aprobar / Rechazar</p>
        </div>
        <div className="divide-y divide-[var(--n3-line)] border-t border-[var(--n3-line)]">
          {fastRows.map((row) => <DecisionCard key={row.source_listing_id} row={row} />)}
        </div>
      </section>

      {manualRows.length ? (
        <details className="mt-8 border-t border-[var(--n3-line)] pt-4">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-4 text-sm font-medium text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">
            <span>Excepciones que sí requieren revisión humana</span><span className="text-xs">{manualRows.length}</span>
          </summary>
          <div className="mt-2 divide-y divide-[var(--n3-line)]">{manualRows.map((row) => <DecisionCard key={row.source_listing_id} row={row} compact />)}</div>
        </details>
      ) : null}
    </WorkspaceShell>
  )
}
