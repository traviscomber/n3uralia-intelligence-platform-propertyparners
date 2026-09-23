import Link from 'next/link'
import { CalculationTrace } from '@/components/market/calculation-trace'
import { WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import { requireAnyPageCapability } from '@/lib/access-guards'
import { createClient } from '@/lib/supabase/server'

type YearRow = {
  year: number
  transactions: number
  median_price_uf: number | string | null
  median_uf_m2: number | string | null
  observed_at: string
}

function n(value: number | string | null | undefined) {
  if (value == null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function number(value: number | null, digits = 0) {
  return value == null ? '—' : value.toLocaleString('es-CL', { maximumFractionDigits: digits, minimumFractionDigits: digits })
}

function pct(current: number | null, previous: number | null) {
  if (current == null || previous == null || previous === 0) return null
  return (current / previous) - 1
}

function percent(value: number | null) {
  if (value == null) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${(value * 100).toFixed(1)}%`
}

function points(values: Array<number | null>) {
  const clean = values.filter((value): value is number => value != null)
  if (!clean.length) return ''
  const min = Math.min(...clean)
  const max = Math.max(...clean)
  const span = Math.max(max - min, 1)
  return values.map((value, index) => {
    if (value == null) return null
    const x = values.length === 1 ? 50 : 6 + (index / (values.length - 1)) * 88
    const y = 88 - ((value - min) / span) * 72
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).filter(Boolean).join(' ')
}

export default async function MarketEvolutionPage() {
  await requireAnyPageCapability(['market.manage_sources', 'management.global.read', 'management.office.read'])

  const supabase = await createClient()
  const lastCompleteYear = new Date().getFullYear() - 1
  const [historyResult, liveRangeResult] = await Promise.all([
    supabase
      .from('market_cbrs_reference_metrics')
      .select('year,transactions,median_price_uf,median_uf_m2,observed_at')
      .eq('scope', 'year')
      .eq('property_type', 'Casa')
      .lte('year', lastCompleteYear)
      .order('year', { ascending: false })
      .limit(4),
    supabase
      .from('market_listing_history')
      .select('first_seen_at,last_seen_at', { count: 'exact' })
      .order('first_seen_at', { ascending: true })
      .limit(1),
  ])

  const years = ((historyResult.data ?? []) as YearRow[]).sort((a, b) => a.year - b.year)
  const liveFirstSeen = liveRangeResult.data?.[0]?.first_seen_at ?? null
  const txPoints = points(years.map((row) => n(row.transactions)))
  const pricePoints = points(years.map((row) => n(row.median_price_uf)))
  const latest = years.at(-1) ?? null
  const previous = years.at(-2) ?? null
  const latestTx = n(latest?.transactions)
  const previousTx = n(previous?.transactions)
  const latestPrice = n(latest?.median_price_uf)
  const previousPrice = n(previous?.median_price_uf)
  const latestUfM2 = n(latest?.median_uf_m2)
  const previousUfM2 = n(previous?.median_uf_m2)

  return (
    <WorkspaceShell>
      <WorkspaceHeader
        eyebrow="Mercado · Evolución"
        title="4 años de mercado"
        meta="Casas · Vitacura · CBRS canónico"
        actions={[{ label: 'Volver a Mercado', href: '/dashboard/market' }]}
      />

      {historyResult.error ? (
        <div className="mt-6 border border-[#ff8d87]/50 p-4 text-sm text-[#ff8d87]">
          No fue posible cargar la serie histórica CBRS.
        </div>
      ) : null}

      <section className="mt-6 grid gap-px bg-[var(--n3-line)] sm:grid-cols-3">
        <div className="bg-[var(--n3-bg)] p-4">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Ventas · último año completo</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{number(latestTx)}</p>
          <p className="mt-1 text-xs text-[var(--n3-text-muted)]">YoY {percent(pct(latestTx, previousTx))}</p>
        </div>
        <div className="bg-[var(--n3-bg)] p-4">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Mediana precio</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">UF {number(latestPrice, 0)}</p>
          <p className="mt-1 text-xs text-[var(--n3-text-muted)]">YoY {percent(pct(latestPrice, previousPrice))}</p>
        </div>
        <div className="bg-[var(--n3-bg)] p-4">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Mediana UF/m²</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{number(latestUfM2, 1)}</p>
          <p className="mt-1 text-xs text-[var(--n3-text-muted)]">YoY {percent(pct(latestUfM2, previousUfM2))}</p>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="border-t border-[var(--n3-line)] pt-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Compraventas</p>
              <h2 className="mt-1 text-lg font-medium">Evolución anual</h2>
            </div>
            <span className="text-xs text-[var(--n3-text-muted)]">{years.at(0)?.year ?? '—'}–{latest?.year ?? '—'}</span>
          </div>
          <svg viewBox="0 0 100 100" role="img" aria-label="Evolución de compraventas de casas por año" className="mt-5 h-48 w-full">
            <line x1="5" y1="90" x2="95" y2="90" stroke="var(--n3-line)" strokeWidth="0.8" />
            {txPoints ? <polyline points={txPoints} fill="none" stroke="currentColor" strokeWidth="1.6" vectorEffect="non-scaling-stroke" /> : null}
          </svg>
          <div className="grid grid-cols-4 gap-2 text-center text-xs text-[var(--n3-text-muted)]">
            {years.map((row) => <div key={row.year}><p>{row.year}</p><p className="mt-1 font-medium text-[var(--n3-text-light)]">{number(n(row.transactions))}</p></div>)}
          </div>
        </div>

        <div className="border-t border-[var(--n3-line)] pt-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Precio de cierre</p>
              <h2 className="mt-1 text-lg font-medium">Mediana UF</h2>
            </div>
            <span className="text-xs text-[var(--n3-text-muted)]">CBRS</span>
          </div>
          <svg viewBox="0 0 100 100" role="img" aria-label="Evolución anual de la mediana de precio UF" className="mt-5 h-48 w-full">
            <line x1="5" y1="90" x2="95" y2="90" stroke="var(--n3-line)" strokeWidth="0.8" />
            {pricePoints ? <polyline points={pricePoints} fill="none" stroke="currentColor" strokeWidth="1.6" vectorEffect="non-scaling-stroke" /> : null}
          </svg>
          <div className="grid grid-cols-4 gap-2 text-center text-xs text-[var(--n3-text-muted)]">
            {years.map((row) => <div key={row.year}><p>{row.year}</p><p className="mt-1 font-medium text-[var(--n3-text-light)]">UF {number(n(row.median_price_uf), 0)}</p></div>)}
          </div>
        </div>
      </section>

      <section className="mt-8 border-t border-[var(--n3-line)] pt-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Cobertura temporal</p>
            <h2 className="mt-1 text-lg font-medium">Qué podemos comparar hoy</h2>
          </div>
          <Link href="/dashboard/market/oferta" className="text-xs text-[var(--n3-teal-soft)]">Ver oferta actual</Link>
        </div>
        <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
          <div className="border-l border-[var(--n3-line)] pl-4">
            <p className="font-medium">CBRS</p>
            <p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">La base histórica disponible cubre 2014–2025 para casas. Esta vista usa los últimos cuatro años completos y permite YoY real.</p>
          </div>
          <div className="border-l border-[var(--n3-line)] pl-4">
            <p className="font-medium">Portal Inmobiliario</p>
            <p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">El historial live comienza en {liveFirstSeen ? new Date(liveFirstSeen).toLocaleDateString('es-CL') : 'fecha no disponible'}. No se inventa oferta histórica anterior a la captura real.</p>
          </div>
        </div>
      </section>

      <div className="mt-8">
        <CalculationTrace
          title="Ventas anuales"
          source="CBRS · market_cbrs_reference_metrics"
          universe="Compraventas clasificadas como Casa"
          filters={`scope = year · year <= ${lastCompleteYear} · últimos 4 años completos disponibles`}
          exclusions="Otros tipos de propiedad; Portal no participa en este conteo"
          formula="conteo de transacciones confirmadas por año"
          result={number(latestTx)}
        />
        <CalculationTrace
          title="Mediana precio de cierre"
          source="CBRS · market_cbrs_reference_metrics"
          universe="Compraventas clasificadas como Casa"
          filters={`scope = year · year <= ${lastCompleteYear} · último año completo disponible`}
          exclusions="Otros tipos de propiedad; precios de publicación de Portal"
          formula="mediana de precio UF de cierres CBRS del año"
          result={latestPrice == null ? '—' : `UF ${number(latestPrice, 0)}`}
        />
        <CalculationTrace
          title="Mediana UF/m²"
          source="CBRS · market_cbrs_reference_metrics"
          universe="Compraventas de casas con superficie utilizable por la métrica canónica"
          filters={`scope = year · year <= ${lastCompleteYear} · último año completo disponible`}
          exclusions="Registros sin superficie válida; Portal no participa en este cálculo"
          formula="mediana anual del indicador UF/m² canónico"
          result={number(latestUfM2, 1)}
        />
        <CalculationTrace
          title="Variación YoY"
          source="Dos años completos consecutivos de la misma métrica CBRS"
          universe="Mismo tipo de propiedad y misma definición"
          filters={`ambos años <= ${lastCompleteYear}`}
          formula="(valor actual / valor año anterior) − 1"
          result={percent(pct(latestTx, previousTx))}
          note="MoM requiere una serie mensual canónica. Se habilitará cuando la serie mensual esté disponible; no se aproxima desde datos anuales."
        />
      </div>
    </WorkspaceShell>
  )
}
