import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { requireAnyPageCapability } from '@/lib/access-guards'
import { createClient } from '@/lib/supabase/server'
import { formatPropertyPartnersDateTime } from '@/lib/property-partners-time'
import { WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'

function number(value: number | null) {
  return value == null ? '—' : value.toLocaleString('es-CL')
}

function moneyUf(value: number | null) {
  return value == null ? '—' : `UF ${value.toLocaleString('es-CL', { maximumFractionDigits: 0 })}`
}

export default async function MarketOfferPage() {
  await requireAnyPageCapability(['market.manage_sources', 'management.global.read', 'management.office.read'])

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('market_current_listings')
    .select('source_listing_id,title,raw_address,price_uf,observed_at,url,market_sources!inner(code)')
    .eq('market_sources.code', 'portal-inmobiliario-vitacura-portal-houses')
    .in('status', ['active', 'observed'])
    .order('observed_at', { ascending: false })
    .limit(200)

  const rows = data ?? []

  return (
    <WorkspaceShell>
      <WorkspaceHeader
        eyebrow="Mercado · Portal"
        title="Casas en oferta"
        meta="Vitacura · snapshot vigente"
        actions={[{ label: 'Volver a Mercado', href: '/dashboard/market' }]}
      />

      <section className="mt-6 border-y border-[var(--n3-line)] py-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Universo visible</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">{number(rows.length)}</p>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--n3-text-muted)]">
              Publicaciones vigentes de casas capturadas desde Portal Inmobiliario para Vitacura. Legacy y otras fuentes no participan en este listado.
            </p>
          </div>
          <p className="text-xs text-[var(--n3-text-muted)]">Fuente canónica: portal-inmobiliario-vitacura-portal-houses</p>
        </div>
      </section>

      {error ? (
        <div className="mt-6 border border-[#ff8d87]/50 p-4 text-sm text-[#ff8d87]">
          No fue posible cargar la oferta vigente.
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-6 border border-[var(--n3-line)] p-6 text-sm text-[var(--n3-text-muted)]">
          No hay publicaciones vigentes disponibles en el snapshot actual.
        </div>
      ) : (
        <section className="mt-6">
          <div className="grid border-b border-[var(--n3-line)] pb-2 text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)] md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_140px_180px_32px]">
            <span>Propiedad</span>
            <span>Dirección</span>
            <span>Precio</span>
            <span>Última observación</span>
            <span />
          </div>
          <div className="divide-y divide-[var(--n3-line)]">
            {rows.map((row) => (
              <div key={row.source_listing_id} className="grid gap-2 py-4 text-sm md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_140px_180px_32px] md:items-center">
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--n3-text-light)]">{row.title || `Publicación ${row.source_listing_id}`}</p>
                  <p className="mt-1 text-[11px] text-[var(--n3-text-muted)]">ID {row.source_listing_id}</p>
                </div>
                <p className="min-w-0 truncate text-[var(--n3-text-muted)]">{row.raw_address || 'Dirección no disponible'}</p>
                <p className="tabular-nums">{moneyUf(row.price_uf == null ? null : Number(row.price_uf))}</p>
                <p className="text-xs text-[var(--n3-text-muted)]">{row.observed_at ? formatPropertyPartnersDateTime(row.observed_at) : '—'}</p>
                {row.url ? (
                  <a href={row.url} target="_blank" rel="noreferrer" aria-label="Abrir publicación en Portal Inmobiliario" className="inline-flex min-h-10 min-w-10 items-center justify-center text-[var(--n3-teal-soft)]">
                    <ExternalLink size={15} />
                  </a>
                ) : <span />}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-6">
        <Link href="/dashboard/market" className="text-xs text-[var(--n3-teal-soft)]">Volver al resumen</Link>
      </div>
    </WorkspaceShell>
  )
}
