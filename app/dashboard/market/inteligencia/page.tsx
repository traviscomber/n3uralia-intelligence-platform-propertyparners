import Link from 'next/link'
import { ArrowLeft, TrendingUp } from 'lucide-react'
import { PublicErrorNotice } from '@/components/feedback/public-error-notice'
import { MetricStrip, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
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

const confidenceLabel: Record<string, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
}

export default async function MarketIntelligencePage() {
  const intelligence = await getSupplySalesIntelligence()
  const apartments = intelligence.rows.filter((row) => row.propertyType === 'Departamento' && row.neighborhoodName !== 'SIN_BARRIO')
  const strongGap = apartments.filter((row) => row.signal === 'asking_well_above_sales')
  const aboveMarket = apartments.filter((row) => row.signal === 'asking_moderately_above_sales')
  const aligned = apartments.filter((row) => row.signal === 'market_aligned')
  const highConfidence = apartments.filter((row) => row.confidence === 'high')
  const validGaps = apartments.filter((row) => row.ufM2GapPct !== null)
  const medianGap = validGaps.length
    ? [...validGaps].sort((a, b) => (a.ufM2GapPct ?? 0) - (b.ufM2GapPct ?? 0))[Math.floor(validGaps.length / 2)].ufM2GapPct
    : null
  const priority = [...apartments]
    .filter((row) => row.ufM2GapPct !== null && row.confidence === 'high')
    .sort((a, b) => Math.abs(b.ufM2GapPct ?? 0) - Math.abs(a.ufM2GapPct ?? 0))
    .slice(0, 5)

  return (
    <WorkspaceShell>
      <WorkspaceHeader
        eyebrow="Mercado"
        title="Oferta vs ventas"
        meta="Portal Inmobiliario + CBRS + barrios KML Property Partners"
        actions={[{ label: 'Volver', href: '/dashboard/market', icon: <ArrowLeft size={15} /> }]}
      />

      {intelligence.error ? <div className="mt-4"><PublicErrorNotice compact message="No fue posible consultar la inteligencia de oferta versus ventas." /></div> : null}

      <MetricStrip items={[
        { label: 'Barrios analizados', value: number(apartments.length) },
        { label: 'Muy sobre ventas', value: number(strongGap.length), tone: strongGap.length ? 'warning' : 'default' },
        { label: 'Alineados', value: number(aligned.length) },
        { label: 'Confianza alta', value: percent(apartments.length ? highConfidence.length / apartments.length : null) },
      ]} />

      <section className="mt-7 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="border-t border-[var(--n3-line)] pt-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={15} className="text-[var(--n3-accent)]" />
            <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Lectura ejecutiva</h2>
          </div>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-[var(--n3-text-light)]">
            La brecha mediana de publicación versus compraventas es <span className="font-semibold tabular-nums">{percent(medianGap)}</span>. {strongGap.length} barrios presentan una brecha alta y {aboveMarket.length} una brecha moderada; {aligned.length} se encuentran alineados con ventas observadas.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-[var(--n3-text-muted)]">
            Esta capa sirve para priorizar revisión comercial y conversación de precio. No reemplaza la valorización individual ni modifica la inteligencia canónica de mercado.
          </p>
        </div>

        <div className="border-t border-[var(--n3-line)] pt-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Prioridad de revisión</h2>
            <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Confianza alta</span>
          </div>
          <div className="mt-2 divide-y divide-[var(--n3-line)]">
            {priority.map((row, index) => (
              <div key={row.neighborhoodName} className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3 py-2.5">
                <span className="text-xs tabular-nums text-[var(--n3-text-muted)]">{String(index + 1).padStart(2, '0')}</span>
                <span className="truncate text-sm text-[var(--n3-text-light)]">{row.neighborhoodName}</span>
                <span className="text-sm font-semibold tabular-nums">{percent(row.ufM2GapPct)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="border-b border-[var(--n3-line)] pb-2">
          <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Departamentos por barrio</h2>
          <p className="mt-1 text-xs text-[var(--n3-text-muted)]">Mediana UF/m² publicada versus mediana UF/m² de compraventas CBRS consolidadas.</p>
        </div>

        <div className="divide-y divide-[var(--n3-line)]">
          {apartments.length ? apartments.map((row) => (
            <div key={row.neighborhoodName} className="grid gap-3 py-4 lg:grid-cols-[minmax(180px,1.3fr)_repeat(5,minmax(100px,1fr))] lg:items-center">
              <div>
                <p className="text-sm font-semibold text-[var(--n3-text-light)]">{row.neighborhoodName}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{signalLabel[row.signal] ?? row.signal} · confianza {confidenceLabel[row.confidence] ?? row.confidence}</p>
              </div>
              <div><p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Portal</p><p className="mt-1 text-base font-semibold tabular-nums">{number(row.portalListings)} avisos</p></div>
              <div><p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">CBRS</p><p className="mt-1 text-base font-semibold tabular-nums">{number(row.cbrsTransactions)} ventas</p></div>
              <div><p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Portal UF/m²</p><p className="mt-1 text-base font-semibold tabular-nums">{number(row.portalMedianUfM2, 1)}</p></div>
              <div><p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">CBRS UF/m²</p><p className="mt-1 text-base font-semibold tabular-nums">{number(row.cbrsMedianUfM2, 1)}</p></div>
              <div><p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Brecha UF/m²</p><p className="mt-1 text-base font-semibold tabular-nums">{percent(row.ufM2GapPct)}</p></div>
            </div>
          )) : <div className="py-8 text-sm text-[var(--n3-text-muted)]">No hay barrios con datos suficientes para publicar una señal.</div>}
        </div>
      </section>

      <section className="mt-6 border-t border-[var(--n3-line)] pt-4 text-xs text-[var(--n3-text-muted)]">
        <p>Casas: la referencia Portal entregada no trae geocodificación por barrio, por lo que no se publica una señal territorial hasta disponer de coordenadas confiables.</p>
        <p className="mt-2"><Link href="/dashboard/market/cbrs" className="text-[var(--n3-accent)]">Ver histórico CBRS</Link></p>
      </section>
    </WorkspaceShell>
  )
}
