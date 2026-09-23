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

type InventoryRun = {
  id: string
  accepted_rows: number
  completed_at: string | null
  started_at: string
  metadata: Record<string, unknown> | null
}

export default async function MarketOfferPage() {
  await requireAnyPageCapability(['market.manage_sources', 'management.global.read', 'management.office.read'])

  const supabase = await createClient()
  const { data: recentRuns, error: runError } = await supabase
    .from('market_ingestion_runs')
    .select('id,accepted_rows,completed_at,started_at,metadata')
    .eq('dataset_kind', 'portal_houses')
    .order('started_at', { ascending: false })
    .limit(30)

  const inventoryRun = ((recentRuns ?? []) as InventoryRun[]).find((run) => {
    const metadata = run.metadata && typeof run.metadata === 'object' ? run.metadata : null
    return metadata?.pipeline === 'portal_inventory_discovery_v1' && metadata?.full_snapshot === true
  }) ?? null

  const { data: inventoryRows, error: inventoryError } = inventoryRun
    ? await supabase
        .from('market_raw_records')
        .select('source_record_id,payload,observed_at,source_row_number')
        .eq('ingestion_run_id', inventoryRun.id)
        .order('source_row_number', { ascending: true })
        .range(0, 199)
    : { data: null, error: null }

  const inventory = (inventoryRows ?? []).map((row) => {
    const payload = row.payload && typeof row.payload === 'object' ? row.payload as Record<string, unknown> : null
    return {
      sourceListingId: String(row.source_record_id ?? ''),
      url: typeof payload?.url === 'string' ? payload.url : null,
      observedAt: row.observed_at as string | null,
    }
  }).filter((row) => row.sourceListingId)

  const inventoryIds = inventory.map((row) => row.sourceListingId)
  const { data: detailRows, error: detailError } = inventoryIds.length
    ? await supabase
        .from('market_current_listings')
        .select('source_listing_id,title,raw_address,price_uf,observed_at,url,market_sources!inner(code)')
        .eq('market_sources.code', 'portal-inmobiliario-vitacura-portal-houses')
        .in('source_listing_id', inventoryIds)
    : { data: null, error: null }

  const detailById = new Map((detailRows ?? []).map((row) => [String(row.source_listing_id), row]))
  const total = inventoryRun?.accepted_rows ?? null
  const observedAt = inventoryRun?.completed_at ?? inventoryRun?.started_at ?? null
  const error = runError || inventoryError || detailError

  return (
    <WorkspaceShell>
      <WorkspaceHeader
        eyebrow="Mercado · Portal"
        title="Casas en oferta"
        meta="Vitacura · inventario diario completo"
        actions={[{ label: 'Volver a Mercado', href: '/dashboard/market' }]}
      />

      <section className="mt-6 border-y border-[var(--n3-line)] py-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Publicaciones únicas vigentes</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">{number(error ? null : total)}</p>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--n3-text-muted)]">
              Snapshot completo de presencia en Portal Inmobiliario para casas usadas en venta en Vitacura. El detalle de cada ficha se enriquece por lotes sin alterar este universo.
            </p>
          </div>
          <div className="text-right text-xs text-[var(--n3-text-muted)]">
            <p>Último snapshot completo</p>
            <p className="mt-1 text-[var(--n3-text-light)]">{observedAt ? formatPropertyPartnersDateTime(observedAt) : '—'}</p>
          </div>
        </div>

        {total != null && total > inventory.length ? (
          <p className="mt-4 text-[11px] text-[var(--n3-text-muted)]">
            Mostrando las primeras {inventory.length.toLocaleString('es-CL')} de {total.toLocaleString('es-CL')} publicaciones. El conteo superior corresponde al snapshot completo, no al límite visual de esta página.
          </p>
        ) : null}
      </section>

      {error ? (
        <div className="mt-6 border border-[#ff8d87]/50 p-4 text-sm text-[#ff8d87]">
          No fue posible cargar el inventario vigente completo.
        </div>
      ) : !inventoryRun ? (
        <div className="mt-6 border border-[var(--n3-line)] p-6 text-sm text-[var(--n3-text-muted)]">
          Aún no existe un snapshot diario completo. El sistema no mostrará una muestra parcial como si fuera toda la oferta.
        </div>
      ) : inventory.length === 0 ? (
        <div className="mt-6 border border-[var(--n3-line)] p-6 text-sm text-[var(--n3-text-muted)]">
          El snapshot completo no contiene publicaciones vigentes.
        </div>
      ) : (
        <section className="mt-6">
          <div className="grid border-b border-[var(--n3-line)] pb-2 text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)] md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_140px_160px_32px]">
            <span>Publicación</span>
            <span>Dirección</span>
            <span>Precio</span>
            <span>Estado de detalle</span>
            <span />
          </div>
          <div className="divide-y divide-[var(--n3-line)]">
            {inventory.map((item) => {
              const detail = detailById.get(item.sourceListingId)
              const detailObservedAt = detail?.observed_at ? String(detail.observed_at) : null
              return (
                <div key={item.sourceListingId} className="grid gap-2 py-4 text-sm md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_140px_160px_32px] md:items-center">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--n3-text-light)]">{detail?.title || `Publicación Portal ${item.sourceListingId}`}</p>
                    <p className="mt-1 text-[11px] text-[var(--n3-text-muted)]">ID {item.sourceListingId}</p>
                  </div>
                  <p className="min-w-0 truncate text-[var(--n3-text-muted)]">{detail?.raw_address || 'Pendiente de enriquecimiento'}</p>
                  <p className="tabular-nums">{moneyUf(detail?.price_uf == null ? null : Number(detail.price_uf))}</p>
                  <div>
                    <p className={detail ? 'text-[var(--n3-teal-soft)]' : 'text-[var(--n3-text-muted)]'}>
                      {detail ? 'Enriquecida' : 'Presencia confirmada'}
                    </p>
                    <p className="mt-1 text-[10px] text-[var(--n3-text-muted)]">
                      {detailObservedAt ? formatPropertyPartnersDateTime(detailObservedAt) : 'Snapshot diario'}
                    </p>
                  </div>
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noreferrer" aria-label="Abrir publicación en Portal Inmobiliario" className="inline-flex min-h-10 min-w-10 items-center justify-center text-[var(--n3-teal-soft)]">
                      <ExternalLink size={15} />
                    </a>
                  ) : <span />}
                </div>
              )
            })}
          </div>
        </section>
      )}

      <div className="mt-6">
        <Link href="/dashboard/market" className="text-xs text-[var(--n3-teal-soft)]">Volver al resumen</Link>
      </div>
    </WorkspaceShell>
  )
}
