import { requirePageCapability } from '@/lib/access-guards'
import { getPedroMarketSnapshot, type PedroMarketTypeSnapshot } from '@/lib/pedro-market-intelligence'
import { WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'

function n(value: number | null, digits = 0) {
  return value == null ? '—' : value.toLocaleString('es-CL', { maximumFractionDigits: digits, minimumFractionDigits: digits })
}

function pct(value: number | null) {
  if (value == null) return '—'
  return `${value > 0 ? '+' : ''}${(value * 100).toFixed(1)}%`
}

function spark(values: Array<number | null>, width = 300, height = 72) {
  const clean = values.filter((value): value is number => value != null && Number.isFinite(value))
  if (!clean.length) return ''
  const min = Math.min(...clean)
  const max = Math.max(...clean)
  const span = Math.max(max - min, 1)
  return values.map((value, index) => {
    const x = values.length <= 1 ? width / 2 : (index / (values.length - 1)) * width
    const y = value == null ? height : height - ((value - min) / span) * (height - 8) - 4
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}

function TypeBlock({ snapshot }: { snapshot: PedroMarketTypeSnapshot }) {
  const label = snapshot.propertyType === 'Casa' ? 'Casas' : 'Departamentos'
  const sales = snapshot.salesPriceQuintiles
  const portalFunnel = [
    ['Portal reporta', snapshot.portalReportedCount],
    ['Candidatos leídos', snapshot.rawListingCandidates],
    ['Duplicados técnicos', snapshot.duplicateListingCandidates],
    ['Únicos descubiertos', snapshot.uniqueListingsDiscovered],
    ['Filas válidas', snapshot.validListingRows],
  ] as const

  return <section className="border-t border-[var(--n3-line)] pt-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--n3-accent)]">{label}</p>
        <h2 className="mt-1 text-2xl font-medium text-[var(--n3-text-light)]">Mercado, velocidad y posición</h2>
      </div>
      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{snapshot.captureFilterLabel}</p>
    </div>

    <div className="mt-5 grid gap-px bg-[var(--n3-line)] sm:grid-cols-2 xl:grid-cols-4">
      {[
        ['Ventas último año', n(snapshot.latestTransactions), String(snapshot.latestCompleteYear ?? '—')],
        ['Promedio mensual', n(snapshot.averageMonthlySales, 1), 'ventas / mes'],
        ['YoY', pct(snapshot.latestVsPriorYearPct), 'último año vs anterior'],
        ['vs promedio 4 años', pct(snapshot.latestVs4yAveragePct), 'desviación de volumen'],
      ].map(([labelText, value, detail]) => <div key={labelText} className="bg-[var(--n3-bg)] p-4">
        <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{labelText}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        <p className="mt-1 text-[11px] text-[var(--n3-text-muted)]">{detail}</p>
      </div>)}
    </div>

    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <div>
        <div className="flex items-center justify-between"><p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Transacciones · 4 años</p><span className="text-[10px] text-[var(--n3-text-muted)]">CBRS</span></div>
        <svg viewBox="0 0 300 72" role="img" aria-label={`Evolución de ventas de ${label}`} className="mt-2 h-[72px] w-full">
          <polyline points={spark(snapshot.annual.map((row) => row.transactions))} fill="none" stroke="var(--n3-accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="mt-1 flex justify-between text-[10px] text-[var(--n3-text-muted)]">{snapshot.annual.map((row) => <span key={row.year}>{row.year}<br />{row.transactions}</span>)}</div>
      </div>
      <div>
        <div className="flex items-center justify-between"><p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Mediana UF/m² · 4 años</p><span className="text-[10px] text-[var(--n3-text-muted)]">CBRS</span></div>
        <svg viewBox="0 0 300 72" role="img" aria-label={`Evolución UF por metro cuadrado de ${label}`} className="mt-2 h-[72px] w-full">
          <polyline points={spark(snapshot.annual.map((row) => row.medianUfM2))} fill="none" stroke="var(--n3-text-light)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="mt-1 flex justify-between text-[10px] text-[var(--n3-text-muted)]">{snapshot.annual.map((row) => <span key={row.year}>{row.year}<br />{n(row.medianUfM2, 1)}</span>)}</div>
      </div>
    </div>

    <div className="mt-6">
      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Funnel Portal</p>
      <div className="mt-2 grid gap-px bg-[var(--n3-line)] sm:grid-cols-2 lg:grid-cols-5">
        {portalFunnel.map(([labelText, value]) => <div key={labelText} className="bg-[var(--n3-bg)] p-4">
          <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--n3-text-muted)]">{labelText}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{n(value)}</p>
        </div>)}
      </div>
      <p className="mt-2 text-[11px] leading-5 text-[var(--n3-text-muted)]">{snapshot.portalReportedCount == null
        ? 'Las capturas históricas no persistieron el total que Portal reportaba. Desde la próxima captura el sistema guardará total publicado, filtro exacto, candidatos, duplicados y cobertura.'
        : snapshot.discoveryExhausted && !snapshot.discoveryCapped
          ? 'Descubrimiento agotado: el recorrido puede auditarse contra el total reportado por Portal.'
          : 'Captura parcial: el número reportado por Portal es válido como referencia de fuente, pero la captura no se presenta como inventario total.'}</p>
    </div>

    <div className="mt-6 grid gap-5 lg:grid-cols-2">
      <div className="border-y border-[var(--n3-line)] py-4">
        <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Quintiles de venta</p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div><p className="text-[10px] text-[var(--n3-text-muted)]">Oportunidad · 20% bajo</p><p className="mt-1 font-semibold tabular-nums">≤ UF {n(sales.p20)}</p></div>
          <div><p className="text-[10px] text-[var(--n3-text-muted)]">Mediana</p><p className="mt-1 font-semibold tabular-nums">UF {n(sales.median)}</p></div>
          <div><p className="text-[10px] text-[var(--n3-text-muted)]">20% alto</p><p className="mt-1 font-semibold tabular-nums">≥ UF {n(sales.p80)}</p></div>
        </div>
        <p className="mt-2 text-[11px] text-[var(--n3-text-muted)]">El 20% inferior es una señal para revisar una oportunidad de “cazar la casa”; no elimina automáticamente comparables.</p>
      </div>
      <div className="border-y border-[var(--n3-line)] py-4">
        <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Oferta y absorción</p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div><p className="text-[10px] text-[var(--n3-text-muted)]">Evidencia activa</p><p className="mt-1 font-semibold">{n(snapshot.offerEvidenceCount)}</p></div>
          <div><p className="text-[10px] text-[var(--n3-text-muted)]">Absorción</p><p className="mt-1 font-semibold">{snapshot.absorptionMonths == null ? '—' : `${n(snapshot.absorptionMonths, 1)} meses`}</p></div>
          <div><p className="text-[10px] text-[var(--n3-text-muted)]">Cobertura</p><p className="mt-1 font-semibold">{snapshot.fullSnapshot ? 'Completa' : 'Parcial'}</p></div>
        </div>
      </div>
    </div>
  </section>
}

export default async function PedroMarketPage() {
  await requirePageCapability('market.read')
  const snapshot = await getPedroMarketSnapshot()

  return <WorkspaceShell>
    <WorkspaceHeader
      eyebrow="Mercado · Dirección"
      title="Lectura Pedro"
      meta="4 años · Portal → filtros → mercado · casas y departamentos separados"
      actions={[{ label: 'Volver a Mercado', href: '/dashboard/market' }]}
    />
    <div className="mt-6 space-y-10">
      <TypeBlock snapshot={snapshot.houses} />
      <TypeBlock snapshot={snapshot.apartments} />
    </div>
    {snapshot.warnings.length ? <details className="mt-8 border-y border-[var(--n3-line)] py-4">
      <summary className="cursor-pointer text-xs text-[var(--n3-text-muted)]">Cobertura y límites actuales</summary>
      <div className="mt-3 space-y-1 text-[11px] leading-5 text-[var(--n3-text-muted)]">{snapshot.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div>
    </details> : null}
  </WorkspaceShell>
}
