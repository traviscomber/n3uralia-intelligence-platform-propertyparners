import Link from 'next/link'
import { FileText, TrendingUp } from 'lucide-react'
import { PublicErrorNotice } from '@/components/feedback/public-error-notice'
import { DataStatusBar, MetricStrip, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import { hasCapability } from '@/lib/access-control'
import { requireUserScope } from '@/lib/access-guards'
import { getOperationalMarketSnapshot, type MarketFreshnessStatus } from '@/lib/market-operational'
import { getPortalReferenceSnapshot } from '@/lib/portal-reference-intelligence'
import { formatPropertyPartnersDateTime } from '@/lib/property-partners-time'
import { getVitacuraNeighborhoodSnapshot } from '@/lib/vitacura-neighborhoods'
import { getExecutiveDashboardSnapshot } from '@/lib/executive-dashboard-snapshot'
import { comparisonPeriod, verifiedChange } from '@/lib/executive-dashboard-comparisons'
import { getCanonicalMarketAuthority } from '@/lib/market-canonical-authority'

function number(value: number | null) {
  return value === null ? '—' : value.toLocaleString('es-CL')
}

function decimal(value: number | null, digits = 1) {
  return value === null ? '—' : value.toLocaleString('es-CL', { maximumFractionDigits: digits, minimumFractionDigits: digits })
}

function percent(value: number | null) {
  return value === null ? '—' : `${(value * 100).toFixed(1)}%`
}

function date(value: string | null) {
  if (!value) return '—'
  return formatPropertyPartnersDateTime(value)
}

function shortDate(value: string | null) {
  if (!value) return '—'
  const parsed = new Date(`${value.slice(0, 10)}T12:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? '—' : new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeZone: 'UTC' }).format(parsed)
}

function delta(current: number | null, previous: number | null) {
  if (current === null || previous === null || previous === 0) return null
  return (current / previous) - 1
}

function signedPercent(value: number | null) {
  if (value === null) return '—'
  return `${value > 0 ? '+' : ''}${(value * 100).toFixed(1)}%`
}

function lineSegments(values: Array<number | null>) {
  const clean = values.filter((value): value is number => value !== null)
  if (!clean.length) return []
  const min = Math.min(...clean)
  const max = Math.max(...clean)
  const span = Math.max(max - min, 1)
  const segments: string[][] = []
  values.forEach((value, index) => {
    if (value === null) return
    const x = values.length === 1 ? 50 : 6 + (index / (values.length - 1)) * 88
    const y = 88 - ((value - min) / span) * 72
    if (index === 0 || values[index - 1] === null) segments.push([])
    segments.at(-1)?.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  })
  return segments.map((segment) => segment.join(' '))
}

function monthLabel(value: string | null) {
  if (!value) return 'Sin período verificado'
  const date = new Date(`${value.slice(0, 10)}T12:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return value
  const label = new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function freshness(status: MarketFreshnessStatus, ageDays: number | null) {
  if (status === 'recent') return ageDays === 0 ? 'Hoy' : `${ageDays} días`
  if (status === 'aging' || status === 'stale') return `${ageDays ?? '—'} días`
  return '—'
}

export default async function MarketPage() {
  const scope = await requireUserScope()
  const canManage = hasCapability(scope.role, 'management.global.read') || hasCapability(scope.role, 'management.office.read')
  const [market, territory, portalReference, executiveResult, authorityResult] = await Promise.all([
    getOperationalMarketSnapshot(),
    getVitacuraNeighborhoodSnapshot(),
    getPortalReferenceSnapshot(),
    canManage
      ? getExecutiveDashboardSnapshot().then((snapshot) => ({ snapshot, error: false })).catch(() => ({ snapshot: null, error: true }))
      : Promise.resolve({ snapshot: null, error: false }),
    getCanonicalMarketAuthority()
      .then((authority) => ({ authority, error: false }))
      .catch(() => ({ authority: null, error: true })),
  ])
  const executive = executiveResult.snapshot
  const authority = authorityResult.authority

  const territorialCoverage = market.canonicalProperties && market.missingNeighborhoods !== null
    ? (market.canonicalProperties - market.missingNeighborhoods) / market.canonicalProperties
    : null
  const liveTerritorialCoverage = market.liveHouseCount && market.exactKmlLiveHouses !== null
    ? market.exactKmlLiveHouses / market.liveHouseCount
    : null
  const liveIdentityCoverage = market.liveHouseCount && market.liveLinkedHouses !== null
    ? market.liveLinkedHouses / market.liveHouseCount
    : null
  const logicalTerritorialCoverage = market.logicalHouseComponents && market.logicalComponentsWithNeighborhood !== null
    ? market.logicalComponentsWithNeighborhood / market.logicalHouseComponents
    : null
  const territoryExceptions = (market.ambiguousTerritorySuggestions ?? 0) + (market.unmatchedTerritoryHouses ?? 0)
  const dataStatus = market.error || market.freshnessStatus === 'stale'
    ? 'blocked'
    : liveIdentityCoverage !== null && liveIdentityCoverage >= 0.8 && liveTerritorialCoverage !== null && liveTerritorialCoverage >= 0.8 && market.confirmedSales !== null
      ? 'ready'
      : 'partial'

  const actions = [
    market.freshnessStatus === 'stale' ? {
      label: 'Actualizar mercado',
      value: freshness(market.freshnessStatus, market.observationAgeDays),
      reason: 'La oferta observada superó el umbral de vigencia y puede dejar de representar el mercado actual.',
      href: '/dashboard/market/import',
      critical: true,
    } : null,
    market.confirmedSales === null && market.latestCbrsHouseSaleDate ? {
      label: 'Actualizar ventas registrales de casas',
      value: `CBRS ${shortDate(market.latestCbrsHouseSaleDate)}`,
      reason: 'No existe una fuente de ventas confirmadas posterior al último corte registral; por eso no se publican métricas recientes de venta y absorción.',
      href: '/dashboard/market/import',
      critical: true,
    } : null,
    market.identityCollisions !== null && market.identityCollisions > 0 ? {
      label: 'Resolver colisión de identidad externa',
      value: number(market.identityCollisions),
      reason: 'Un mismo identificador externo apunta a más de una identidad posible y el sistema no debe vincularlas automáticamente.',
      href: '/dashboard/market/identidades',
      critical: true,
    } : null,
    market.highConfidenceIdentityCandidates !== null && market.highConfidenceIdentityCandidates > 0 ? {
      label: 'Validar candidato fuerte de identidad',
      value: number(market.highConfidenceIdentityCandidates),
      reason: 'Existe evidencia suficiente para proponer una vinculación, pero la identidad canónica aún requiere confirmación explícita.',
      href: '/dashboard/market/identidades',
      critical: false,
    } : null,
    market.newLiveIdentityCases !== null && market.newLiveIdentityCases > 0 ? {
      label: 'Resolver avisos live sin identidad previa',
      value: number(market.newLiveIdentityCases),
      reason: 'Son avisos activos que todavía no pueden relacionarse con una propiedad canónica conocida.',
      href: '/dashboard/market/identidades',
      critical: false,
    } : null,
    market.pendingUniqueTerritorySuggestions !== null && market.pendingUniqueTerritorySuggestions > 0 ? {
      label: 'Revisar territorio sugerido',
      value: number(market.pendingUniqueTerritorySuggestions),
      reason: 'El resolver encontró una señal territorial única, pero el caso permanece abierto porque aún no cumple las condiciones automáticas de publicación.',
      href: '/dashboard/market/revisar-barrios',
      critical: false,
    } : null,
    territoryExceptions > 0 ? {
      label: 'Resolver territorio sin evidencia suficiente',
      value: number(territoryExceptions),
      reason: 'Las fuentes territoriales disponibles no convergen; el sistema mantiene estos casos abiertos para evitar asignaciones forzadas.',
      href: '/dashboard/market/revisar-barrios',
      critical: false,
    } : null,
    market.missingNeighborhoods !== null && market.missingNeighborhoods > 0 ? {
      label: 'Completar barrios canónicos V1',
      value: number(market.missingNeighborhoods),
      reason: 'Existen propiedades canónicas V1 sin barrio publicado y deben reconciliarse con evidencia territorial antes de usarlas en análisis por zona.',
      href: '/dashboard/market/reconciliacion',
      critical: false,
    } : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item))

  const primaryActions = actions.slice(0, 3)
  const secondaryActions = actions.slice(3)

  const houseReference = portalReference.datasets.find((item) => item.datasetKind === 'portal_houses')
  const houseLive = portalReference.liveDatasets.find((item) => item.datasetKind === 'portal_houses')

  const verifiedMonth = executive?.verifiedPeriodEnd?.slice(0, 7) ?? null
  const latestEvolution = executive?.evolution.find((item) => item.period === verifiedMonth) ?? null
  const previousMonth = verifiedMonth ? comparisonPeriod(verifiedMonth, 1) : null
  const priorYearMonth = verifiedMonth ? comparisonPeriod(verifiedMonth, 12) : null
  const previousEvolution = executive?.evolution.find((item) => item.period === previousMonth) ?? null
  const sameMonthPriorYear = executive?.evolution.find((item) => item.period === priorYearMonth) ?? null

  const change = (field: 'leads' | 'visits' | 'sales' | 'salesUf', previous: typeof latestEvolution) => verifiedChange(
    latestEvolution ? { value: latestEvolution[field], formulaVersion: latestEvolution.versions[field] } : null,
    previous ? { value: previous[field], formulaVersion: previous.versions[field] } : null,
  )
  const leadsMom = change('leads', previousEvolution)
  const leadsYoy = change('leads', sameMonthPriorYear)
  const visitsMom = change('visits', previousEvolution)
  const visitsYoy = change('visits', sameMonthPriorYear)
  const salesMom = change('sales', previousEvolution)
  const salesYoy = change('sales', sameMonthPriorYear)
  const salesUfMom = change('salesUf', previousEvolution)
  const salesUfYoy = change('salesUf', sameMonthPriorYear)

  const annualTransactions = executive?.history.map((row) => row.transactions) ?? []
  const annualPrices = executive?.history.map((row) => row.medianPriceUf) ?? []
  const averageTransactions = annualTransactions.filter((value): value is number => value !== null).length
    ? annualTransactions.filter((value): value is number => value !== null).reduce((sum, value) => sum + value, 0) / annualTransactions.filter((value): value is number => value !== null).length
    : null
  const averagePrice = annualPrices.filter((value): value is number => value !== null).length
    ? annualPrices.filter((value): value is number => value !== null).reduce((sum, value) => sum + value, 0) / annualPrices.filter((value): value is number => value !== null).length
    : null
  const latestHistory = executive?.history.at(-1) ?? null

  const funnel = {
    leads: executive?.latest.leads ?? null,
    scheduled: executive?.latest.scheduledVisits ?? null,
    visits: executive?.latest.realizedVisits ?? null,
    sales: executive?.latest.sales ?? null,
  }

  return (
    <WorkspaceShell>
      <WorkspaceHeader
        eyebrow="Mercado"
        title="Vitacura · Casas"
        meta={`Corte ${date(market.latestObservedAt)} · ${freshness(market.freshnessStatus, market.observationAgeDays)}`}
        actions={[
          { label: 'Ver casas en oferta', href: '/dashboard/market/oferta', primary: true, icon: <TrendingUp size={15} /> },
          { label: 'Informe', href: '/dashboard/market/export', icon: <FileText size={15} /> },
        ]}
      />

      {market.error ? <div className="mt-4"><PublicErrorNotice compact message="No fue posible consultar toda la información de mercado." /></div> : null}
      {executiveResult.error ? <div className="mt-4"><PublicErrorNotice compact message="No fue posible consultar el control ejecutivo; sus indicadores no se muestran." /></div> : null}

      <section className="mt-6 border-y border-[var(--n3-line)] py-7">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.7fr)] lg:items-end">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">01 · Mercado hoy</p>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <p className="text-5xl font-semibold tracking-[-0.04em] text-[var(--n3-text-light)] sm:text-6xl">
                {market.latestIngestionFullSnapshot ? number(market.activeInventory) : '—'}
              </p>
              <p className="text-sm text-[var(--n3-text-muted)]">
                {market.latestIngestionFullSnapshot ? 'casas usadas en venta · Vitacura' : 'mercado completo pendiente de snapshot persistido'}
              </p>
            </div>
            <p className="mt-3 max-w-2xl text-xs leading-5 text-[var(--n3-text-muted)]">
              Inventario vigente observado en Portal Inmobiliario. El número sólo se publica como mercado completo cuando la captura demuestra cobertura suficiente contra el total informado por Portal.
            </p>
          </div>

          <div className="border-l border-[var(--n3-line)] pl-5">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Cobertura del corte</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{percent(market.latestInventoryCoverageRatio)}</p>
            <p className="mt-1 text-xs text-[var(--n3-text-muted)]">
              Portal reporta {number(market.latestPortalReportedCount)} · N3uralia captura {number(market.latestDiscoveryUniqueListings)} IDs únicos
            </p>
            <p className={`mt-3 text-xs ${market.latestIngestionFullSnapshot ? 'text-[var(--n3-teal-soft)]' : 'text-[#f0c96a]'}`}>
              {market.latestIngestionFullSnapshot ? 'Snapshot completo verificado' : 'Captura parcial · no se cierran bajas'}
            </p>
            <p className="mt-1 text-[11px] text-[var(--n3-text-muted)]">Corte {date(market.latestIngestionAt)}</p>
          </div>
        </div>

        <div className="mt-7 grid gap-px bg-[var(--n3-line)] sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Nuevas', number(market.latestIngestionNew), 'No estaban en el snapshot completo anterior'],
            ['Retiradas', number(market.latestIngestionRemoved), 'Desaparecieron respecto del corte anterior'],
            ['Mediana publicada', houseLive?.medianPriceUf == null ? '—' : `UF ${decimal(houseLive.medianPriceUf, 0)}`, 'Precio publicado del universo live enriquecido'],
            ['Mediana UF/m²', decimal(houseLive?.medianUfM2 ?? null, 1), 'Sólo publicaciones con superficie válida'],
          ].map(([label, value, detail]) => (
            <div key={label} className="bg-[var(--n3-bg)] px-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
              <p className="mt-1 text-[11px] leading-4 text-[var(--n3-text-muted)]">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 border-t border-[var(--n3-line)] pt-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">02 · Cobertura y limpieza</p>
          <h2 className="mt-1 text-lg font-medium text-[var(--n3-text-light)]">Qué capturamos y qué consolidamos</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--n3-text-muted)]">
            Mercado completo y base canónica PP son universos distintos. Se muestran por separado para no confundir cobertura de Portal con identidad consolidada.
          </p>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <div className="border-t border-[var(--n3-line)] pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Mercado completo · Portal</p>
                <p className="mt-1 text-sm font-medium text-[var(--n3-text-light)]">Cobertura diaria</p>
              </div>
              <span className="text-xs text-[var(--n3-teal-soft)]">{percent(market.latestInventoryCoverageRatio)}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-semibold tabular-nums">{number(market.latestPortalReportedCount)}</p>
                <p className="mt-1 text-[11px] text-[var(--n3-text-muted)]">Portal reporta</p>
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums">{number(market.latestDiscoveryUniqueListings)}</p>
                <p className="mt-1 text-[11px] text-[var(--n3-text-muted)]">IDs únicos capturados</p>
              </div>
            </div>
            <p className="mt-4 text-[11px] leading-5 text-[var(--n3-text-muted)]">
              {number(market.latestDiscoveryDuplicateCandidates)} referencias técnicas repetidas fueron descartadas durante el recorrido. No representan propiedades adicionales.
            </p>
          </div>

          <div className="border-t border-[var(--n3-line)] pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Base canónica PP</p>
                <p className="mt-1 text-sm font-medium text-[var(--n3-text-light)]">Identidad consolidada</p>
              </div>
              <Link href="/dashboard/market/identidades" className="text-xs text-[var(--n3-teal-soft)]">Ver duplicados</Link>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div>
                <p className="text-2xl font-semibold tabular-nums">{number(market.canonicalProperties)}</p>
                <p className="mt-1 text-[11px] text-[var(--n3-text-muted)]">registros PP</p>
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums text-[var(--n3-teal-soft)]">−{number(market.confirmedDuplicateRows)}</p>
                <p className="mt-1 text-[11px] text-[var(--n3-text-muted)]">duplicados</p>
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums">{number(market.logicalHouseComponents)}</p>
                <p className="mt-1 text-[11px] text-[var(--n3-text-muted)]">propiedades lógicas</p>
              </div>
            </div>
            <p className="mt-4 text-[11px] leading-5 text-[var(--n3-text-muted)]">
              Esta base se usa para identidad, territorio y valorización. No representa por sí sola el total de casas actualmente publicadas en Portal.
            </p>
          </div>
        </div>

        <details className="mt-5 border-y border-[var(--n3-line)] py-3">
          <summary className="flex min-h-10 cursor-pointer items-center justify-between gap-4 text-xs text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">
            <span>Ver cómo se limpian los datos</span>
            <span className="text-[10px] uppercase tracking-[0.12em]">Detalle</span>
          </summary>
          <div className="space-y-1 pt-3 font-mono text-[11px] leading-5 text-[var(--n3-text-muted)]">
            <p>Captura Portal: {number(market.latestDiscoveryRawCandidates)} referencias observadas − {number(market.latestDiscoveryDuplicateCandidates)} repeticiones técnicas = {number(market.latestDiscoveryUniqueListings)} IDs únicos · cobertura {percent(market.latestInventoryCoverageRatio)}</p>
            <p>Base PP: {number(market.canonicalProperties)} registros − {number(market.confirmedDuplicateRows)} duplicados confirmados = {number(market.logicalHouseComponents)} propiedades lógicas</p>
          </div>
        </details>

        {authority ? <details className="mt-3 border-b border-[var(--n3-line)] pb-3">
          <summary className="flex min-h-10 cursor-pointer items-center justify-between gap-4 text-xs text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">
            <span>Fuentes canónicas de inteligencia</span>
            <span className="text-[10px] uppercase tracking-[0.12em]">Autoridad</span>
          </summary>
          <div className="mt-3 grid gap-5 text-xs leading-5 lg:grid-cols-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">CBRS</p>
              <p className="mt-1 text-sm font-medium text-[var(--n3-text-light)]">{number(authority.cbrs.residentialEvents)} compraventas residenciales</p>
              <p className="mt-1 text-[var(--n3-text-muted)]">{number(authority.cbrs.houses)} casas · {number(authority.cbrs.apartments)} departamentos</p>
              <p className="mt-1 text-[11px] text-[var(--n3-text-muted)]">{number(authority.cbrs.workbookRows)} filas raw · agregación por inscripción canónica</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Portal · referencia</p>
              <p className="mt-1 text-sm font-medium text-[var(--n3-text-light)]">{number(authority.portalReference.houses)} casas · {number(authority.portalReference.apartments)} deptos.</p>
              <p className="mt-1 text-[var(--n3-text-muted)]">{number(authority.portalReference.projects)} proyectos · snapshot {shortDate(authority.portalReference.observedAt)}</p>
              <p className="mt-1 text-[11px] text-[var(--n3-text-muted)]">Benchmark canónico entregado por Property Partners; no equivale al mercado live de hoy.</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Territorio</p>
              <p className="mt-1 text-sm font-medium text-[var(--n3-text-light)]">{number(authority.territory.neighborhoods)} barrios oficiales</p>
              <p className="mt-1 text-[var(--n3-text-muted)]">{authority.territory.sourceFile ?? 'KML Property Partners'}</p>
              <p className="mt-1 text-[11px] text-[var(--n3-text-muted)]">El KML es la autoridad territorial; el mapa sólo representa esa geometría.</p>
            </div>
          </div>
        </details> : null}
        {authorityResult.error ? <p className="mt-3 text-[11px] text-[#f0c96a]">No fue posible consultar el registro de fuentes canónicas; no se muestran cifras de autoridad.</p> : null}
      </section>

      <section className="mt-8">
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">03 · Inteligencia derivada</p>
          <h2 className="mt-1 text-lg font-medium text-[var(--n3-text-light)]">Qué nos dice el mercado</h2>
        </div>
        <MetricStrip items={[
          {
            label: 'Oferta activa',
            value: market.latestIngestionFullSnapshot ? number(market.activeInventory) : '—',
            detail: market.latestIngestionFullSnapshot ? 'Snapshot completo verificado' : 'Captura parcial · no publicable como total',
            tone: market.latestIngestionFullSnapshot ? 'default' : 'warning',
          },
          {
            label: 'Ventas confirmadas',
            value: number(market.confirmedSales),
            detail: market.confirmedSales === null && market.latestCbrsHouseSaleDate ? `Último CBRS ${shortDate(market.latestCbrsHouseSaleDate)}` : undefined,
            tone: market.confirmedSales === null ? 'warning' : 'default',
          },
          {
            label: 'Días en mercado',
            value: market.medianDaysOnMarket === null ? '—' : number(market.medianDaysOnMarket),
            detail: market.medianDaysOnMarket === null ? 'Sin cierre temporal confirmable' : undefined,
          },
          {
            label: 'Absorción',
            value: percent(market.absorptionRate),
            detail: market.absorptionRate === null ? 'Requiere ventas confirmadas y período comparable' : undefined,
          },
        ]} />

        <details className="mt-4 border-t border-[var(--n3-line)] pt-3">
          <summary className="flex min-h-10 cursor-pointer items-center justify-between gap-4 text-xs text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">
            <span>Ver cómo se calculan los indicadores</span>
            <span className="text-[10px] uppercase tracking-[0.12em]">Metodología</span>
          </summary>
          <div className="mt-3 divide-y divide-[var(--n3-line)] text-xs leading-5">
            {[
              ['Oferta activa', 'Portal Inmobiliario · casas usadas en venta · Vitacura', 'Publicaciones únicas vigentes del snapshot completo', number(market.activeInventory)],
              ['Propiedades lógicas PP', 'Base canónica PP', `${number(market.canonicalProperties)} registros − ${number(market.confirmedDuplicateRows)} duplicados confirmados`, number(market.logicalHouseComponents)],
              ['Ventas confirmadas', 'Transacciones canónicas de casas', 'Sólo operaciones con evidencia transaccional confirmada', number(market.confirmedSales)],
              ['Absorción', 'Oferta comparable + ventas confirmadas', 'ventas confirmadas / oferta comparable', percent(market.absorptionRate)],
            ].map(([label, source, formula, result]) => (
              <div key={label} className="grid gap-1 py-3 sm:grid-cols-[150px_minmax(0,1fr)_120px] sm:gap-4">
                <p className="font-medium text-[var(--n3-text-light)]">{label}</p>
                <div className="text-[var(--n3-text-muted)]">
                  <p>{source}</p>
                  <p className="mt-1 font-mono text-[11px]">{formula}</p>
                </div>
                <p className="tabular-nums text-[var(--n3-text-light)] sm:text-right">{result}</p>
              </div>
            ))}
          </div>
        </details>
      </section>

      {executive ? <>
      <section className="mt-10 border-t border-[var(--n3-line)] pt-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">04 · Evolución</p>
            <h2 className="mt-1 text-lg font-medium text-[var(--n3-text-light)]">3–4 años de mercado</h2>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--n3-text-muted)]">
              Historia registral CBRS para casas. La serie comercial se extenderá hacia atrás cuando Pedro entregue los períodos adicionales.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-8 lg:grid-cols-2">
          <div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs text-[var(--n3-text-muted)]">Compraventas</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{number(latestHistory?.transactions ?? null)}</p>
              </div>
              <p className="text-right text-[11px] text-[var(--n3-text-muted)]">
                vs promedio {annualTransactions.filter((value) => value !== null).length} años<br /><span className="text-[var(--n3-text-light)]">{signedPercent(delta(latestHistory?.transactions ?? null, averageTransactions))}</span>
              </p>
            </div>
            <svg viewBox="0 0 100 100" role="img" aria-label="Compraventas anuales de casas" className="mt-3 h-36 w-full">
              <line x1="5" y1="90" x2="95" y2="90" stroke="var(--n3-line)" strokeWidth="0.8" />
              {lineSegments(annualTransactions).map((points, index) => <polyline key={index} points={points} fill="none" stroke="currentColor" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />)}
            </svg>
            <div className="grid grid-cols-4 gap-2 text-center text-[11px] text-[var(--n3-text-muted)]">
              {executive.history.map((row) => <div key={row.year}><p>{row.year}</p><p className="mt-1 text-[var(--n3-text-light)]">{number(row.transactions)}</p></div>)}
            </div>
          </div>

          <div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs text-[var(--n3-text-muted)]">Mediana precio de cierre</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">UF {decimal(latestHistory?.medianPriceUf ?? null, 0)}</p>
              </div>
              <p className="text-right text-[11px] text-[var(--n3-text-muted)]">
                vs promedio {annualPrices.filter((value) => value !== null).length} años<br /><span className="text-[var(--n3-text-light)]">{signedPercent(delta(latestHistory?.medianPriceUf ?? null, averagePrice))}</span>
              </p>
            </div>
            <svg viewBox="0 0 100 100" role="img" aria-label="Mediana anual de precio UF" className="mt-3 h-36 w-full">
              <line x1="5" y1="90" x2="95" y2="90" stroke="var(--n3-line)" strokeWidth="0.8" />
              {lineSegments(annualPrices).map((points, index) => <polyline key={index} points={points} fill="none" stroke="currentColor" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />)}
            </svg>
            <div className="grid grid-cols-4 gap-2 text-center text-[11px] text-[var(--n3-text-muted)]">
              {executive.history.map((row) => <div key={row.year}><p>{row.year}</p><p className="mt-1 text-[var(--n3-text-light)]">{decimal(row.medianPriceUf, 0)}</p></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10 border-t border-[var(--n3-line)] pt-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">05 · Último mes verificado</p>
          <h2 className="mt-1 text-lg font-medium text-[var(--n3-text-light)]">{monthLabel(executive.verifiedPeriodEnd)}</h2>
          <p className="mt-1 text-xs text-[var(--n3-text-muted)]">MoM y YoY requieren el período calendario exacto y la misma versión de fórmula verificada.</p>
        </div>

        <div className="mt-5 grid gap-px bg-[var(--n3-line)] sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Leads', executive.latest.leads, leadsMom, leadsYoy, 'count'],
            ['Visitas realizadas', executive.latest.realizedVisits, visitsMom, visitsYoy, 'count'],
            ['Ventas', executive.latest.sales, salesMom, salesYoy, 'count'],
            ['UF vendidas', executive.latest.salesUf, salesUfMom, salesUfYoy, 'uf'],
          ].map(([label, value, mom, yoy, unit]) => (
            <div key={String(label)} className="bg-[var(--n3-bg)] p-4">
              <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{unit === 'uf' && value !== null ? `UF ${number(value as number)}` : number(value as number | null)}</p>
              <div className="mt-2 flex gap-3 text-[11px] text-[var(--n3-text-muted)]">
                <span>MoM <strong className="font-medium text-[var(--n3-text-light)]">{signedPercent(mom as number | null)}</strong></span>
                <span>YoY <strong className="font-medium text-[var(--n3-text-light)]">{signedPercent(yoy as number | null)}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 border-t border-[var(--n3-line)] pt-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">06 · Balanced Scorecard</p>
          <h2 className="mt-1 text-lg font-medium text-[var(--n3-text-light)]">Control ejecutivo</h2>
        </div>
        <div className="mt-4 divide-y divide-[var(--n3-line)] border-y border-[var(--n3-line)]">
          {[
            ['Mercado', 'Cobertura Portal', percent(market.latestInventoryCoverageRatio), market.latestIngestionFullSnapshot ? 'Verificado' : 'Parcial'],
            ['Financiero', 'Margen / P&L', 'Pendiente fuente PP', 'Sin métrica canónica'],
            ['Comercial', 'Calidad de conversión', executive.latest.conversionScore === null ? '—' : decimal(executive.latest.conversionScore, 1), executive.latest.conversionScore === null ? 'Sin dato' : 'Verificado'],
            ['Procesos', 'Calidad de seguimiento', executive.latest.followUpScore === null ? '—' : decimal(executive.latest.followUpScore, 1), executive.latest.followUpScore === null ? 'Sin dato' : 'Verificado'],
          ].map(([dimension, indicator, value, status]) => (
            <div key={String(dimension)} className="grid gap-2 py-3 text-sm sm:grid-cols-[120px_minmax(0,1fr)_180px_140px] sm:items-center">
              <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{dimension}</p>
              <p>{indicator}</p>
              <p className="font-medium tabular-nums">{value}</p>
              <p className="text-xs text-[var(--n3-text-muted)]">{status}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 border-t border-[var(--n3-line)] pt-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">07 · Proceso comercial</p>
          <h2 className="mt-1 text-lg font-medium text-[var(--n3-text-light)]">Leads → visitas → cierres</h2>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] lg:items-center">
          {[
            ['Leads', funnel.leads, null],
            ['Agendadas', funnel.scheduled, funnel.leads && funnel.scheduled !== null ? funnel.scheduled / funnel.leads : null],
            ['Realizadas', funnel.visits, funnel.scheduled && funnel.visits !== null ? funnel.visits / funnel.scheduled : null],
            ['Ventas', funnel.sales, funnel.visits && funnel.sales !== null ? funnel.sales / funnel.visits : null],
          ].map(([label, value, ratio], index) => (
            <div key={String(label)} className="contents">
              <div className="border-l border-[var(--n3-line)] pl-4">
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{number(value as number | null)}</p>
                {ratio !== null ? <p className="mt-1 text-[11px] text-[var(--n3-text-muted)]">{percent(ratio as number)} desde etapa anterior</p> : <p className="mt-1 text-[11px] text-[var(--n3-text-muted)]">base del período</p>}
              </div>
              {index < 3 ? <span className="hidden text-[var(--n3-text-muted)] lg:block">→</span> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-8 border-t border-[var(--n3-line)] pt-6 lg:grid-cols-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">08 · Alertas del mes</p>
          <h2 className="mt-1 text-lg font-medium text-[var(--n3-text-light)]">Sólo lo que requiere decisión</h2>
          {executive.alerts.length ? (
            <div className="mt-4 divide-y divide-[var(--n3-line)] border-y border-[var(--n3-line)]">
              {executive.alerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{alert.title}</p>
                    <span className="text-[10px] uppercase tracking-[0.12em] text-[#f0c96a]">{alert.severity}</span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">{alert.detail}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 border-y border-[var(--n3-line)] py-5">
              <p className="text-sm font-medium text-[var(--n3-text-light)]">{verifiedMonth ? 'Sin alertas abiertas para este período' : 'Sin período mensual verificado'}</p>
              <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{verifiedMonth ? 'No hay alertas abiertas en el período mostrado.' : 'Las alertas aparecerán cuando exista un período verificado.'}</p>
            </div>
          )}
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">09 · Property 360</p>
          <h2 className="mt-1 text-lg font-medium text-[var(--n3-text-light)]">Propiedades para revisar</h2>
          <p className="mt-1 text-xs text-[var(--n3-text-muted)]">Propiedades vigentes con ficha canónica, priorizadas por permanencia reportada por la fuente.</p>
          <div className="mt-4 divide-y divide-[var(--n3-line)] border-y border-[var(--n3-line)]">
            {executive.properties.map((property) => (
              <Link key={property.id} href={`/dashboard/properties/${property.id}`} className="grid gap-2 py-3 text-sm hover:bg-white/[0.02] sm:grid-cols-[minmax(0,1fr)_110px_90px] sm:items-center">
                <div className="min-w-0">
                  <p className="truncate font-medium">{property.address || 'Propiedad sin dirección'}</p>
                  <p className="mt-1 text-[11px] text-[var(--n3-text-muted)]">{property.neighborhood || 'Sin barrio'} · {property.source || 'fuente no indicada'}</p>
                </div>
                <p className="tabular-nums">{property.price_uf == null ? '—' : `UF ${number(Number(property.price_uf))}`}</p>
                <p className="text-xs text-[var(--n3-text-muted)]">{property.days_on_market == null ? '—' : `${property.days_on_market} días`}</p>
              </Link>
            ))}
          </div>
          {!executive.properties.length ? <p className="py-4 text-xs text-[var(--n3-text-muted)]">Sin propiedades vigentes con permanencia y ficha canónica verificables.</p> : null}
          <Link href="/dashboard/market/oferta" className="mt-3 inline-flex min-h-10 items-center text-xs text-[var(--n3-teal-soft)]">Ver oferta vigente</Link>
        </div>
      </section>
      </> : null}

      {actions.length > 0 ? (
        <section className="mt-8 max-w-5xl">
          <div className="flex items-center justify-between border-b border-[var(--n3-line)] pb-2">
            <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Qué requiere atención</h2>
            <span className="text-xs text-[var(--n3-text-muted)]">{actions.length}</span>
          </div>
          <div className="divide-y divide-[var(--n3-line)]">
            {primaryActions.map((item) => (
              <Link key={item.label} href={item.href} className="grid min-h-20 gap-3 py-4 hover:bg-white/[0.02] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--n3-text-light)]">{item.label}</p>
                  <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--n3-text-muted)]">{item.reason}</p>
                </div>
                <span className={`text-sm font-semibold ${item.critical ? 'text-[#ff8d87]' : 'text-[#f0c96a]'}`}>{item.value}</span>
              </Link>
            ))}
          </div>
          {secondaryActions.length > 0 ? (
            <details className="border-t border-[var(--n3-line)] py-3">
              <summary className="cursor-pointer text-xs text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">
                Ver {secondaryActions.length} temas adicionales
              </summary>
              <div className="mt-2 divide-y divide-[var(--n3-line)]">
                {secondaryActions.map((item) => (
                  <Link key={item.label} href={item.href} className="flex min-h-14 items-center justify-between gap-4 py-3 text-xs hover:bg-white/[0.02]">
                    <span className="text-[var(--n3-text-light)]">{item.label}</span>
                    <span className={item.critical ? 'text-[#ff8d87]' : 'text-[#f0c96a]'}>{item.value}</span>
                  </Link>
                ))}
              </div>
            </details>
          ) : null}
        </section>
      ) : null}

      <details className="mt-10 border-t border-[var(--n3-line)] pt-4">
        <summary className="flex min-h-11 cursor-pointer items-center text-xs font-medium text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">
          Ver datos y metodología
        </summary>

        <div className="mt-6 space-y-8">
          <section>
            <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Calidad de evidencia</h2>
            <div className="mt-2 grid border-y border-[var(--n3-line)] sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['Territorio V1 físico', percent(territorialCoverage), `${number((market.canonicalProperties ?? 0) - (market.missingNeighborhoods ?? 0))} de ${number(market.canonicalProperties)}`],
                ['Territorio V1 lógico', percent(logicalTerritorialCoverage), `${number(market.logicalComponentsWithNeighborhood)} de ${number(market.logicalHouseComponents)}`],
                ['Identidad live vinculada', percent(liveIdentityCoverage), `${number(market.liveLinkedHouses)} vinculadas · ${number(market.pendingMatches)} pendientes`],
                ['Limpieza de universo', number(market.outOfScopeLegacyHouses), `${number(market.physicalHouseRows)} legacy → ${number(market.canonicalProperties)} V1 → ${number(market.logicalHouseComponents)} lógicas`],
              ].map(([label, value, detail], index) => (
                <div key={label} className={`py-4 ${index > 0 ? 'sm:border-l sm:border-[var(--n3-line)] sm:px-4' : 'pr-4'}`}>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{label}</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
                  <p className="mt-1 text-[11px] text-[var(--n3-text-muted)]">{detail}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 max-w-4xl text-xs leading-5 text-[var(--n3-text-muted)]">
              Las filas fuera de Vitacura se conservan como evidencia legacy pero no participan en V1. Las relaciones de duplicado confirmadas forman una proyección lógica sin borrar registros. Las colisiones de identidad live siguen bloqueadas hasta revisión explícita.
            </p>
          </section>

          {houseReference ? (
            <section>
              <div className="border-b border-[var(--n3-line)] pb-2">
                <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Portal Inmobiliario · casas</h2>
                <p className="mt-1 text-xs text-[var(--n3-text-muted)]">El live corresponde a Vitacura. La referencia histórica disponible tiene alcance {houseReference.scope}; se conserva sólo como contexto y no como benchmark territorial equivalente.</p>
              </div>
              <div className="grid gap-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
                <div><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Listings live Vitacura</p><p className="mt-1 text-lg font-semibold">{number(houseLive?.listingCount ?? null)}</p><p className="text-[11px] text-[var(--n3-text-muted)]">Ref. {houseReference.scope}: {number(houseReference.listingCount)}</p></div>
                <div><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Mediana UF live</p><p className="mt-1 text-lg font-semibold">{decimal(houseLive?.medianPriceUf ?? null, 0)}</p><p className="text-[11px] text-[var(--n3-text-muted)]">Ref. {houseReference.scope}: {decimal(houseReference.medianPriceUf, 0)}</p></div>
                <div><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">UF/m² live</p><p className="mt-1 text-lg font-semibold">{decimal(houseLive?.medianUfM2 ?? null, 1)}</p><p className="text-[11px] text-[var(--n3-text-muted)]">Ref. {houseReference.scope}: {decimal(houseReference.medianUfM2, 1)}</p></div>
                <div><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Superficie live</p><p className="mt-1 text-lg font-semibold">{decimal(houseLive?.medianAreaM2 ?? null, 0)} m²</p><p className="text-[11px] text-[var(--n3-text-muted)]">Ref. {houseReference.scope}: {decimal(houseReference.medianAreaM2, 0)} m²</p></div>
              </div>
            </section>
          ) : null}

          <section>
            <div className="border-b border-[var(--n3-line)] pb-2">
              <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">CBRS · casas</h2>
              <p className="mt-1 text-xs text-[var(--n3-text-muted)]">Base registral histórica confirmada. No se usa para fingir actividad reciente fuera de su corte.</p>
            </div>
            <div className="grid gap-4 py-4 sm:grid-cols-2">
              <div><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Transacciones históricas</p><p className="mt-1 text-lg font-semibold">{number(market.cbrsHouseTransactions)}</p></div>
              <div><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Última venta de casa disponible</p><p className="mt-1 text-lg font-semibold">{shortDate(market.latestCbrsHouseSaleDate)}</p></div>
            </div>
            {market.confirmedSales === null ? <p className="text-xs leading-5 text-[#f0c96a]">Ventas, días en mercado y absorción permanecen sin publicación actual hasta incorporar una fuente de ventas de casas posterior a este corte.</p> : null}
          </section>

          <section>
            <div className="border-b border-[var(--n3-line)] pb-2">
              <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">CRM Property Partners · señales recientes</h2>
              <p className="mt-1 text-xs text-[var(--n3-text-muted)]">Evidencia cliente a nivel propiedad. Se conserva separada de CBRS y de transacciones confirmadas.</p>
            </div>
            <div className="grid gap-4 py-4 sm:grid-cols-3">
              <div><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Casas observadas Vendida</p><p className="mt-1 text-lg font-semibold">{number(market.clientSaleSignals)}</p></div>
              <div><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Corte fuente</p><p className="mt-1 text-lg font-semibold">{shortDate(market.latestClientSaleSourcePeriodEnd)}</p></div>
              <div><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Archivos trazados</p><p className="mt-1 text-lg font-semibold">{number(market.clientSaleSignalSourceFiles)}</p></div>
            </div>
            <p className="text-xs leading-5 text-[var(--n3-text-muted)]">Estas señales prueban que el CRM observó propiedades en estado Vendida durante el corte, pero no aportan fecha de cierre. Por diseño no alimentan ventas confirmadas, velocidad de venta ni absorción.</p>
          </section>

          <section>
            <div className="flex items-center justify-between border-b border-[var(--n3-line)] pb-2">
              <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Barrios Property Partners</h2>
              <span className="text-xs text-[var(--n3-text-muted)]">{territory.polygons} zonas</span>
            </div>
            <div className="divide-y divide-[var(--n3-line)]">
              {territory.neighborhoods.map((row) => (
                <div key={row.name} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <span>{row.name}</span>
                  <span className="tabular-nums text-[var(--n3-text-muted)]">{number(row.properties)}</span>
                </div>
              ))}
            </div>
          </section>

          <DataStatusBar
            cutoff={date(market.latestObservedAt)}
            coverage={`${number(market.liveLinkedHouses)} de ${number(market.liveHouseCount)} casas live vinculadas · ${number(market.logicalHouseComponents)} propiedades lógicas V1 · ${number(market.outOfScopeLegacyHouses)} legacy fuera de alcance aisladas`}
            issues={(market.error ? 1 : 0) + (market.freshnessStatus === 'stale' ? 1 : 0) + (market.confirmedSales === null ? 1 : 0) + (territory.error ? 1 : 0) + (portalReference.error ? 1 : 0) + territoryExceptions + (market.identityCollisions ?? 0) + (market.duplicateComponents ?? 0)}
            status={dataStatus}
          />

          <div className="flex flex-wrap gap-2 text-xs">
            <a href="/api/market/export?dataset=listings&format=xlsx" className="inline-flex min-h-11 items-center px-2 text-[var(--n3-teal-soft)]">Exportar XLSX</a>
            {canManage ? <Link href="/dashboard/market/fuentes" className="inline-flex min-h-11 items-center px-2 text-[var(--n3-teal-soft)]">Administrar fuentes</Link> : null}
            {canManage ? <Link href="/dashboard/market/reconciliacion" className="inline-flex min-h-11 items-center px-2 text-[var(--n3-teal-soft)]">Reconciliación</Link> : null}
            {canManage && ((market.pendingUniqueTerritorySuggestions ?? 0) > 0 || territoryExceptions > 0) ? <Link href="/dashboard/market/revisar-barrios" className="inline-flex min-h-11 items-center px-2 text-[var(--n3-teal-soft)]">Resolver territorio</Link> : null}
          </div>
        </div>
      </details>
    </WorkspaceShell>
  )
}
