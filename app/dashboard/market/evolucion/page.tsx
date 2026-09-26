import { CalculationTrace } from '@/components/market/calculation-trace'
import { WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import { requireAnyPageCapability } from '@/lib/access-guards'
import { createClient } from '@/lib/supabase/server'

type PropertyType = 'Casa' | 'Departamento'

type YearRow = {
  property_type: PropertyType
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
  return `${value > 0 ? '+' : ''}${(value * 100).toFixed(1)}%`
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

function TrendBlock({ propertyType, rows }: { propertyType: PropertyType; rows: YearRow[] }) {
  const latest = rows.at(-1) ?? null
  const previous = rows.at(-2) ?? null
  const latestTx = n(latest?.transactions)
  const previousTx = n(previous?.transactions)
  const latestPrice = n(latest?.median_price_uf)
  const previousPrice = n(previous?.median_price_uf)
  const latestUfM2 = n(latest?.median_uf_m2)
  const previousUfM2 = n(previous?.median_uf_m2)
  const txPoints = points(rows.map((row) => n(row.transactions)))
  const pricePoints = points(rows.map((row) => n(row.median_price_uf)))

  return (
    <section className="border-t border-[var(--n3-line)] pt-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">{propertyType}</p>
          <h2 className="mt-1 text-xl font-medium">Últimos {rows.length} años completos</h2>
        </div>
        <span className="text-xs text-[var(--n3-text-muted)]">{rows.at(0)?.year ?? '—'}–{latest?.year ?? '—'} · CBRS</span>
      </div>

      <div className="mt-5 grid gap-px bg-[var(--n3-line)] sm:grid-cols-3">
        <div className="bg-[var(--n3-black)] p-4">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Compraventas</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{number(latestTx)}</p>
          <p className="mt-1 text-xs text-[var(--n3-text-muted)]">YoY {percent(pct(latestTx, previousTx))}</p>
        </div>
        <div className="bg-[var(--n3-black)] p-4">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Mediana precio</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">UF {number(latestPrice, 0)}</p>
          <p className="mt-1 text-xs text-[var(--n3-text-muted)]">YoY {percent(pct(latestPrice, previousPrice))}</p>
        </div>
        <div className="bg-[var(--n3-black)] p-4">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Mediana UF/m²</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{number(latestUfM2, 1)}</p>
          <p className="mt-1 text-xs text-[var(--n3-text-muted)]">YoY {percent(pct(latestUfM2, previousUfM2))}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Línea · compraventas</p>
          <svg viewBox="0 0 100 100" role="img" aria-label={`Evolución de compraventas de ${propertyType.toLowerCase()}`} className="mt-3 h-44 w-full">
            <line x1="5" y1="90" x2="95" y2="90" stroke="var(--n3-line)" strokeWidth="0.8" />
            {txPoints ? <polyline points={txPoints} fill="none" stroke="currentColor" strokeWidth="1.6" vectorEffect="non-scaling-stroke" /> : null}
          </svg>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Línea · mediana UF</p>
          <svg viewBox="0 0 100 100" role="img" aria-label={`Evolución de precio de ${propertyType.toLowerCase()}`} className="mt-3 h-44 w-full">
            <line x1="5" y1="90" x2="95" y2="90" stroke="var(--n3-line)" strokeWidth="0.8" />
            {pricePoints ? <polyline points={pricePoints} fill="none" stroke="currentColor" strokeWidth="1.6" vectorEffect="non-scaling-stroke" /> : null}
          </svg>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead className="border-b border-[var(--n3-line)] text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">
            <tr>
              <th className="py-2 text-left">Año</th>
              <th className="py-2 text-right">Ventas</th>
              <th className="py-2 text-right">Mediana UF</th>
              <th className="py-2 text-right">Mediana UF/m²</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--n3-line)]">
            {rows.map((row) => (
              <tr key={row.year}>
                <td className="py-3">{row.year}</td>
                <td className="py-3 text-right tabular-nums">{number(n(row.transactions))}</td>
                <td className="py-3 text-right tabular-nums">UF {number(n(row.median_price_uf), 0)}</td>
                <td className="py-3 text-right tabular-nums">{number(n(row.median_uf_m2), 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default async function MarketEvolutionPage() {
  await requireAnyPageCapability(['market.manage_sources', 'management.global.read', 'management.office.read'])

  const supabase = await createClient()
  const lastCompleteYear = new Date().getFullYear() - 1
  const firstYear = lastCompleteYear - 3

  const { data, error } = await supabase
    .from('market_cbrs_reference_metrics')
    .select('property_type,year,transactions,median_price_uf,median_uf_m2,observed_at')
    .eq('scope', 'year')
    .in('property_type', ['Casa', 'Departamento'])
    .gte('year', firstYear)
    .lte('year', lastCompleteYear)
    .order('year', { ascending: true })

  const rows = (data ?? []) as YearRow[]
  const houses = rows.filter((row) => row.property_type === 'Casa')
  const apartments = rows.filter((row) => row.property_type === 'Departamento')

  return (
    <WorkspaceShell>
      <WorkspaceHeader
        eyebrow="Mercado · Evolución"
        title="4 años · casas y departamentos"
        meta="Vitacura · CBRS canónico"
        actions={[
          { label: 'Oferta vs ventas', href: '/dashboard/market/inteligencia', primary: true },
          { label: 'Mapa KML', href: '/dashboard/market/mapa' },
          { label: 'Volver', href: '/dashboard/market' },
        ]}
      />

      {error ? (
        <div className="mt-6 border border-[#ff8d87]/50 p-4 text-sm text-[#ff8d87]">
          No fue posible cargar la serie histórica CBRS.
        </div>
      ) : null}

      <div className="mt-6 border-l-2 border-[var(--primary)] pl-4 text-xs leading-5 text-[var(--n3-text-muted)]">
        Esta vista responde la línea histórica de mercado pedida por Pedro Pablo. El YoY compara años CBRS equivalentes. El MoM comercial, metas, funnel y Balanced Scorecard pertenecen a Gestión y no se mezclan con Mercado.
      </div>

      <div className="mt-8 space-y-10">
        <TrendBlock propertyType="Casa" rows={houses} />
        <TrendBlock propertyType="Departamento" rows={apartments} />
      </div>

      <div className="mt-8">
        <CalculationTrace
          title="Serie anual CBRS"
          source="market_cbrs_reference_metrics"
          universe="Compraventas residenciales canónicas de Vitacura"
          filters={`scope = year · property_type separado · ${firstYear}–${lastCompleteYear}`}
          exclusions="Estacionamientos, bodegas y otros componentes no cuentan como transacción residencial primaria; Portal no participa en estas ventas."
          formula="Evento registral canónico agregado por año y tipo de propiedad"
          result={`${houses.length} años Casa · ${apartments.length} años Departamento`}
          note="No se reconstruye una segunda fórmula en UI. Se leen métricas CBRS ya persistidas."
        />
      </div>

      <p className="mt-6 text-xs leading-5 text-[var(--n3-text-muted)]">
        MoM y YoY comercial, metas, scorecard, funnel y alertas se consultan en la vista Hoy correspondiente al rol; no forman parte de Mercado.
      </p>
    </WorkspaceShell>
  )
}
