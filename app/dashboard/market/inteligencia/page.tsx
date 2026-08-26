import Link from 'next/link'
import { ArrowLeft, Clock3, MapPinned, TrendingUp } from 'lucide-react'
import { PublicErrorNotice } from '@/components/feedback/public-error-notice'
import { MetricStrip, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import { getMarketIntelligenceContext, getSupplySalesIntelligence } from '@/lib/market-supply-sales-intelligence'

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

export default async function MarketIntelligencePage() {
  const [intelligence, context] = await Promise.all([
    getSupplySalesIntelligence(),
    getMarketIntelligenceContext(),
  ])
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
        meta="Portal Inmobiliario + CBRS + barrios KML Property Partners"
        actions={[{ label: 'Volver', href: '/dashboard/market', icon: <ArrowLeft size={15} /> }]}
      />

      {intelligence.error ? <div className="mt-4"><PublicErrorNotice compact message="No fue posible consultar la inteligencia de oferta versus ventas." /></div> : null}
      {context.error ? <div className="mt-4"><PublicErrorNotice compact message="La capa territorial o histórica no está disponible completa." /></div> : null}

      <MetricStrip items={[
        { label: 'Barrios analizados', value: number(apartments.length) },
        { label: 'Muy sobre ventas', value: number(strongGap.length), tone: strongGap.length ? 'warning' : 'default' },
        { label: 'Alineados', value: number(aligned.length) },
        { label: 'Confianza alta', value: percent(apartments.length ? highConfidence.length / apartments.length : null) },
      ]} />

      <section className="mt-7 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="border-t border-[var(--n3-line)] pt-4">
          <div className="flex items-center gap-2"><TrendingUp size={15} className="text-[var(--n3-accent)]" /><h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Lectura ejecutiva</h2></div>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-[var(--n3-text-light)]">La brecha mediana de publicación versus compraventas es <span className="font-semibold tabular-nums">{percent(medianGap)}</span>. {strongGap.length} barrios presentan una brecha alta y {aboveMarket.length} una brecha moderada; {aligned.length} se encuentran alineados con ventas observadas.</p>
          <p className="mt-2 text-xs leading-relaxed text-[var(--n3-text-muted)]">Esta capa prioriza revisión comercial y conversación de precio. No reemplaza la valorización individual ni modifica la inteligencia canónica de mercado.</p>
        </div>
        <div className="border-t border-[var(--n3-line)] pt-4">
          <div className="flex items-center justify-between gap-3"><h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Prioridad de revisión</h2><span className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Confianza alta</span></div>
          <div className="mt-2 divide-y divide-[var(--n3-line)]">{priority.map((row, index) => <div key={row.neighborhoodName} className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3 py-2.5"><span className="text-xs tabular-nums text-[var(--n3-text-muted)]">{String(index + 1).padStart(2, '0')}</span><span className="truncate text-sm text-[var(--n3-text-light)]">{row.neighborhoodName}</span><span className="text-sm font-semibold tabular-nums">{percent(row.ufM2GapPct)}</span></div>)}</div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="border-t border-[var(--n3-line)] pt-4">
          <div className="flex items-center gap-2"><MapPinned size={15} className="text-[var(--n3-accent)]" /><h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Mapa de presión de precio</h2></div>
          <p className="mt-1 text-xs text-[var(--n3-text-muted)]">Polígonos KML Property Partners coloreados por señal Portal vs CBRS. El mapa expresa señal relativa, no valorización.</p>
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
        <div className="border-b border-[var(--n3-line)] pb-2"><h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Departamentos por barrio</h2><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Mediana UF/m² publicada versus mediana UF/m² de compraventas CBRS consolidadas.</p></div>
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

      <section className="mt-6 border-t border-[var(--n3-line)] pt-4 text-xs text-[var(--n3-text-muted)]">
        <p>Casas: la referencia Portal entregada no trae geocodificación por barrio, por lo que no se publica una señal territorial hasta disponer de coordenadas confiables.</p>
        <p className="mt-2"><Link href="/dashboard/market/cbrs" className="text-[var(--n3-accent)]">Ver histórico CBRS</Link></p>
      </section>
    </WorkspaceShell>
  )
}
