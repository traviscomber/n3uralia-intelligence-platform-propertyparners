import Link from 'next/link'
import { ExternalLink, MapPinned, ShieldCheck } from 'lucide-react'
import { MetricStrip, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import { requirePageCapability } from '@/lib/access-guards'
import { createClient } from '@/lib/supabase/server'
import { reviewNeighborhoodAction } from './actions'

type ReviewRow = {
  id: string
  decision: 'pending' | 'accepted' | 'discarded'
  reviewed_at: string | null
  listing: {
    source_listing_id: string
    raw_address: string | null
    title: string | null
    url: string | null
  }
  neighborhood: {
    name: string
  }
}

function decisionLabel(decision: ReviewRow['decision']) {
  if (decision === 'accepted') return 'Aceptado'
  if (decision === 'discarded') return 'Descartado'
  return 'Pendiente'
}

export default async function NeighborhoodReviewPage() {
  await requirePageCapability('market.manage_sources')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('market_neighborhood_review_items')
    .select(`
      id,
      decision,
      reviewed_at,
      listing:market_listings!inner(source_listing_id,raw_address,title,url),
      neighborhood:market_neighborhoods!inner(name)
    `)
    .eq('classification', 'clear')
    .order('created_at', { ascending: true })

  const rows = (data || []) as unknown as ReviewRow[]
  const pending = rows.filter((row) => row.decision === 'pending').length
  const accepted = rows.filter((row) => row.decision === 'accepted').length
  const discarded = rows.filter((row) => row.decision === 'discarded').length

  return (
    <WorkspaceShell>
      <WorkspaceHeader
        eyebrow="Mercado · Control territorial"
        title="Revisar barrios"
        meta="15 coincidencias claras · revisión humana"
        actions={[{ label: 'Volver a Mercado', href: '/dashboard/market' }]}
      />

      {error ? (
        <div className="mt-5 border border-[#d7332b] bg-[#0c1111] p-4 text-sm text-[#ff766f]">
          No fue posible cargar la cola de revisión de barrios.
        </div>
      ) : null}

      <MetricStrip items={[
        { label: 'Claras', value: rows.length.toLocaleString('es-CL') },
        { label: 'Pendientes', value: pending.toLocaleString('es-CL'), tone: pending > 0 ? 'warning' : 'default' },
        { label: 'Aceptadas', value: accepted.toLocaleString('es-CL') },
        { label: 'Descartadas', value: discarded.toLocaleString('es-CL') },
      ]} />

      <section className="mt-6 border-y border-[var(--n3-line)] py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex max-w-3xl gap-3">
            <MapPinned size={18} className="mt-0.5 shrink-0 text-[var(--n3-accent)]" />
            <div>
              <p className="text-sm font-medium text-[var(--n3-text-light)]">Sólo se muestran coincidencias claras.</p>
              <p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">
                Los 2 casos ambiguos y los 4 sin coincidencia permanecen fuera de esta cola y no se asignan automáticamente. Aceptar o descartar registra únicamente la revisión; no modifica el barrio ni la data canónica.
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 text-xs text-[var(--n3-text-muted)]">
            <ShieldCheck size={15} className="text-[var(--n3-accent)]" />
            Aceptar o descartar exige AAL2
          </div>
        </div>
      </section>

      <section className="mt-6">
        <div className="grid border-b border-[var(--n3-line)] pb-2 text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)] lg:grid-cols-[minmax(0,1.8fr)_minmax(160px,0.8fr)_110px_220px] lg:gap-4">
          <span>Aviso</span>
          <span className="hidden lg:block">Barrio sugerido</span>
          <span className="hidden lg:block">Estado</span>
          <span className="hidden lg:block text-right">Decisión</span>
        </div>

        <div className="divide-y divide-[var(--n3-line)]">
          {rows.map((row) => (
            <article key={row.id} className="grid gap-4 py-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(160px,0.8fr)_110px_220px] lg:items-center">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--n3-text-light)]">{row.listing.raw_address || row.listing.title || 'Dirección no disponible'}</p>
                {row.listing.title && row.listing.raw_address ? <p className="mt-1 truncate text-xs text-[var(--n3-text-muted)]">{row.listing.title}</p> : null}
                <div className="mt-2 flex items-center gap-3 text-xs text-[var(--n3-text-muted)]">
                  <span>MLC-{row.listing.source_listing_id}</span>
                  {row.listing.url ? (
                    <Link href={row.listing.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-[var(--n3-accent)] hover:underline">
                      Abrir aviso <ExternalLink size={12} />
                    </Link>
                  ) : null}
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)] lg:hidden">Barrio sugerido</p>
                <p className="mt-1 text-sm font-semibold text-[var(--n3-text-light)] lg:mt-0">{row.neighborhood.name}</p>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)] lg:hidden">Estado</p>
                <p className={`mt-1 text-xs font-medium lg:mt-0 ${row.decision === 'accepted' ? 'text-[var(--n3-accent)]' : row.decision === 'discarded' ? 'text-[#ff8d87]' : 'text-[#f0c96a]'}`}>
                  {decisionLabel(row.decision)}
                </p>
              </div>

              <div className="flex gap-2 lg:justify-end">
                <form action={reviewNeighborhoodAction}>
                  <input type="hidden" name="reviewId" value={row.id} />
                  <input type="hidden" name="decision" value="accepted" />
                  <button
                    type="submit"
                    className={`min-h-9 border px-3 text-xs font-medium transition-colors ${row.decision === 'accepted' ? 'border-[var(--n3-accent)] bg-[var(--n3-accent)] text-[#07100f]' : 'border-[var(--n3-line)] text-[var(--n3-text-light)] hover:border-[var(--n3-accent)]'}`}
                  >
                    Aceptar
                  </button>
                </form>
                <form action={reviewNeighborhoodAction}>
                  <input type="hidden" name="reviewId" value={row.id} />
                  <input type="hidden" name="decision" value="discarded" />
                  <button
                    type="submit"
                    className={`min-h-9 border px-3 text-xs font-medium transition-colors ${row.decision === 'discarded' ? 'border-[#d7332b] bg-[#d7332b] text-white' : 'border-[var(--n3-line)] text-[var(--n3-text-light)] hover:border-[#d7332b]'}`}
                  >
                    Descartar
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>

        {!rows.length && !error ? <div className="py-8 text-sm text-[var(--n3-text-muted)]">No hay coincidencias claras para revisar.</div> : null}
      </section>
    </WorkspaceShell>
  )
}
