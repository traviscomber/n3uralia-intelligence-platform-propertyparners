import Link from 'next/link'
import { AlertTriangle, CheckCircle2, ExternalLink, MapPinned, ShieldCheck, XCircle } from 'lucide-react'
import { MetricStrip, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import { requireAnyPageCapability } from '@/lib/access-guards'
import { createClient } from '@/lib/supabase/server'
import { reviewNeighborhoodAction, reviewNeighborhoodBatchAction } from './actions'

type ResolutionKind = 'direct_kml' | 'unique_kml_candidate' | 'territorial_evidence' | 'manual'

type QueueRow = {
  review_id: string | null
  source_listing_id: string
  raw_address: string | null
  title: string | null
  url: string | null
  classification: string | null
  proposed_neighborhood_id: string | null
  proposed_neighborhood_name: string | null
  resolution_kind: ResolutionKind
  reason: string
  can_decide: boolean
  observed_at: string | null
}

type BatchSummary = {
  resolution_kind: Exclude<ResolutionKind, 'manual'>
  eligible_count: number
  conflict_count: number
}

type ConflictRow = {
  review_id: string
  source_listing_id: string
  canonical_neighborhood_name: string | null
  proposed_neighborhood_name: string | null
}

const BATCH_LABELS: Record<Exclude<ResolutionKind, 'manual'>, { title: string; detail: string }> = {
  direct_kml: { title: 'Coincidencia KML directa', detail: 'Barrio explícito y validado contra el KML canónico.' },
  unique_kml_candidate: { title: 'Único candidato KML', detail: 'El aviso contiene varios términos, pero sólo uno corresponde a un barrio KML válido.' },
  territorial_evidence: { title: 'Evidencia territorial cruzada', detail: 'KML + CBRS + fuentes públicas/Portal convergen en un único barrio.' },
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

function DecisionCard({ row, conflict }: { row: QueueRow; conflict?: ConflictRow }) {
  const evidenceLabel = row.resolution_kind === 'direct_kml'
    ? 'Coincidencia KML directa'
    : row.resolution_kind === 'unique_kml_candidate'
      ? 'Único candidato KML'
      : row.resolution_kind === 'territorial_evidence'
        ? 'Evidencia territorial cruzada'
        : 'Revisión manual'

  return (
    <article className="grid gap-4 py-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(210px,0.55fr)_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${conflict ? 'text-[#ff8d87]' : 'text-[var(--n3-accent)]'}`}>{evidenceLabel}</span>
          {conflict ? <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-[#ff8d87]"><AlertTriangle size={12} /> Conflicto canónico</span> : null}
        </div>
        <p className="mt-2 text-sm font-medium leading-6 text-[var(--n3-text-light)]">{row.raw_address || row.title || 'Dirección no disponible'}</p>
        {row.title && row.raw_address ? <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{row.title}</p> : null}
        <p className="mt-2 max-w-3xl text-xs leading-5 text-[var(--n3-text-muted)]">{row.reason}</p>
        {conflict ? <p className="mt-2 text-xs leading-5 text-[#ff8d87]">Canónico actual: {conflict.canonical_neighborhood_name || '—'} · Evidencia nueva: {conflict.proposed_neighborhood_name || '—'}. No entra en aprobación masiva.</p> : null}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--n3-text-muted)]">
          <span>MLC-{row.source_listing_id}</span>
          {row.url ? <Link href={row.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-[var(--n3-accent)] hover:underline">Ver aviso <ExternalLink size={12} /></Link> : null}
        </div>
      </div>

      <div className="border-l border-[var(--n3-line)] pl-4">
        <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Barrio propuesto</p>
        <p className="mt-1 text-lg font-semibold text-[var(--n3-text-light)]">{row.proposed_neighborhood_name || '—'}</p>
        {!conflict ? <p className="mt-2 flex items-start gap-1 text-[11px] leading-4 text-[var(--n3-text-muted)]"><MapPinned size={12} className="mt-0.5 shrink-0" /> Evidencia suficiente para decisión ejecutiva.</p> : null}
      </div>

      <div className="lg:justify-self-end">
        {conflict ? <span className="inline-flex min-h-11 items-center border border-[#7d514d] px-3 text-xs text-[#ff8d87]">Requiere corrección territorial</span> : <ActionButtons row={row} />}
      </div>
    </article>
  )
}

export default async function NeighborhoodReviewPage() {
  await requireAnyPageCapability(['market.manage_sources', 'management.global.read'])
  const supabase = await createClient()
  const [queueResult, batchResult, conflictResult] = await Promise.all([
    supabase.rpc('get_ceo_market_neighborhood_queue_v1'),
    supabase.rpc('get_ceo_market_neighborhood_batch_summary_v1'),
    supabase.rpc('get_ceo_market_neighborhood_conflicts_v1'),
  ])

  const rows = (queueResult.data ?? []) as QueueRow[]
  const batches = (batchResult.data ?? []) as BatchSummary[]
  const conflicts = (conflictResult.data ?? []) as ConflictRow[]
  const conflictByListing = new Map(conflicts.map((row) => [row.source_listing_id, row]))
  const batchEligible = batches.reduce((sum, row) => sum + row.eligible_count, 0)
  const cleanRows = rows.filter((row) => row.can_decide && !conflictByListing.has(row.source_listing_id))
  const conflictRows = rows.filter((row) => conflictByListing.has(row.source_listing_id))
  const errors = [queueResult.error, batchResult.error, conflictResult.error].filter(Boolean)

  return (
    <WorkspaceShell>
      <WorkspaceHeader
        eyebrow="Mercado · Decisión CEO"
        title="Aprobar barrios pendientes"
        meta={`${batchEligible} agrupados · ${conflictRows.length} correcciones · ${rows.length} casas activas`}
        actions={[{ label: 'Volver a Mercado', href: '/dashboard/market' }]}
      />

      {errors.length ? <div className="mt-5 border border-[#d7332b] bg-[#0c1111] p-4 text-sm text-[#ff766f]">No fue posible cargar toda la cola canónica de aprobación territorial.</div> : null}

      <MetricStrip items={[
        { label: 'Casas activas', value: rows.length.toLocaleString('es-CL') },
        { label: 'Aprobables en lote', value: batchEligible.toLocaleString('es-CL'), tone: 'success' },
        { label: 'Conflictos canónicos', value: conflictRows.length.toLocaleString('es-CL'), tone: conflictRows.length ? 'warning' : 'default' },
        { label: 'Decisiones CEO', value: (batches.filter((row) => row.eligible_count > 0).length + conflictRows.length).toLocaleString('es-CL') },
      ]} />

      <section className="mt-6 border-y border-[var(--n3-line)] py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-[var(--n3-text-light)]">El CEO decide por lote; el sistema valida cada inmueble.</p>
            <p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">Cada lote es transaccional: sólo incluye recomendaciones sin conflicto canónico, revalida la evidencia y exige AAL2. Si un registro falla, no se aprueba parcialmente.</p>
          </div>
          <div className="inline-flex items-center gap-2 text-xs text-[var(--n3-text-muted)]"><ShieldCheck size={15} className="text-[var(--n3-accent)]" /> CEO/admin + AAL2</div>
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Aprobación masiva</p>
          <h2 className="mt-1 text-lg font-medium text-[var(--n3-text-light)]">{batchEligible} recomendaciones en {batches.filter((row) => row.eligible_count > 0).length} decisiones</h2>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {batches.filter((batch) => batch.eligible_count > 0).map((batch) => {
            const copy = BATCH_LABELS[batch.resolution_kind]
            return (
              <article key={batch.resolution_kind} className="border border-[var(--n3-line)] p-4">
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{copy.title}</p>
                <p className="mt-2 text-3xl font-medium text-[var(--n3-text-light)]">{batch.eligible_count}</p>
                <p className="mt-2 min-h-10 text-xs leading-5 text-[var(--n3-text-muted)]">{copy.detail}</p>
                {batch.conflict_count ? <p className="mt-2 text-[11px] text-[#ff8d87]">{batch.conflict_count} conflicto(s) excluidos automáticamente.</p> : null}
                <form action={reviewNeighborhoodBatchAction} className="mt-4">
                  <input type="hidden" name="resolutionKind" value={batch.resolution_kind} />
                  <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center gap-2 border border-[var(--n3-accent)] px-4 text-xs font-semibold text-[var(--n3-accent)] transition-colors hover:bg-[var(--n3-accent)] hover:text-[#081111]">
                    <CheckCircle2 size={15} /> Aprobar {batch.eligible_count}
                  </button>
                </form>
              </article>
            )
          })}
        </div>
      </section>

      {conflictRows.length ? (
        <section className="mt-8">
          <div className="mb-3">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#ff8d87]">Corrección territorial</p>
            <h2 className="mt-1 text-lg font-medium text-[var(--n3-text-light)]">{conflictRows.length} casos fuera de cualquier lote</h2>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--n3-text-muted)]">El inmueble ya tiene un barrio canónico distinto. No se sobrescribe automáticamente: primero debe corregirse esa contradicción.</p>
          </div>
          <div className="divide-y divide-[var(--n3-line)] border-t border-[var(--n3-line)]">
            {conflictRows.map((row) => <DecisionCard key={row.source_listing_id} row={row} conflict={conflictByListing.get(row.source_listing_id)} />)}
          </div>
        </section>
      ) : null}

      <details className="mt-8 border-t border-[var(--n3-line)] pt-4">
        <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-4 text-sm font-medium text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">
          <span>Ver detalle de las {cleanRows.length} recomendaciones agrupadas</span><span className="text-xs">Auditoría</span>
        </summary>
        <div className="mt-2 divide-y divide-[var(--n3-line)]">{cleanRows.map((row) => <DecisionCard key={row.source_listing_id} row={row} />)}</div>
      </details>
    </WorkspaceShell>
  )
}
