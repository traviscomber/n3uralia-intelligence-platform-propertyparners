import Link from 'next/link'
import { AlertTriangle, CheckCircle2, ExternalLink, MapPinned, ShieldCheck, Wrench } from 'lucide-react'
import { MetricStrip, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import { requireAnyPageCapability } from '@/lib/access-guards'
import { createClient } from '@/lib/supabase/server'
import { correctNeighborhoodBatchAction, reviewNeighborhoodBatchAction } from './actions'

type ResolutionKind = 'accepted_memory' | 'point_in_kml' | 'direct_kml' | 'unique_kml_candidate' | 'validated_rule' | 'cbrs_street_consensus' | 'territorial_evidence' | 'manual' | string

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
  resolution_kind: ResolutionKind
  eligible_count: number
  conflict_count: number
}

type ConflictRow = {
  review_id: string
  source_listing_id: string
  raw_address?: string | null
  canonical_neighborhood_name: string | null
  proposed_neighborhood_name: string | null
  resolution_kind: ResolutionKind
  correction_ready: boolean
  correction_reason: string | null
}

const RESOLUTION_LABELS: Record<string, string> = {
  accepted_memory: 'Memoria aceptada',
  point_in_kml: 'Punto dentro de KML',
  direct_kml: 'Coincidencia KML directa',
  unique_kml_candidate: 'Único candidato KML',
  validated_rule: 'Regla territorial validada',
  cbrs_street_consensus: 'Consenso histórico CBRS',
  territorial_evidence: 'Evidencia territorial cruzada',
  manual: 'Revisión manual',
}

function evidenceLabel(kind: ResolutionKind) {
  return RESOLUTION_LABELS[kind] ?? 'Evidencia territorial'
}

function DecisionCard({ row, conflict }: { row: QueueRow; conflict?: ConflictRow }) {
  return (
    <article className="grid gap-4 py-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(210px,0.5fr)] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${conflict ? 'text-[#ff8d87]' : 'text-[var(--n3-accent)]'}`}>{evidenceLabel(row.resolution_kind)}</span>
          {conflict ? <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-[#ff8d87]"><AlertTriangle size={12} /> Corrección canónica</span> : null}
        </div>
        <p className="mt-2 text-sm font-medium leading-6 text-[var(--n3-text-light)]">{row.raw_address || row.title || 'Dirección no disponible'}</p>
        {row.title && row.raw_address ? <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{row.title}</p> : null}
        <p className="mt-2 max-w-3xl text-xs leading-5 text-[var(--n3-text-muted)]">{conflict?.correction_reason || row.reason}</p>
        {conflict ? <p className="mt-2 text-xs leading-5 text-[#ff8d87]">Canónico actual: {conflict.canonical_neighborhood_name || '—'} · Corrección verificada: {conflict.proposed_neighborhood_name || '—'}.</p> : null}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--n3-text-muted)]">
          <span>MLC-{row.source_listing_id}</span>
          {row.url ? <Link href={row.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-[var(--n3-accent)] hover:underline">Ver aviso <ExternalLink size={12} /></Link> : null}
        </div>
      </div>

      <div className="border-l border-[var(--n3-line)] pl-4">
        <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Barrio propuesto</p>
        <p className="mt-1 text-lg font-semibold text-[var(--n3-text-light)]">{row.proposed_neighborhood_name || '—'}</p>
        <p className="mt-2 flex items-start gap-1 text-[11px] leading-4 text-[var(--n3-text-muted)]"><MapPinned size={12} className="mt-0.5 shrink-0" /> {conflict ? 'Evidencia suficiente para corregir el dato canónico.' : 'Evidencia suficiente para decisión ejecutiva.'}</p>
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
  const batchEligible = batches.reduce((sum, row) => sum + Number(row.eligible_count || 0), 0)
  const correctionRows = conflicts.filter((row) => row.correction_ready)
  const unresolvedConflictRows = conflicts.filter((row) => !row.correction_ready)
  const cleanRows = rows.filter((row) => row.can_decide && !conflictByListing.has(row.source_listing_id))
  const conflictQueueRows = rows.filter((row) => conflictByListing.has(row.source_listing_id))
  const decisions = (batchEligible > 0 ? 1 : 0) + (correctionRows.length > 0 ? 1 : 0) + unresolvedConflictRows.length
  const errors = [queueResult.error, batchResult.error, conflictResult.error].filter(Boolean)

  return (
    <WorkspaceShell>
      <WorkspaceHeader
        eyebrow="Mercado · Decisión CEO"
        title="Resolver barrios pendientes"
        meta={`${rows.length} casas · ${decisions} decisiones ejecutivas`}
        actions={[{ label: 'Volver a Mercado', href: '/dashboard/market' }]}
      />

      {errors.length ? <div className="mt-5 border border-[#d7332b] bg-[#0c1111] p-4 text-sm text-[#ff766f]">No fue posible cargar toda la cola canónica de aprobación territorial.</div> : null}

      <MetricStrip items={[
        { label: 'Pendientes', value: rows.length.toLocaleString('es-CL') },
        { label: 'Recomendaciones seguras', value: batchEligible.toLocaleString('es-CL'), tone: 'success' },
        { label: 'Correcciones verificadas', value: correctionRows.length.toLocaleString('es-CL'), tone: correctionRows.length ? 'warning' : 'default' },
        { label: 'Decisiones CEO', value: decisions.toLocaleString('es-CL') },
      ]} />

      <section className="mt-6 border-y border-[var(--n3-line)] py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-[var(--n3-text-light)]">Resolver v2: automatiza evidencia; no automatiza la decisión.</p>
            <p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">El motor intenta, en orden, memoria previamente aceptada, evidencia territorial verificada, coordenada dentro del KML, nombre KML canónico, reglas territoriales reutilizables y consenso CBRS. Si las evidencias fuertes divergen, el caso no se recomienda. Toda escritura ejecutiva exige CEO/admin + AAL2.</p>
          </div>
          <div className="inline-flex items-center gap-2 text-xs text-[var(--n3-text-muted)]"><ShieldCheck size={15} className="text-[var(--n3-accent)]" /> Transaccional y auditado</div>
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Decisiones ejecutivas</p>
          <h2 className="mt-1 text-lg font-medium text-[var(--n3-text-light)]">{decisions} acciones para cerrar {rows.length} casas</h2>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <article className="border border-[var(--n3-line)] p-5">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">1 · Recomendaciones sin conflicto</p>
            <p className="mt-2 text-4xl font-medium text-[var(--n3-text-light)]">{batchEligible}</p>
            <p className="mt-2 text-sm font-medium text-[var(--n3-text-light)]">Aprobar todas las recomendaciones seguras</p>
            <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">El backend revalida cada casa y excluye cualquier conflicto canónico. Si una evidencia cambia durante la operación, el lote falla completo.</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--n3-text-muted)]">
              {batches.filter((batch) => batch.eligible_count > 0).map((batch) => <span key={batch.resolution_kind}>{evidenceLabel(batch.resolution_kind)}: {batch.eligible_count}</span>)}
            </div>
            {batchEligible > 0 ? (
              <form action={reviewNeighborhoodBatchAction} className="mt-5">
                <input type="hidden" name="resolutionKind" value="all" />
                <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center gap-2 border border-[var(--n3-accent)] px-4 text-xs font-semibold text-[var(--n3-accent)] transition-colors hover:bg-[var(--n3-accent)] hover:text-[#081111]">
                  <CheckCircle2 size={15} /> Aprobar {batchEligible}
                </button>
              </form>
            ) : <p className="mt-5 text-xs text-[var(--n3-text-muted)]">No quedan recomendaciones seguras pendientes.</p>}
          </article>

          <article className="border border-[var(--n3-line)] p-5">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[#f0c96a]">2 · Corrección canónica verificada</p>
            <p className="mt-2 text-4xl font-medium text-[var(--n3-text-light)]">{correctionRows.length}</p>
            <p className="mt-2 text-sm font-medium text-[var(--n3-text-light)]">Corregir barrios canónicos con evidencia convergente</p>
            <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">Sólo incluye propiedades donde el barrio cargado contradice KML + evidencia independiente. El backend bloquea cualquier caso cuyo dato haya cambiado desde la revisión.</p>
            {correctionRows.length > 0 ? (
              <form action={correctNeighborhoodBatchAction} className="mt-5">
                <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center gap-2 border border-[#8d7440] px-4 text-xs font-semibold text-[#f0c96a] transition-colors hover:bg-[#f0c96a] hover:text-[#081111]">
                  <Wrench size={15} /> Corregir {correctionRows.length}
                </button>
              </form>
            ) : <p className="mt-5 text-xs text-[var(--n3-text-muted)]">No quedan correcciones canónicas verificadas.</p>}
          </article>
        </div>
      </section>

      {unresolvedConflictRows.length ? (
        <section className="mt-8 border-t border-[#7d514d] pt-4">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[#ff8d87]">Excepciones reales</p>
          <h2 className="mt-1 text-lg font-medium text-[var(--n3-text-light)]">{unresolvedConflictRows.length} conflictos aún sin evidencia suficiente</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--n3-text-muted)]">Estos casos quedan fuera de cualquier lote y requieren nueva evidencia antes de poder corregirse.</p>
        </section>
      ) : null}

      {conflictQueueRows.length ? (
        <details className="mt-8 border-t border-[var(--n3-line)] pt-4">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-4 text-sm font-medium text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">
            <span>Ver las {conflictQueueRows.length} correcciones canónicas</span><span className="text-xs">Evidencia</span>
          </summary>
          <div className="mt-2 divide-y divide-[var(--n3-line)]">{conflictQueueRows.map((row) => <DecisionCard key={row.source_listing_id} row={row} conflict={conflictByListing.get(row.source_listing_id)} />)}</div>
        </details>
      ) : null}

      <details className="mt-5 border-t border-[var(--n3-line)] pt-4">
        <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-4 text-sm font-medium text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">
          <span>Ver detalle de las {cleanRows.length} recomendaciones seguras</span><span className="text-xs">Auditoría</span>
        </summary>
        <div className="mt-2 divide-y divide-[var(--n3-line)]">{cleanRows.map((row) => <DecisionCard key={row.source_listing_id} row={row} />)}</div>
      </details>
    </WorkspaceShell>
  )
}
