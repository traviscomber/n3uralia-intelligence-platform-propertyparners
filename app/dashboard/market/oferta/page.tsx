import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { requireAnyPageCapability } from '@/lib/access-guards'
import { createServiceClient } from '@/lib/supabase/service'
import { formatPropertyPartnersDateTime } from '@/lib/property-partners-time'
import { MetricStrip, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'

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

type DeltaRun = {
  id: string
  completed_at: string | null
  started_at: string
  metadata: Record<string, unknown> | null
}

export default async function MarketOfferPage() {
  await requireAnyPageCapability(['market.manage_sources', 'management.global.read', 'management.office.read'])

  const supabase = createServiceClient()
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

  const latestDeltaRun = ((recentRuns ?? []) as DeltaRun[]).find((run) => {
    const metadata = run.metadata && typeof run.metadata === 'object' ? run.metadata : null
    return metadata?.pipeline === 'portal_daily_delta_v1'
  }) ?? null

  const latestDeltaAt = latestDeltaRun?.completed_at ?? latestDeltaRun?.started_at ?? null
  const latestDeltaMetadata = latestDeltaRun?.metadata && typeof latestDeltaRun.metadata === 'object'
    ? latestDeltaRun.metadata
    : null
  const latestDeltaNewCandidates = latestDeltaMetadata?.new_candidates == null
    ? null
    : Number(latestDeltaMetadata.new_candidates)

  const { data: fullInventoryIds, error: fullInventoryIdsError } = inventoryRun
    ? await supabase
        .from('market_raw_records')
        .select('source_record_id')
        .eq('ingestion_run_id', inventoryRun.id)
        .range(0, 2499)
    : { data: null, error: null }

  const fullInventoryIdSet = new Set(
    (fullInventoryIds ?? [])
      .map((row) => String(row.source_record_id ?? ''))
      .filter(Boolean),
  )

  const { data: latestPulseRows, error: latestPulseError } = latestDeltaAt
    ? await supabase
        .from('market_current_listings')
        .select('source_listing_id,title,raw_address,price_uf,observed_at,url,market_sources!inner(code)')
        .eq('market_sources.code', 'portal-inmobiliario-vitacura-portal-houses')
        .gte('observed_at', latestDeltaAt)
        .order('observed_at', { ascending: false })
        .limit(40)
    : { data: null, error: null }

  const latestPulse = (latestPulseRows ?? []).map((row) => ({
    sourceListingId: String(row.source_listing_id ?? ''),
    title: row.title as string | null,
    address: row.raw_address as string | null,
    priceUf: row.price_uf == null ? null : Number(row.price_uf),
    observedAt: row.observed_at as string | null,
    url: row.url as string | null,
    isNewSinceFullSnapshot: !fullInventoryIdSet.has(String(row.source_listing_id ?? '')),
  })).filter((row) => row.sourceListingId)

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
  const error = runError || inventoryError || detailError || fullInventoryIdsError || latestPulseError

  return (
    <WorkspaceShell>
      <WorkspaceHeader
        eyebrow="Mercado · Portal"
        title="Casas en oferta"
        meta={latestDeltaAt ? `Vitacura · Actualizado ${formatPropertyPartnersDateTime(latestDeltaAt)}` : `Vitacura · Inventario ${observedAt ? formatPropertyPartnersDateTime(observedAt) : '—'}`}
        actions={[{ label: 'Volver a Mercado', href: '/dashboard/market' }]}
      />

      <MetricStrip items={[
        {
          label: 'Inventario verificado',
          value: number(error ? null : total),
          detail: observedAt ? formatPropertyPartnersDateTime(observedAt) : 'Sin inventario completo',
        },
        {
          label: 'Nuevas hoy',
          value: number(latestDeltaNewCandidates),
          detail: latestDeltaAt ? `Actualizado ${formatPropertyPartnersDateTime(latestDeltaAt)}` : 'Sin actualización diaria',
        },
      ]} />

      {!error && latestDeltaAt ? (
        <section className="mt-6 border-y border-[var(--n3-line)] py-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-sm font-medium text-[var(--n3-text-light)]">Cambios de hoy</h2>
              <p className="mt-1 text-xs text-[var(--n3-text-muted)]">Actualizado {formatPropertyPartnersDateTime(latestDeltaAt)}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold tabular-nums">{number(latestDeltaNewCandidates)}</p>
              <p className="text-[11px] text-[var(--n3-text-muted)]">nuevas</p>
            </div>
          </div>

          {latestPulse.length ? (
            <div className="mt-4 divide-y divide-[var(--n3-line)] border-t border-[var(--n3-line)]">
              {latestPulse.map((item) => (
                <div key={item.sourceListingId} className="grid gap-2 py-3 text-sm md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_120px_120px_32px] md:items-center">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--n3-text-light)]">{item.title || `Publicación Portal ${item.sourceListingId}`}</p>
                    <p className="mt-1 text-[11px] text-[var(--n3-text-muted)]">ID {item.sourceListingId}</p>
                  </div>
                  <p className="min-w-0 truncate text-[var(--n3-text-muted)]">{item.address || 'Dirección no disponible'}</p>
                  <p className="tabular-nums">{moneyUf(item.priceUf)}</p>
                  <p className={item.isNewSinceFullSnapshot ? 'text-[var(--n3-teal-soft)]' : 'text-[var(--n3-text-muted)]'}>
                    {item.isNewSinceFullSnapshot ? 'Nueva' : 'Actualizada'}
                  </p>
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noreferrer" aria-label="Abrir publicación actualizada en Portal Inmobiliario" className="inline-flex min-h-10 min-w-10 items-center justify-center text-[var(--n3-teal-soft)]">
                      <ExternalLink size={15} />
                    </a>
                  ) : <span />}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-xs text-[var(--n3-text-muted)]">El pulso se ejecutó, pero no dejó fichas detalladas para mostrar.</p>
          )}
        </section>
      ) : null}

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
        <details className="mt-7 border-t border-[var(--n3-line)] pt-4">
          <summary className="min-h-11 cursor-pointer py-3 text-xs font-medium text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">
            Ver inventario completo ({number(total)})
          </summary>
          {total != null && total > inventory.length ? (
            <p className="mb-4 text-[11px] text-[var(--n3-text-muted)]">
              Mostrando {inventory.length.toLocaleString('es-CL')} de {total.toLocaleString('es-CL')} publicaciones.
            </p>
          ) : null}
          <section>
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
        </details>
      )}

      <div className="mt-6">
        <Link href="/dashboard/market" className="text-xs text-[var(--n3-teal-soft)]">Volver al resumen</Link>
      </div>
    </WorkspaceShell>
  )
}
