import { ArrowLeft } from 'lucide-react'
import { PublicErrorNotice } from '@/components/feedback/public-error-notice'
import { MarketTerritoryReviewQueue } from '@/components/market/market-territory-review-queue'
import { MetricStrip, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import { requireAnyPageCapability } from '@/lib/access-guards'
import {
  getMarketHouseDeliverySummary,
  getMarketHouseTerritoryQueue,
} from '@/lib/market-house-intelligence'

function number(value: number | null) {
  return value === null ? '—' : value.toLocaleString('es-CL')
}

export default async function MarketTerritoryReviewPage() {
  await requireAnyPageCapability([
    'market.manage_sources',
    'properties.global.assign',
    'properties.office.assign',
  ])

  const [delivery, queue] = await Promise.all([
    getMarketHouseDeliverySummary(),
    getMarketHouseTerritoryQueue(),
  ])
  const summary = delivery.summary

  return (
    <WorkspaceShell>
      <WorkspaceHeader
        eyebrow="Mercado"
        title="Revisar barrios"
        meta="Casas en venta · Vitacura"
        actions={[{ label: 'Volver', href: '/dashboard/market', icon: <ArrowLeft size={15} /> }]}
      />

      {delivery.error || queue.error ? <div className="mt-4"><PublicErrorNotice compact message="No fue posible consultar todas las sugerencias." /></div> : null}

      <MetricStrip items={[
        { label: 'Con barrio', value: `${number(summary.portalExactKmlHouses)} / ${number(summary.portalCurrentHouses)}`, detail: `${number(summary.territoryAcceptedReviews)} aceptados` },
        { label: 'Sugerencias', value: number(summary.territorySuggestions) },
        { label: 'Ambiguos', value: number(summary.territoryAmbiguous) },
        { label: 'Sin coincidencia', value: number(summary.territoryUnmatched) },
      ]} />

      <section className="mt-7">
        <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Sugerencias</h2>
        <p className="mt-2 text-sm text-[var(--n3-text-muted)]">El barrio aparece en la dirección Portal. Aceptarlo no cambia la identidad canónica.</p>
        <div className="mt-4">
          <MarketTerritoryReviewQueue rows={queue.rows} />
        </div>
      </section>
    </WorkspaceShell>
  )
}
