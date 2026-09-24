import Link from 'next/link'
import { ArrowLeft, Clock3, Home, MapPinned, TrendingUp } from 'lucide-react'
import { PublicErrorNotice } from '@/components/feedback/public-error-notice'
import { requirePageCapability } from '@/lib/access-guards'
import { MetricStrip, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import { getHouseSupplySalesLive, getMarketIntelligenceContext, getSupplySalesIntelligence } from '@/lib/market-supply-sales-intelligence'
import { getPedroMarketSnapshot, type PedroMarketTypeSnapshot } from '@/lib/pedro-market-intelligence'

function number(value: number | null, digits = 0) {
  return value === null ? '—' : value.toLocaleString('es-CL', { maximumFractionDigits: digits, minimumFractionDigits: digits })
}

function percent(value: number | null) {
  return value === null ? '—' : `${(value * 100).toFixed(1)}%`
}

function signedPercentPoints(value: number | null) {
  if (value === null) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${(value * 100).toFixed(1)} pp`
}

function periodLabel(value: string | null) {
  if (!value) return '—'
  const parsed = new Date(`${value.slice(0, 10)}T12:00:00Z`)
  return new Intl.DateTimeFormat('es-CL', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(parsed)
}

function dateLabel(value: string | null) {
  if (!value) return '—'
  const parsed = new Date(value)
  return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(parsed)
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

type Point = [number, number]
type Polygon = Point[][]
type GeoShape = { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown }

function parseShape(value: unknown): GeoShape | null {
  const candidate = typeof value === 'string' ? (() => { try { return JSON.parse(value) } catch { return null } })() : value
  if (!candidate || typeof candidate !== 'object') return null
  const shape = candidate as { type?: unknown; coordinates?: unknown }
  if ((shape.type !== 'Polygon' && shape.type !== 'MultiPolygon') || !Array.isArray(shape.coordinates)) return null
  return { type: shape.type, coordinates: shape.coordinates }
}

function polygons(shape: GeoShape): Polygon[] {
  return shape.type === 'Polygon'
    ? [shape.coordinates as Polygon]
    : shape.coordinates as Polygon[]
}

function normalizeNeighborhood(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function signalFill(signal: string | undefined) {
  if (signal === 'asking_well_above_sales') return '#ff8d87'
  if (signal === 'asking_moderately_above_sales') return '#f0c96a'
  if (signal === 'market_aligned') return 'var(--n3-text-muted)'
  if (signal === 'asking_below_sales') return 'var(--n3-accent)'
  return 'var(--n3-line)'
}

function signedPercent(value: number | null) {
  if (value === null) return '—'
  return `${value > 0 ? '+' : ''}${(value * 100).toFixed(1)}%`
}

function sparklinePoints(values: Array<number | null>, width = 280, height = 72) {
  const clean = values.filter((value): value is number => value !== null && Number.isFinite(value))
  if (!clean.length) return ''
  const min = Math.min(...clean)
  const max = Math.max(...clean)
  const span = Math.max(max - min, 1)
  return values.map((value, index) => {
    const x = values.length <= 1 ? width / 2 : (index / (values.length - 1)) * width
    const y = value === null ? height : height - ((value - min) / span) * (height - 8) - 4
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}

function PedroTypePanel({ snapshot }: { snapshot: PedroMarketTypeSnapshot }) {
  const transactionPoints = sparklinePoints(snapshot.annual.map((row) => row.transactions))
  const ufM2Points = sparklinePoints(snapshot.annual.map((row) => row.medianUfM2))
  const label = snapshot.propertyType === 'Casa' ? 'Casas' : 'Departamentos'
  const salesQ = snapshot.salesPriceQuintiles
  const offerQ = snapshot.offerPriceQuintiles

  return <article className="border-t border-[var(--n3-line)] pt-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">{label}</p>
        <h3 className="mt-1 text-xl font-medium text-[var(--n3-text-light)]">{snapshot.latestCompleteYear ?? '—'} · lectura anual verificada</h3>
      </div>
      <span className={`text-[10px] uppercase tracking-[0.12em] ${snapshot.fullSnapshot ? 'text-[var(--n3-accent)]' : 'text-[#f0c96a]'}`}>
        {snapshot.fullSnapshot ? 'Oferta completa verificada' : 'Oferta parcial · no extrapolar'}
      </span>
    </div>

    <div className="mt-4 grid gap-px bg-[var(--n3-line)] sm:grid-cols-2 xl:grid-cols-4">
      {[
        ['Ventas año', number(snapshot.latestTransactions), snapshot.latestCompleteYear ? String(snapshot.latestCompleteYear) : 'Sin año completo'],
        ['Promedio mensual', number(snapshot.averageMonthlySales, 1), 'ventas/mes sobre último año completo'],
        ['vs promedio 4 años', signedPercent(snapshot.latestVs4yAveragePct), 'desviación de volumen'],
        ['YoY', signedPercent(snapshot.latestVsPriorYearPct), 'último año vs anterior'],
      ].map(([metricLabel, metricValue, detail]) => <div key={metricLabel} className="bg-[var(--n3-bg)] px-4 py-3">
        <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--n3-text-muted)]">{metricLabel}</p>
        <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--n3-text-light)]">{metricValue}</p>
        <p className="mt-1 text-[11px] text-[var(--n3-text-muted)]">{detail}</p>
      </div>)}
    </div>

    <div className="mt-5 grid gap-5 lg:grid-cols-2">
      <div>
        <div className="flex items-center justify-between gap-3"><p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Transacciones · 4 años</p><span className="text-[10px] text-[var(--n3-text-muted)]">{snapshot.annual.map((row) => row.year).join(' · ')}</span></div>
        <svg viewBox="0 0 280 72" role="img" aria-label={`Evolución de transacciones de ${label.toLowerCase()}`} className="mt-2 h-[72px] w-full">
          <polyline points={transactionPoints} fill="none" stroke="var(--n3-accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="mt-1 flex justify-between text-[10px] text-[var(--n3-text-muted)]">{snapshot.annual.map((row) => <span key={row.year}>{row.transactions}</span>)}</div>
      </div>
      <div>
        <div className="flex items-center justify-between gap-3"><p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Mediana UF/m² · 4 años</p><span className="text-[10px] text-[var(--n3-text-muted)]">CBRS</span></div>
        <svg viewBox="0 0 280 72" role="img" aria-label={`Evolución UF por metro cuadrado de ${label.toLowerCase()}`} className="mt-2 h-[72px] w-full">
          <polyline points={ufM2Points} fill="none" stroke="var(--n3-text-light)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="mt-1 flex justify-between text-[10px] text-[var(--n3-text-muted)]">{snapshot.annual.map((row) => <span key={row.year}>{number(row.medianUfM2, 1)}</span>)}</div>
      </div>
    </div>

    <div className="mt-5 grid gap-5 lg:grid-cols-2">
      <div className="border-y border-[var(--n3-line)] py-3">
        <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Quintiles de venta · {snapshot.latestCompleteYear ?? '—'}</p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div><p className="text-[10px] text-[var(--n3-text-muted)]">20% más barato ≤</p><p className="mt-1 font-semibold tabular-nums">UF {number(salesQ.p20)}</p></div>
          <div><p className="text-[10px] text-[var(--n3-text-muted)]">Mediana</p><p className="mt-1 font-semibold tabular-nums">UF {number(salesQ.median)}</p></div>
          <div><p className="text-[10px] text-[var(--n3-text-muted)]">20% más caro ≥</p><p className="mt-1 font-semibold tabular-nums">UF {number(salesQ.p80)}</p></div>
        </div>
        <p className="mt-2 text-[10px] text-[var(--n3-text-muted)]">{salesQ.count} transacciones con precio válido · estacionamientos y bodegas no forman parte de estas series Casa/Departamento.</p>
      </div>

      <div className="border-y border-[var(--n3-line)] py-3">
        <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Oferta y absorción</p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div><p className="text-[10px] text-[var(--n3-text-muted)]">Evidencia activa</p><p className="mt-1 font-semibold tabular-nums">{number(snapshot.offerEvidenceCount)}</p></div>
          <div><p className="text-[10px] text-[var(--n3-text-muted)]">Absorción</p><p className="mt-1 font-semibold tabular-nums">{snapshot.absorptionMonths === null ? '—' : `${number(snapshot.absorptionMonths, 1)} meses`}</p></div>
          <div><p className="text-[10px] text-[var(--n3-text-muted)]">Quintil oferta</p><p className="mt-1 font-semibold tabular-nums">{offerQ ? `UF ${number(offerQ.p20)}–${number(offerQ.p80)}` : '—'}</p></div>
        </div>
        <p className="mt-2 text-[10px] leading-4 text-[var(--n3-text-muted)]">{snapshot.fullSnapshot ? 'Oferta, quintiles y meses de absorción usan el snapshot completo acreditado.' : 'La captura disponible no acredita el universo completo de Portal; el sistema muestra evidencia observada pero bloquea absorción y quintiles de oferta para no extrapolar una muestra parcial.'}</p>
      </div>
    </div>
  </article>
}

export default async function MarketIntelligencePage() {
  await requirePageCapability('market.read')
  const [intelligence, context, houses, pedroResult] = await Promise.all([
    getSupplySalesIntelligence(),
    getMarketIntelligenceContext(),
    getHouseSupplySalesLive(),
    getPedroMarketSnapshot()
      .then((snapshot) => ({ snapshot, error: null as string | null }))
      .catch((error) => ({ snapshot: null, error: error instanceof Error ? error.message : 'No fue posible consultar la lectura ejecutiva.' })),
  ])
  const pedro = pedroResult.snapshot
  const apartments = intelligence.rows.filter((row) => row.propertyType === 'Departamento' && row.neighborhoodName !== 'SIN_BARRIO')
  const liveHouses = houses.rows.filter((row) => row.neighborhoodName)
  const houseListings = liveHouses.reduce((total, row) => total + row.portalListings, 0)
  const housePortalCut = liveHouses.map((row) => row.asOfPortal).filter((value): value is string => Boolean(value)).sort().at(-1) ?? null
  const houseCbrsCut = liveHouses.map((row) => row.asOfCbrs).filter((value): value is string => Boolean(value)).sort().at(-1) ?? null
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

  const signalByNeighborhood = new Map(apartments.map((row) => [normalizeNeighborhood(row.neighborhoodName), row]))
  const mapped = context.geometries
    .map((row) => ({ ...row, shape: parseShape(row.geometry), signal: signalByNeighborhood.get(normalizeNeighborhood(row.neighborhoodName)) }))
    .filter((row) => row.shape)
  const allPoints = mapped.flatMap((row) => polygons(row.shape!).flatMap((polygon) => polygon.flat()))
  const longitudes = allPoints.map(([lon]) => lon)
  const latitudes = allPoints.map(([, lat]) => lat)
  const minLon = longitudes.length ? Math.min(...longitudes) : 0
  const maxLon = longitudes.length ? Math.max(...longitudes) : 1
  const minLat = latitudes.length ? Math.min(...latitudes) : 0
  const maxLat = latitudes.length ? Math.max(...latitudes) : 1
  const width = Math.max(maxLon - minLon, 0.0001)
  const height = Math.max(maxLat - minLat, 0.0001)
  const project = ([lon, lat]: Point) => [30 + ((lon - minLon) / width) * 940, 30 + ((maxLat - lat) / height) * 540]
  const pathFor = (polygon: Polygon) => polygon.map((ring) => `${ring.map((point, index) => {
    const [x, y] = project(point)
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')} Z`).join(' ')

  const periods = [...context.historyPeriods].sort()
  const latestPeriod = periods.at(-1) ?? null
  const previousPeriod = periods.at(-2) ?? null
  const latestRows = context.history.filter((row) => row.periodStart === latestPeriod && (!row.propertyType || row.propertyType === 'Departamento'))
  const previousByNeighborhood = new Map(
    context.history
      .filter((row) => row.periodStart === previousPeriod && (!row.propertyType || row.propertyType === 'Departamento') && row.neighborhoodName)
      .map((row) => [normalizeNeighborhood(row.neighborhoodName!), row]),
  )
  const movements = previousPeriod
    ? latestRows.flatMap((row) => {
        if (!row.neighborhoodName) return []
        const previous = previousByNeighborhood.get(normalizeNeighborhood(row.neighborhoodName))
        if (!previous || row.offerToSalesRatio === null || previous.offerToSalesRatio === null) return []
        return [{ neighborhoodName: row.neighborhoodName, delta: row.offerToSalesRatio - previous.offerToSalesRatio }]
      }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 5)
    : []

  return (
    <WorkspaceShell>
      <WorkspaceHeader
        eyebrow="Mercado"
        title="Oferta vs ventas"
        meta="Casas live + referencia de departamentos + CBRS + barrios KML Property Partners"
        actions={[{ label: 'Volver', href: '/dashboard/market', icon: <ArrowLeft size={15} /> }]}
      />

      {intelligence.error ? <div className="mt-4"><PublicErrorNotice compact message="No fue posible consultar la referencia de departamentos versus ventas." /></div> : null}
      {houses.error ? <div className="mt-4"><PublicErrorNotice compact message="No fue posible consultar la oferta activa de casas versus ventas." /></div> : null}
      {context.error ? <div className="mt-4"><PublicErrorNotice compact message="La capa territorial o histórica no está disponible completa." /></div> : null}
      {pedroResult.error ? <div className="mt-4"><PublicErrorNotice compact message="No fue posible consultar la lectura Pedro de 4 años y quintiles." /></div> : null}

      {pedro ? <section className="mt-7">
        <div className="border-b border-[var(--n3-line)] pb-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">01 · Lectura Pedro</p>
          <h2 className="mt-1 text-lg font-medium text-[var(--n3-text-light)]">4 años, desviaciones, velocidad de venta y quintiles</h2>
          <p className="mt-1 max-w-4xl text-xs leading-5 text-[var(--n3-text-muted)]">Casas y departamentos se leen por separado. Las líneas usan años completos CBRS. La oferta sólo habilita absorción y quintiles cuando existe un snapshot Portal completo; una captura parcial nunca se presenta como mercado total.</p>
        </div>
        <div className="mt-4 grid gap-8">
          <PedroTypePanel snapshot={pedro.houses} />
          <PedroTypePanel snapshot={pedro.apartments} />
        </div>
        {pedro.warnings.length ? <details className="mt-5 border-y border-[var(--n3-line)] py-3">
          <summary className="cursor-pointer text-xs text-[var(--n3-text-muted)]">Ver límites de cobertura actuales</summary>
          <div className="mt-3 space-y-1 text-[11px] leading-5 text-[var(--n3-text-muted)]">{pedro.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div>
        </details> : null}
      </section> : null}

      <MetricStrip items={[
        { label: 'Casas activas', value: number(houseListings) },
        { label: 'Barrios con casas', value: number(liveHouses.length) },
        { label: 'Deptos muy sobre ventas', value: number(strongGap.length), tone: strongGap.length ? 'warning' : 'default' },
        { label: 'Confianza alta deptos', value: percent(apartments.length ? highConfidence.length / apartments.length : null) },
      ]} />

      <section className="mt-7">
        <div className="flex flex-col gap-2 border-b border-[var(--n3-line)] pb-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2"><Home size={15} className="text-[var(--n3-accent)]" /><h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Casas · oferta activa</h2></div>
            <p className="mt-1 text-xs text-[var(--n3-text-muted)]">Avisos activos con barrio KML canónico versus compraventas CBRS. La mediana UF/m² se deriva de precio UF / superficie construida y excluye avisos sin superficie construida válida. Se publica la brecha observada; no se inventa una señal comercial para casas.</p>
          </div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Portal {dateLabel(housePortalCut)} · CBRS {dateLabel(houseCbrsCut)}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="border-b border-[var(--n3-line)] text-left text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">
              <tr><th className="py-3 pr-4">Barrio</th><th className="py-3 pr-4 text-right">Avisos live</th><th className="py-3 pr-4 text-right">Ventas CBRS</th><th className="py-3 pr-4 text-right">Portal UF/m² const.</th><th className="py-3 pr-4 text-right">CBRS UF/m² const.</th><th className="py-3 text-right">Brecha UF/m² const.</th></tr>
            </thead>
            <tbody className="divide-y divide-[var(--n3-line)]">
              {liveHouses.length ? liveHouses.map((row) => (
                <tr key={row.neighborhoodName}>
                  <td className="py-3 pr-4"><p className="font-medium text-[var(--n3-text-light)]">{row.neighborhoodName}</p><p className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-[var(--n3-text-muted)]">Corte {dateLabel(row.asOfPortal)}</p></td>
                  <td className="py-3 pr-4 text-right font-semibold tabular-nums">{number(row.portalListings)}</td>
                  <td className="py-3 pr-4 text-right tabular-nums">{number(row.cbrsTransactions)}</td>
                  <td className="py-3 pr-4 text-right tabular-nums">{number(row.portalMedianUfM2, 1)}</td>
                  <td className="py-3 pr-4 text-right tabular-nums">{number(row.cbrsMedianUfM2, 1)}</td>
                  <td className="py-3 text-right font-semibold tabular-nums">{percent(row.ufM2GapPct)}</td>
                </tr>
              )) : <tr><td colSpan={6} className="py-8 text-sm text-[var(--n3-text-muted)]">No hay casas activas con barrio KML resoluble para este corte.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="border-t border-[var(--n3-line)] pt-4">
          <div className="flex items-center gap-2"><TrendingUp size={15} className="text-[var(--n3-accent)]" /><h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Lectura ejecutiva · departamentos</h2></div>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-[var(--n3-text-light)]">En la referencia de departamentos, la brecha mediana de publicación versus compraventas es <span className="font-semibold tabular-nums">{percent(medianGap)}</span>. {strongGap.length} barrios presentan una brecha alta y {aboveMarket.length} una brecha moderada; {aligned.length} se encuentran alineados con ventas observadas.</p>
          <p className="mt-2 text-xs leading-relaxed text-[var(--n3-text-muted)]">Esta referencia prioriza revisión comercial y conversación de precio. No reemplaza la valorización individual ni modifica la inteligencia canónica de mercado.</p>
        </div>
        <div className="border-t border-[var(--n3-line)] pt-4">
          <div className="flex items-center justify-between gap-3"><h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Prioridad de revisión · departamentos</h2><span className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Confianza alta</span></div>
          <div className="mt-2 divide-y divide-[var(--n3-line)]">{priority.map((row, index) => <div key={row.neighborhoodName} className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3 py-2.5"><span className="text-xs tabular-nums text-[var(--n3-text-muted)]">{String(index + 1).padStart(2, '0')}</span><span className="truncate text-sm text-[var(--n3-text-light)]">{row.neighborhoodName}</span><span className="text-sm font-semibold tabular-nums">{percent(row.ufM2GapPct)}</span></div>)}</div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="border-t border-[var(--n3-line)] pt-4">
          <div className="flex items-center gap-2"><MapPinned size={15} className="text-[var(--n3-accent)]" /><h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Mapa de presión de precio · departamentos</h2></div>
          <p className="mt-1 text-xs text-[var(--n3-text-muted)]">Polígonos KML Property Partners coloreados por la señal de referencia Portal vs CBRS para departamentos. El mapa expresa señal relativa, no valorización.</p>
          {mapped.length ? (
            <div className="mt-4 overflow-hidden border border-[var(--n3-line)] bg-white/[0.015]">
              <svg viewBox="0 0 1000 600" role="img" aria-label="Mapa de barrios de Vitacura según brecha entre oferta y ventas" className="block h-auto w-full">
                {mapped.map((row) => polygons(row.shape!).map((polygon, index) => (
                  <path key={`${row.neighborhoodName}-${index}`} d={pathFor(polygon)} fill={signalFill(row.signal?.signal)} fillOpacity="0.68" stroke="var(--n3-bg)" strokeWidth="2" fillRule="evenodd">
                    <title>{row.neighborhoodName}: {signalLabel[row.signal?.signal ?? ''] ?? 'Sin señal'} · {percent(row.signal?.ufM2GapPct ?? null)}</title>
                  </path>
                )))}
              </svg>
            </div>
          ) : <div className="mt-4 border-y border-[var(--n3-line)] py-8 text-sm text-[var(--n3-text-muted)]">No hay geometrías canónicas disponibles para dibujar el mapa.</div>}
        </div>
        <div className="border-t border-[var(--n3-line)] pt-4">
          <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Leyenda</h2>
          <div className="mt-3 space-y-3 text-sm">
            {[['#ff8d87','Muy sobre ventas'],['#f0c96a','Sobre ventas'],['var(--n3-text-muted)','Alineado'],['var(--n3-line)','Sin señal publicable']].map(([color,label]) => <div key={label} className="flex items-center gap-3"><span className="h-3 w-3" style={{ background: color }} /><span>{label}</span></div>)}
          </div>
          <p className="mt-5 text-xs leading-relaxed text-[var(--n3-text-muted)]">Lectura recomendada: partir por los barrios con mayor brecha y confianza alta; después revisar profundidad de oferta y muestra CBRS antes de cualquier decisión comercial.</p>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
        <div className="border-t border-[var(--n3-line)] pt-4">
          <div className="flex items-center gap-2"><Clock3 size={15} className="text-[var(--n3-accent)]" /><h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Evolución temporal</h2></div>
          <p className="mt-3 text-3xl font-semibold tabular-nums text-[var(--n3-text-light)]">{periods.length}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">cortes canónicos disponibles</p>
          <p className="mt-4 text-sm leading-relaxed text-[var(--n3-text-light)]">{periods.length >= 2 ? `Comparación ${periodLabel(previousPeriod)} → ${periodLabel(latestPeriod)} habilitada.` : `Existe un solo corte canónico (${periodLabel(latestPeriod)}). La tendencia se habilitará automáticamente con el segundo corte, sin estimar historia inexistente.`}</p>
        </div>
        <div className="border-t border-[var(--n3-line)] pt-4">
          <div className="flex items-center justify-between gap-3"><h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Mayor cambio oferta / ventas</h2><span className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{previousPeriod ? `${periodLabel(previousPeriod)} → ${periodLabel(latestPeriod)}` : 'Esperando segundo corte'}</span></div>
          {movements.length ? <div className="mt-2 divide-y divide-[var(--n3-line)]">{movements.map((row) => <div key={row.neighborhoodName} className="flex items-center justify-between gap-4 py-3"><span className="text-sm text-[var(--n3-text-light)]">{row.neighborhoodName}</span><span className="text-sm font-semibold tabular-nums">{signedPercentPoints(row.delta)}</span></div>)}</div> : <div className="mt-3 border-y border-[var(--n3-line)] py-7 text-sm text-[var(--n3-text-muted)]">Aún no existe un segundo período comparable. No se publica una tendencia hasta contar con evidencia canónica.</div>}
        </div>
      </section>

      <section className="mt-8">
        <div className="border-b border-[var(--n3-line)] pb-2"><h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Departamentos por barrio · referencia histórica</h2><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Mediana UF/m² publicada versus mediana UF/m² de compraventas CBRS consolidadas.</p></div>
        <div className="divide-y divide-[var(--n3-line)]">{apartments.length ? apartments.map((row) => (
          <div key={row.neighborhoodName} className="grid gap-3 py-4 lg:grid-cols-[minmax(180px,1.3fr)_repeat(5,minmax(100px,1fr))] lg:items-center">
            <div><p className="text-sm font-semibold text-[var(--n3-text-light)]">{row.neighborhoodName}</p><p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{signalLabel[row.signal] ?? row.signal} · confianza {confidenceLabel[row.confidence] ?? row.confidence}</p></div>
            <div><p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Portal</p><p className="mt-1 text-base font-semibold tabular-nums">{number(row.portalListings)} avisos</p></div>
            <div><p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">CBRS</p><p className="mt-1 text-base font-semibold tabular-nums">{number(row.cbrsTransactions)} ventas</p></div>
            <div><p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Portal UF/m²</p><p className="mt-1 text-base font-semibold tabular-nums">{number(row.portalMedianUfM2, 1)}</p></div>
            <div><p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">CBRS UF/m²</p><p className="mt-1 text-base font-semibold tabular-nums">{number(row.cbrsMedianUfM2, 1)}</p></div>
            <div><p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Brecha UF/m²</p><p className="mt-1 text-base font-semibold tabular-nums">{percent(row.ufM2GapPct)}</p></div>
          </div>
        )) : <div className="py-8 text-sm text-[var(--n3-text-muted)]">No hay barrios con datos suficientes para publicar una señal.</div>}</div>
      </section>

      <section className="mt-6 border-t border-[var(--n3-line)] pt-4 text-xs leading-relaxed text-[var(--n3-text-muted)]">
        <p>Casas usa oferta activa con barrio KML resuelto. Su UF/m² se deriva de precio UF / superficie construida cuando esa superficie existe; los avisos sin superficie construida siguen contando como oferta pero no entran a esa mediana. No se asigna una clasificación comercial nueva. Departamentos conserva la referencia histórica y sus señales existentes.</p>
        <p className="mt-2"><Link href="/dashboard/market/cbrs" className="text-[var(--n3-accent)]">Ver histórico CBRS</Link></p>
      </section>
    </WorkspaceShell>
  )
}
