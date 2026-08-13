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

const signalLabel: Record<string, string> = {
  asking_well_above_sales: 'Publicado muy sobre ventas',
  asking_moderately_above_sales: 'Publicado sobre ventas',
  market_aligned: 'Mercado alineado',
  asking_below_sales: 'Publicado bajo ventas',
  thin_sample: 'Muestra limitada',
  insufficient_data: 'Datos insuficientes',
}

export default async function MarketIntelligencePage() {
  const intelligence = await getSupplySalesIntelligence()
  const apartments = intelligence.rows.filter((row) => row.propertyType === 'Departamento' && row.neighborhoodName !== 'SIN_BARRIO')

  return (
    <WorkspaceShell>
      <WorkspaceHeader
        eyebrow="Mercado"
        title="Oferta vs ventas"
        meta="Portal Inmobiliario + CBRS + barrios KML Property Partners"
        actions={[{ label: 'Volver', href: '/dashboard/market', icon: <ArrowLeft size={15} /> }]}
      />

      {intelligence.error ? <div className="mt-4"><PublicErrorNotice compact message="No fue posible consultar la inteligencia de oferta versus ventas." /></div> : null}

      <section className="mt-7">
        <div className="border-b border-[var(--n3-line)] pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp size={15} className="text-[var(--n3-accent)]" />
            <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Departamentos por barrio</h2>
          </div>
          <p className="mt-1 text-xs text-[var(--n3-text-muted)]">Compara la mediana UF/m² publicada en Portal con la mediana UF/m² de compraventas CBRS consolidadas. La señal no reemplaza una tasación individual.</p>
        </div>

        <div className="divide-y divide-[var(--n3-line)]">
          {apartments.map((row) => (
            <div key={row.neighborhoodName} className="grid gap-3 py-4 lg:grid-cols-[minmax(180px,1.3fr)_repeat(5,minmax(100px,1fr))] lg:items-center">
              <div>
                <p className="text-sm font-semibold text-[var(--n3-text-light)]">{row.neighborhoodName}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{signalLabel[row.signal] ?? row.signal} · confianza {row.confidence}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Portal</p>
                <p className="mt-1 text-base font-semibold tabular-nums">{number(row.portalListings)} avisos</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">CBRS</p>
                <p className="mt-1 text-base font-semibold tabular-nums">{number(row.cbrsTransactions)} ventas</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Portal UF/m²</p>
                <p className="mt-1 text-base font-semibold tabular-nums">{number(row.portalMedianUfM2, 1)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">CBRS UF/m²</p>
                <p className="mt-1 text-base font-semibold tabular-nums">{number(row.cbrsMedianUfM2, 1)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Brecha UF/m²</p>
                <p className="mt-1 text-base font-semibold tabular-nums">{percent(row.ufM2GapPct)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 border-t border-[var(--n3-line)] pt-4 text-xs text-[var(--n3-text-muted)]">
        <p>Casas: la referencia Portal entregada no trae geocodificación por barrio, por lo que no se publica una señal territorial hasta disponer de coordenadas confiables.</p>
        <p className="mt-2"><Link href="/dashboard/market/cbrs" className="text-[var(--n3-accent)]">Ver histórico CBRS</Link></p>
      </section>
    </WorkspaceShell>
  )
}
