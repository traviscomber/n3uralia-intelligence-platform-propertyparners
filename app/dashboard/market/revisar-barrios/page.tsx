import Link from 'next/link'
import { AlertTriangle, CheckCircle2, ExternalLink, MapPinned, ShieldCheck, XCircle } from 'lucide-react'
import { MetricStrip, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import { requireAnyPageCapability } from '@/lib/access-guards'
import { createClient } from '@/lib/supabase/server'
import { reviewNeighborhoodAction } from './actions'

const KML_SOURCE_CODE = 'kml_vitacura_barrios_2026_08_12'
const HOUSE_SCOPE = 'Vitacura · Casa · Venta'

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
    source_code?: string
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

type CanonicalNeighborhood = { id: string; name: string }

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

function ReviewCard({ row, resolvedNeighborhood, compact = false }: { row: ReviewRow; resolvedNeighborhood?: CanonicalNeighborhood | null; compact?: boolean }) {
  const score = row.assessment?.confidence_score ?? null
  const suggested = row.neighborhood?.name || resolvedNeighborhood?.name || row.candidate_neighborhoods?.join(' / ') || 'Sin barrio sugerido'
  const canDecide = (row.classification === 'clear' && Boolean(row.neighborhood)) || Boolean(resolvedNeighborhood)
  const systemRecognized = Boolean(resolvedNeighborhood) && row.classification === 'ambiguous'

  return (
    <article className={`grid gap-4 py-5 ${compact ? 'lg:grid-cols-[minmax(0,1fr)_220px]' : 'lg:grid-cols-[minmax(0,1.45fr)_minmax(220px,0.7fr)_220px]'} lg:items-center`}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--n3-accent)]">
            {systemRecognized ? 'Reconocido contra KML' : `${score ?? '—'}/100 · ${row.assessment?.review_priority === 'approve_recommended' ? 'Aprobación recomendada' : 'Revisión CEO'}`}
          </span>
          {row.classification !== 'clear' && !systemRecognized ? (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-[#ff8d87]"><AlertTriangle size={12} /> Excepción</span>
          ) : null}
        </div>
        <p className="mt-2 text-sm font-medium leading-6 text-[var(--n3-text-light)]">
          {row.listing.raw_address || row.listing.title || 'Dirección no disponible'}
        </p>
        {row.listing.title && row.listing.raw_address ? <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{row.listing.title}</p> : null}
        <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">
          {systemRecognized
            ? 'De los candidatos del aviso, sólo este nombre existe como barrio en el KML canónico. Las otras referencias son sectores o puntos de interés.'
            : row.evidence?.reason || row.assessment?.rationale || 'Sin evidencia adicional.'}
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
            <MapPinned size={12} className="mt-0.5 shrink-0" /> {systemRecognized ? 'Único candidato que coincide con un barrio del KML Property Partners.' : 'Coincidencia única contra el KML Property Partners.'}
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
  const [{ data, error }, { data: kmlSource }] = await Promise.all([
    supabase
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
      .order('created_at', { ascending: false }),
    supabase.from('market_sources').select('id').eq('code', KML_SOURCE_CODE).maybeSingle(),
  ])

  const { data: kmlNeighborhoods } = kmlSource
    ? await supabase.from('market_neighborhoods').select('id,name').eq('geometry_source_id', kmlSource.id)
    : { data: [] as CanonicalNeighborhood[] }

  const canonicalByName = new Map((kmlNeighborhoods ?? []).map((row) => [row.name.toLocaleLowerCase('es'), row as CanonicalNeighborhood]))
  const allRows = (data || []) as unknown as ReviewRow[]
  const pendingByListing = new Map<string, ReviewRow>()
  for (const row of allRows) {
    if (row.decision !== 'pending') continue
    if (!pendingByListing.has(row.listing.source_listing_id)) pendingByListing.set(row.listing.source_listing_id, row)
  }
  const pendingRows = [...pendingByListing.values()]

  const resolveCanonicalCandidate = (row: ReviewRow) => {
    if (row.classification !== 'ambiguous') return null
    const matches = row.candidate_neighborhoods
      .map((name) => canonicalByName.get(name.toLocaleLowerCase('es')))
      .filter((value): value is CanonicalNeighborhood => Boolean(value))
    return matches.length === 1 ? matches[0] : null
  }

  const recommendedRows = pendingRows
    .filter((row) => row.evidence?.scope === HOUSE_SCOPE && row.classification === 'clear' && row.neighborhood && row.assessment?.review_priority === 'approve_recommended')
    .sort((a, b) => (b.assessment?.confidence_score ?? 0) - (a.assessment?.confidence_score ?? 0))

  const recognizedRows = pendingRows
    .map((row) => ({ row, resolved: resolveCanonicalCandidate(row) }))
    .filter(({ row, resolved }) => Boolean(resolved) && row.evidence?.source_code?.includes('portal-houses'))

  const fastIds = new Set([...recommendedRows.map((row) => row.id), ...recognizedRows.map(({ row }) => row.id)])
  const otherPendingRows = pendingRows.filter((row) => !fastIds.has(row.id))
  const acceptedRows = allRows.filter((row) => row.decision === 'accepted')
  const rejectedRows = allRows.filter((row) => row.decision === 'discarded')
  const fastCount = recommendedRows.length + recognizedRows.length

  return (
    <WorkspaceShell>
      <WorkspaceHeader
        eyebrow="Mercado · Decisión CEO"
        title="Aprobar barrios pendientes"
        meta={`${fastCount} listos · ${recognizedRows.length} reconocidos adicionales · ${otherPendingRows.length} casos especiales`}
        actions={[{ label: 'Volver a Mercado', href: '/dashboard/market' }]}
      />

      {error ? (
        <div className="mt-5 border border-[#d7332b] bg-[#0c1111] p-4 text-sm text-[#ff766f]">
          No fue posible cargar la cola de aprobación territorial.
        </div>
      ) : null}

      <MetricStrip items={[
        { label: 'Listos para decidir', value: fastCount.toLocaleString('es-CL') },
        { label: 'Reconocidos extra', value: recognizedRows.length.toLocaleString('es-CL'), tone: recognizedRows.length > 0 ? 'success' : 'default' },
        { label: 'Aprobados', value: acceptedRows.length.toLocaleString('es-CL') },
        { label: 'Rechazados', value: rejectedRows.length.toLocaleString('es-CL') },
      ]} />

      <section className="mt-6 border-y border-[var(--n3-line)] py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-[var(--n3-text-light)]">Una decisión, dos opciones.</p>
            <p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">
              Aprobar publica el barrio KML sugerido en la propiedad canónica y guarda la decisión como aprendizaje auditado. Los casos reconocidos adicionales sólo se habilitan cuando queda exactamente un candidato válido dentro del KML oficial. Rechazar conserva la propiedad sin barrio.
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
            <h2 className="mt-1 text-lg font-medium text-[var(--n3-text-light)]">{fastCount} decisiones rápidas</h2>
          </div>
          <p className="hidden text-xs text-[var(--n3-text-muted)] sm:block">Dirección + barrio + evidencia · Aprobar / Rechazar</p>
        </div>

        <div className="divide-y divide-[var(--n3-line)] border-t border-[var(--n3-line)]">
          {recommendedRows.map((row) => <ReviewCard key={row.id} row={row} />)}
          {recognizedRows.map(({ row, resolved }) => <ReviewCard key={row.id} row={row} resolvedNeighborhood={resolved} />)}
        </div>

        {!fastCount && !error ? (
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
