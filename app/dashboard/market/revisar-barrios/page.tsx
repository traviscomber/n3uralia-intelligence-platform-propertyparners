import Link from 'next/link'
import { AlertTriangle, CheckCircle2, ExternalLink, MapPinned, ShieldCheck, XCircle } from 'lucide-react'
import { MetricStrip, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import { requireAnyPageCapability } from '@/lib/access-guards'
import { createClient } from '@/lib/supabase/server'
import { reviewNeighborhoodAction } from './actions'

type ReviewRow = {
  id: string
  classification: 'clear' | 'ambiguous' | 'no_match'
  candidate_neighborhoods: string[]
  decision: 'pending' | 'accepted' | 'discarded'
  reviewed_at: string | null
  evidence: {
    method?: string
    reason?: string
    property_id?: string
    scope?: string
  } | null
  listing: {
    source_listing_id: string
    raw_address: string | null
    title: string | null
    url: string | null
  }
  neighborhood: { name: string } | null
  assessment: {
    confidence_score: number
    review_priority: 'approve_recommended' | 'quick_review' | 'mandatory_review'
    geometry_status: 'name_evidence_only' | 'boundary_requires_coordinates' | 'no_unambiguous_kml_match'
    rationale: string
  } | null
}

function ActionButtons({ row }: { row: ReviewRow }) {
  return (
    <div className="flex flex-wrap gap-2">
      <form action={reviewNeighborhoodAction}>
        <input type="hidden" name="reviewId" value={row.id} />
        <input type="hidden" name="decision" value="accepted" />
        <button
          type="submit"
          className="inline-flex min-h-11 items-center gap-2 border border-[var(--n3-accent)] px-4 text-xs font-semibold text-[var(--n3-accent)] transition-colors hover:bg-[var(--n3-accent)] hover:text-[#081111]"
        >
          <CheckCircle2 size={15} /> Aprobar
        </button>
      </form>
      <form action={reviewNeighborhoodAction}>
        <input type="hidden" name="reviewId" value={row.id} />
        <input type="hidden" name="decision" value="discarded" />
        <button
          type="submit"
          className="inline-flex min-h-11 items-center gap-2 border border-[#7d514d] px-4 text-xs font-semibold text-[#ff8d87] transition-colors hover:border-[#d7332b]"
        >
          <XCircle size={15} /> Rechazar
        </button>
      </form>
    </div>
  )
}

function ReviewCard({ row, compact = false }: { row: ReviewRow; compact?: boolean }) {
  const score = row.assessment?.confidence_score ?? 0
  const suggested = row.neighborhood?.name || row.candidate_neighborhoods?.join(' / ') || 'Sin barrio sugerido'
  const canDecide = row.classification === 'clear' && Boolean(row.neighborhood)

  return (
    <article className={`grid gap-4 py-5 ${compact ? 'lg:grid-cols-[minmax(0,1fr)_220px]' : 'lg:grid-cols-[minmax(0,1.45fr)_minmax(220px,0.7fr)_220px]'} lg:items-center`}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--n3-accent)]">
            {score}/100 · {row.assessment?.review_priority === 'approve_recommended' ? 'Aprobación recomendada' : 'Revisión CEO'}
          </span>
          {row.classification !== 'clear' ? (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-[#ff8d87]"><AlertTriangle size={12} /> Excepción</span>
          ) : null}
        </div>
        <p className="mt-2 text-sm font-medium leading-6 text-[var(--n3-text-light)]">
          {row.listing.raw_address || row.listing.title || 'Dirección no disponible'}
        </p>
        {row.listing.title && row.listing.raw_address ? <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{row.listing.title}</p> : null}
        <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">
          {row.evidence?.reason || row.assessment?.rationale || 'Sin evidencia adicional.'}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--n3-text-muted)]">
          <span>MLC-{row.listing.source_listing_id}</span>
          {row.listing.url ? (
            <Link href={row.listing.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-[var(--n3-accent)] hover:underline">
              Ver aviso <ExternalLink size={12} />
            </Link>
          ) : null}
        </div>
      </div>

      {!compact ? (
        <div className="border-l border-[var(--n3-line)] pl-4">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Barrio propuesto</p>
          <p className="mt-1 text-lg font-semibold text-[var(--n3-text-light)]">{suggested}</p>
          <p className="mt-2 flex items-start gap-1 text-[11px] leading-4 text-[var(--n3-text-muted)]">
            <MapPinned size={12} className="mt-0.5 shrink-0" /> Coincidencia única contra el KML Property Partners.
          </p>
        </div>
      ) : null}

      <div className="lg:justify-self-end">
        {canDecide ? <ActionButtons row={row} /> : <span className="inline-flex min-h-11 items-center border border-[#7d514d] px-3 text-xs text-[#ff8d87]">Requiere más evidencia</span>}
      </div>
    </article>
  )
}

export default async function NeighborhoodReviewPage() {
  await requireAnyPageCapability(['market.manage_sources', 'management.global.read'])

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('market_neighborhood_review_items')
    .select(`
      id,
      classification,
      candidate_neighborhoods,
      decision,
      reviewed_at,
      evidence,
      listing:market_listings!inner(source_listing_id,raw_address,title,url),
      neighborhood:market_neighborhoods(name),
      assessment:market_neighborhood_review_assessments(confidence_score,review_priority,geometry_status,rationale)
    `)
    .order('created_at', { ascending: false })

  const rows = (data || []) as unknown as ReviewRow[]
  const pendingRows = rows.filter((row) => row.decision === 'pending')
  const recommendedRows = pendingRows
    .filter((row) => row.classification === 'clear' && row.neighborhood && row.assessment?.review_priority === 'approve_recommended')
    .sort((a, b) => (b.assessment?.confidence_score ?? 0) - (a.assessment?.confidence_score ?? 0))
  const otherPendingRows = pendingRows.filter((row) => !recommendedRows.some((recommended) => recommended.id === row.id))
  const acceptedRows = rows.filter((row) => row.decision === 'accepted')
  const rejectedRows = rows.filter((row) => row.decision === 'discarded')

  return (
    <WorkspaceShell>
      <WorkspaceHeader
        eyebrow="Mercado · Decisión CEO"
        title="Aprobar barrios pendientes"
        meta={`${recommendedRows.length} recomendados · ${otherPendingRows.length} casos especiales`}
        actions={[{ label: 'Volver a Mercado', href: '/dashboard/market' }]}
      />

      {error ? (
        <div className="mt-5 border border-[#d7332b] bg-[#0c1111] p-4 text-sm text-[#ff766f]">
          No fue posible cargar la cola de aprobación territorial.
        </div>
      ) : null}

      <MetricStrip items={[
        { label: 'Listos para decidir', value: recommendedRows.length.toLocaleString('es-CL') },
        { label: 'Casos especiales', value: otherPendingRows.length.toLocaleString('es-CL'), tone: otherPendingRows.length > 0 ? 'warning' : 'default' },
        { label: 'Aprobados', value: acceptedRows.length.toLocaleString('es-CL') },
        { label: 'Rechazados', value: rejectedRows.length.toLocaleString('es-CL') },
      ]} />

      <section className="mt-6 border-y border-[var(--n3-line)] py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-[var(--n3-text-light)]">Una decisión, dos opciones.</p>
            <p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">
              Aprobar publica el barrio KML sugerido en la propiedad canónica y guarda la decisión como aprendizaje auditado. Rechazar conserva la propiedad sin barrio. Ninguna de las dos acciones modifica precio, identidad, valorización ni ventas.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 text-xs text-[var(--n3-text-muted)]">
            <ShieldCheck size={15} className="text-[var(--n3-accent)]" />
            Aprobación protegida por AAL2
          </div>
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Cola recomendada</p>
            <h2 className="mt-1 text-lg font-medium text-[var(--n3-text-light)]">{recommendedRows.length} decisiones rápidas</h2>
          </div>
          <p className="hidden text-xs text-[var(--n3-text-muted)] sm:block">Dirección + barrio + evidencia · Aprobar / Rechazar</p>
        </div>

        <div className="divide-y divide-[var(--n3-line)] border-t border-[var(--n3-line)]">
          {recommendedRows.map((row) => <ReviewCard key={row.id} row={row} />)}
        </div>

        {!recommendedRows.length && !error ? (
          <div className="flex items-center gap-2 py-8 text-sm text-[var(--n3-text-muted)]"><CheckCircle2 size={16} /> No hay aprobaciones recomendadas pendientes.</div>
        ) : null}
      </section>

      {otherPendingRows.length ? (
        <details className="mt-8 border-t border-[var(--n3-line)] pt-4">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-4 text-sm font-medium text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">
            <span>Casos que requieren más revisión</span>
            <span className="text-xs">{otherPendingRows.length}</span>
          </summary>
          <div className="mt-2 divide-y divide-[var(--n3-line)]">
            {otherPendingRows.map((row) => <ReviewCard key={row.id} row={row} compact />)}
          </div>
        </details>
      ) : null}

      <section className="mt-8 border-t border-[var(--n3-line)] pt-4 text-xs text-[var(--n3-text-muted)]">
        Historial auditado: {acceptedRows.length} aprobados · {rejectedRows.length} rechazados.
      </section>
    </WorkspaceShell>
  )
}
