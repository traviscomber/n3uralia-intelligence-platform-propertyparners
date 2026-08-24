import Link from 'next/link'
import { AlertTriangle, BrainCircuit, ExternalLink, MapPinned, ShieldCheck } from 'lucide-react'
import { MetricStrip, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import { requireAnyPageCapability } from '@/lib/access-guards'
import { getNeighborhoodReviewSnapshot } from '@/lib/neighborhood-review'
import { createClient } from '@/lib/supabase/server'
import { reviewNeighborhoodAction } from './actions'

type ReviewRow = {
  id: string
  classification: 'clear' | 'ambiguous' | 'no_match'
  candidate_neighborhoods: string[]
  decision: 'pending' | 'accepted' | 'discarded'
  reviewed_at: string | null
  evidence: { reason?: string } | null
  listing: {
    source_listing_id: string
    raw_address: string | null
    title: string | null
    url: string | null
    latitude: number | null
    longitude: number | null
  }
  neighborhood: { name: string } | null
  assessment: {
    confidence_score: number
    review_priority: 'approve_recommended' | 'quick_review' | 'mandatory_review'
    geometry_status: 'name_evidence_only' | 'boundary_requires_coordinates' | 'no_unambiguous_kml_match'
    rationale: string
  } | null
}

function decisionLabel(decision: ReviewRow['decision']) {
  if (decision === 'accepted') return 'Aceptado'
  if (decision === 'discarded') return 'Descartado'
  return 'Pendiente'
}

function priorityLabel(priority: ReviewRow['assessment'] extends infer T ? T extends { review_priority: infer P } ? P : never : never) {
  if (priority === 'approve_recommended') return 'Aprobar recomendado'
  if (priority === 'quick_review') return 'Revisión rápida'
  return 'Revisión obligatoria'
}

function priorityClass(priority: ReviewRow['assessment'] extends infer T ? T extends { review_priority: infer P } ? P : never : never) {
  if (priority === 'approve_recommended') return 'text-[var(--n3-accent)]'
  if (priority === 'quick_review') return 'text-[#f0c96a]'
  return 'text-[#ff8d87]'
}

function geometryLabel(status: ReviewRow['assessment'] extends infer T ? T extends { geometry_status: infer P } ? P : never : never) {
  if (status === 'boundary_requires_coordinates') return 'Borde KML · requiere coordenadas o criterio humano'
  if (status === 'no_unambiguous_kml_match') return 'Sin correspondencia KML inequívoca'
  return 'Evidencia nominal · sin coordenadas en esta fuente'
}

function percent(value: number | null) {
  return value === null ? '—' : `${(value * 100).toFixed(1)}%`
}

export default async function NeighborhoodReviewPage() {
  await requireAnyPageCapability(['market.manage_sources', 'management.global.read'])

  const supabase = await createClient()
  const [{ data, error }, snapshot] = await Promise.all([
    supabase
      .from('market_neighborhood_review_items')
      .select(`
        id,
        classification,
        candidate_neighborhoods,
        decision,
        reviewed_at,
        evidence,
        listing:market_listings!inner(source_listing_id,raw_address,title,url,latitude,longitude),
        neighborhood:market_neighborhoods(name),
        assessment:market_neighborhood_review_assessments(confidence_score,review_priority,geometry_status,rationale)
      `)
      .order('decision', { ascending: false })
      .order('created_at', { ascending: true }),
    getNeighborhoodReviewSnapshot(),
  ])

  const rows = (data || []) as unknown as ReviewRow[]
  const pendingRows = rows.filter((row) => row.decision === 'pending')
  const decidedRows = rows.filter((row) => row.decision !== 'pending')

  return (
    <WorkspaceShell>
      <WorkspaceHeader
        eyebrow="Mercado · Control territorial"
        title="Revisar barrios"
        meta={`${snapshot.knownAddresses} direcciones conocidas · ${pendingRows.length} excepciones actuales`}
        actions={[{ label: 'Volver a Mercado', href: '/dashboard/market' }]}
      />

      {error || snapshot.error ? (
        <div className="mt-5 border border-[#d7332b] bg-[#0c1111] p-4 text-sm text-[#ff766f]">
          No fue posible cargar toda la información de revisión de barrios.
        </div>
      ) : null}

      <MetricStrip items={[
        { label: 'Conocidas', value: snapshot.knownAddresses.toLocaleString('es-CL') },
        { label: 'Aprobar recomendado', value: snapshot.approveRecommended.toLocaleString('es-CL') },
        { label: 'Revisión rápida', value: snapshot.quickReview.toLocaleString('es-CL'), tone: snapshot.quickReview > 0 ? 'warning' : 'default' },
        { label: 'Revisión obligatoria', value: snapshot.mandatoryReview.toLocaleString('es-CL'), tone: snapshot.mandatoryReview > 0 ? 'warning' : 'default' },
      ]} />

      <section className="mt-6 grid gap-px border border-[var(--n3-line)] bg-[var(--n3-line)] lg:grid-cols-3">
        <div className="bg-[var(--n3-bg)] p-4">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Automatización</p>
          <p className="mt-2 text-2xl font-medium text-[var(--n3-text-light)]">{snapshot.knownAddresses}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">Direcciones seguras ya conocidas. Si reaparecen, se reutilizan y no vuelven a Pedro.</p>
        </div>
        <div className="bg-[var(--n3-bg)] p-4">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Aprendizaje validado</p>
          <p className="mt-2 text-2xl font-medium text-[var(--n3-text-light)]">{snapshot.learnedFromReviews}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">Direcciones nuevas aprendidas desde aprobaciones humanas. La primera aprobación real activará esta métrica.</p>
        </div>
        <div className="bg-[var(--n3-bg)] p-4">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Excepciones territoriales</p>
          <p className="mt-2 text-2xl font-medium text-[var(--n3-text-light)]">{snapshot.ambiguous + snapshot.noMatch}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">{snapshot.ambiguous} ambiguas · {snapshot.noMatch} sin match. No se fuerza una respuesta cuando falta evidencia.</p>
        </div>
      </section>

      <section className="mt-6 border-y border-[var(--n3-line)] py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex max-w-3xl gap-3">
            <BrainCircuit size={18} className="mt-0.5 shrink-0 text-[var(--n3-accent)]" />
            <div>
              <p className="text-sm font-medium text-[var(--n3-text-light)]">Pedro revisa conocimiento nuevo, no trabajo repetido.</p>
              <p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">
                97–100: aprobación recomendada. 93–96: revisión rápida. Menos de 93, ambiguos o sin match: revisión obligatoria. Las fuentes actuales no incluyen coordenadas, por lo que los bordes KML se muestran como incertidumbre real y no como precisión inventada.
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 text-xs text-[var(--n3-text-muted)]">
            <ShieldCheck size={15} className="text-[var(--n3-accent)]" />
            Decisiones protegidas por AAL2
          </div>
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Atención ejecutiva</p>
            <h2 className="mt-1 text-lg font-medium text-[var(--n3-text-light)]">{pendingRows.length} casos requieren atención</h2>
          </div>
          <p className="text-xs text-[var(--n3-text-muted)]">Revisadas: {percent(snapshot.reviewedRate)} · aceptación: {percent(snapshot.acceptanceRate)}</p>
        </div>

        <div className="divide-y divide-[var(--n3-line)] border-t border-[var(--n3-line)]">
          {pendingRows.map((row) => {
            const score = row.assessment?.confidence_score ?? 0
            const priority = row.assessment?.review_priority ?? 'mandatory_review'
            const suggested = row.neighborhood?.name || row.candidate_neighborhoods?.join(' / ') || 'Sin barrio sugerido'
            const canDecide = row.classification === 'clear' && Boolean(row.neighborhood)

            return (
              <article key={row.id} className="grid gap-4 py-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(190px,0.8fr)_140px_220px] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-xs font-semibold ${priorityClass(priority)}`}>{score}/100 · {priorityLabel(priority)}</span>
                    {row.classification !== 'clear' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-[#ff8d87]"><AlertTriangle size={12} /> Excepción</span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm font-medium text-[var(--n3-text-light)]">{row.listing.raw_address || row.listing.title || 'Dirección no disponible'}</p>
                  {row.listing.title && row.listing.raw_address ? <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{row.listing.title}</p> : null}
                  <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">{row.assessment?.rationale || row.evidence?.reason || 'Sin evidencia adicional.'}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--n3-text-muted)]">
                    <span>MLC-{row.listing.source_listing_id}</span>
                    {row.listing.url ? (
                      <Link href={row.listing.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-[var(--n3-accent)] hover:underline">
                        Abrir aviso <ExternalLink size={12} />
                      </Link>
                    ) : null}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Barrio / candidatos</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--n3-text-light)]">{suggested}</p>
                  <p className="mt-2 flex items-start gap-1 text-[11px] leading-4 text-[var(--n3-text-muted)]">
                    <MapPinned size={12} className="mt-0.5 shrink-0" />
                    {geometryLabel(row.assessment?.geometry_status ?? 'no_unambiguous_kml_match')}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Estado</p>
                  <p className="mt-1 text-xs font-medium text-[#f0c96a]">{decisionLabel(row.decision)}</p>
                </div>

                <div className="flex gap-2 lg:justify-end">
                  {canDecide ? (
                    <>
                      <form action={reviewNeighborhoodAction}>
                        <input type="hidden" name="reviewId" value={row.id} />
                        <input type="hidden" name="decision" value="accepted" />
                        <button type="submit" className="min-h-9 border border-[var(--n3-line)] px-3 text-xs font-medium text-[var(--n3-text-light)] transition-colors hover:border-[var(--n3-accent)]">Aceptar</button>
                      </form>
                      <form action={reviewNeighborhoodAction}>
                        <input type="hidden" name="reviewId" value={row.id} />
                        <input type="hidden" name="decision" value="discarded" />
                        <button type="submit" className="min-h-9 border border-[var(--n3-line)] px-3 text-xs font-medium text-[var(--n3-text-light)] transition-colors hover:border-[#d7332b]">Descartar</button>
                      </form>
                    </>
                  ) : (
                    <span className="inline-flex min-h-9 items-center border border-[#7d514d] px-3 text-xs text-[#ff8d87]">Resolver evidencia</span>
                  )}
                </div>
              </article>
            )
          })}
        </div>

        {!pendingRows.length && !error ? <div className="py-8 text-sm text-[var(--n3-text-muted)]">No hay casos pendientes.</div> : null}
      </section>

      {decidedRows.length ? (
        <section className="mt-8 border-t border-[var(--n3-line)] pt-4">
          <p className="text-xs text-[var(--n3-text-muted)]">{decidedRows.length} decisiones ya registradas y disponibles en el historial auditado.</p>
        </section>
      ) : null}
    </WorkspaceShell>
  )
}
