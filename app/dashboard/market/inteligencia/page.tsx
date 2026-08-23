import Link from 'next/link'
import { ArrowLeft, TrendingUp } from 'lucide-react'
import { PublicErrorNotice } from '@/components/feedback/public-error-notice'
import { WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import { getSupplySalesIntelligence } from '@/lib/market-supply-sales-intelligence'

function number(value: number | null, digits = 0) {
  return value === null ? '—' : value.toLocaleString('es-CL', { maximumFractionDigits: digits, minimumFractionDigits: digits })
}

function percent(value: number | null) {
  return value === null ? '—' : `${(value * 100).toFixed(1)}%`
}

function date(value: string | null) {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? '—'
    : new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }).format(parsed)
}

const signalLabel: Record<string, string> = {
  asking_well_above_sales: 'Oferta muy sobre ventas',
  asking_moderately_above_sales: 'Oferta sobre ventas',
  market_aligned: 'Oferta alineada',
  asking_below_sales: 'Oferta bajo ventas',
  thin_sample: 'Muestra limitada',
  insufficient_data: 'Datos insuficientes',
}

const confidenceLabel: Record<string, string> = {
  high: 'alta',
  medium: 'media',
  low: 'baja',
}

export default async function MarketIntelligencePage() {
  const intelligence = await getSupplySalesIntelligence()
  const apartments = intelligence.rows.filter((row) => row.propertyType === 'Departamento' && row.neighborhoodName !== 'SIN_BARRIO')

  return (
    <WorkspaceShell>
      <WorkspaceHeader
        eyebrow="Mercado"
        title="Oferta vs ventas"
        meta={`Oferta Portal · ${date(intelligence.portalAsOf)} · Ventas CBRS · ${date(intelligence.cbrsAsOf)}`}
        actions={[{ label: 'Volver', href: '/dashboard/market', icon: <ArrowLeft size={15} /> }]}
      />

      {intelligence.error ? <div className="mt-4"><PublicErrorNotice compact message="No fue posible consultar oferta y ventas." /></div> : null}

      <section className="mt-7">
        <div className="border-b border-[var(--n3-line)] pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp size={15} className="text-[var(--n3-accent)]" />
            <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Departamentos por barrio</h2>
          </div>
          <p className="mt-1 text-xs text-[var(--n3-text-muted)]">Oferta publicada en Portal y ventas históricas CBRS. Medianas en UF/m².</p>
        </div>

        <div className="divide-y divide-[var(--n3-line)]">
          {apartments.map((row) => (
            <div key={row.neighborhoodName} className="grid gap-3 py-4 lg:grid-cols-[minmax(180px,1.3fr)_repeat(5,minmax(100px,1fr))] lg:items-center">
              <div>
                <p className="text-sm font-semibold text-[var(--n3-text-light)]">{row.neighborhoodName}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{signalLabel[row.signal] ?? row.signal} · confianza {confidenceLabel[row.confidence] ?? row.confidence}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Oferta</p>
                <p className="mt-1 text-base font-semibold tabular-nums">{number(row.portalListings)} avisos</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Ventas históricas</p>
                <p className="mt-1 text-base font-semibold tabular-nums">{number(row.cbrsTransactions)} ventas</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Oferta UF/m²</p>
                <p className="mt-1 text-base font-semibold tabular-nums">{number(row.portalMedianUfM2, 1)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Venta UF/m²</p>
                <p className="mt-1 text-base font-semibold tabular-nums">{number(row.cbrsMedianUfM2, 1)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Brecha</p>
                <p className="mt-1 text-base font-semibold tabular-nums">{percent(row.ufM2GapPct)}</p>
              </div>
            </div>
          ))}
          {!intelligence.error && apartments.length === 0 ? <div className="py-5 text-sm text-[var(--n3-text-muted)]">Sin datos comparables</div> : null}
        </div>
      </section>

      <section className="mt-6 border-t border-[var(--n3-line)] pt-4 text-xs text-[var(--n3-text-muted)]">
        <p>Casas: sin señal por barrio. Portal no incluye coordenadas confiables.</p>
        <p className="mt-2"><Link href="/dashboard/market/cbrs" className="text-[var(--n3-accent)]">Ver ventas CBRS</Link></p>
      </section>
    </WorkspaceShell>
  )
}
