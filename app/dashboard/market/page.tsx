import Link from 'next/link'
import { FileText, TrendingUp } from 'lucide-react'
import { PublicErrorNotice } from '@/components/feedback/public-error-notice'
import { CalculationTrace } from '@/components/market/calculation-trace'
import { DataStatusBar, MetricStrip, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import { hasCapability } from '@/lib/access-control'
import { requireUserScope } from '@/lib/access-guards'
import { getOperationalMarketSnapshot, type MarketFreshnessStatus } from '@/lib/market-operational'
import { getPortalReferenceSnapshot } from '@/lib/portal-reference-intelligence'
import { formatPropertyPartnersDateTime } from '@/lib/property-partners-time'
import { getVitacuraNeighborhoodSnapshot } from '@/lib/vitacura-neighborhoods'

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

function freshness(status: MarketFreshnessStatus, ageDays: number | null) {
  if (status === 'recent') return ageDays === 0 ? 'Hoy' : `${ageDays} días`
  if (status === 'aging' || status === 'stale') return `${ageDays ?? '—'} días`
  return '—'
}

export default async function MarketPage() {
  const [market, scope, territory, portalReference] = await Promise.all([
    getOperationalMarketSnapshot(),
    requireUserScope(),
    getVitacuraNeighborhoodSnapshot(),
    getPortalReferenceSnapshot(),
  ])

  const canManage = hasCapability(scope.role, 'management.global.read') || hasCapability(scope.role, 'management.office.read')
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

  const houseReference = portalReference.datasets.find((item) => item.datasetKind === 'portal_houses')
  const houseLive = portalReference.liveDatasets.find((item) => item.datasetKind === 'portal_houses')

  return (
    <WorkspaceShell>
      <WorkspaceHeader
        eyebrow="Mercado"
        title="Vitacura · Casas"
        meta={`Corte ${date(market.latestObservedAt)} · ${freshness(market.freshnessStatus, market.observationAgeDays)}`}
        actions={[
          { label: 'Oferta vs ventas', href: '/dashboard/market/inteligencia', primary: true, icon: <TrendingUp size={15} /> },
          { label: 'Informe', href: '/dashboard/market/export', icon: <FileText size={15} /> },
        ]}
      />

      {market.error ? <div className="mt-4"><PublicErrorNotice compact message="No fue posible consultar toda la información de mercado." /></div> : null}

      <section className="mt-6 border-y border-[var(--n3-line)] py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Captura diaria · Portal Inmobiliario</p>
            <h2 className="mt-1 text-lg font-medium text-[var(--n3-text-light)]">Qué observamos hoy</h2>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--n3-text-muted)]">
              Primero mostramos el universo capturado y reconciliado. La inteligencia de mercado se calcula después, sólo sobre esta evidencia trazable.
            </p>
          </div>
          <div className="text-right">
            <Link href="/dashboard/market/oferta" className="mb-3 inline-flex min-h-10 items-center border border-[var(--n3-line)] px-3 text-xs text-[var(--n3-teal-soft)] hover:bg-white/[0.02]">
              Ver casas en oferta
            </Link>
            <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Última captura</p>
            <p className="mt-1 text-sm font-medium">{date(market.latestIngestionAt)}</p>
            <p className={`mt-1 text-xs ${market.latestIngestionFullSnapshot ? 'text-[var(--n3-teal-soft)]' : 'text-[#f0c96a]'}`}>
              {market.latestIngestionFullSnapshot ? 'Snapshot completo verificado' : 'Captura parcial · no se cierran bajas'}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-px bg-[var(--n3-line)] sm:grid-cols-2 xl:grid-cols-5">
          {[
            ['Casas en oferta', number(market.activeInventory), 'Universo vigente reconciliado'],
            ['Capturadas', number(market.latestIngestionAccepted), 'Aceptadas en la última corrida'],
            ['Nuevas', number(market.latestIngestionNew), 'No estaban en el corte anterior'],
            ['Actualizadas', number(market.latestIngestionUpdated), 'Cambió precio u otro dato'],
            ['Retiradas', number(market.latestIngestionRemoved), 'Ausentes de un snapshot completo'],
          ].map(([label, value, detail]) => (
            <div key={label} className="bg-[var(--n3-bg)] px-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
              <p className="mt-1 text-[11px] leading-4 text-[var(--n3-text-muted)]">{detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 text-xs text-[var(--n3-text-muted)] lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
          <div><span className="text-[var(--n3-text-light)]">1. Captura</span><br />Portal · Venta · Casa · Vitacura</div>
          <span className="hidden lg:block">→</span>
          <div><span className="text-[var(--n3-text-light)]">2. Reconciliación</span><br />IDs únicos · válidas · nuevas · actualizadas · retiradas</div>
          <span className="hidden lg:block">→</span>
          <div><span className="text-[var(--n3-text-light)]">3. Universo vigente</span><br />Sólo desde aquí se calculan los indicadores</div>
        </div>

        <div className="mt-6 border-t border-[var(--n3-line)] pt-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Deduplicación canónica</p>
              <h3 className="mt-1 text-base font-medium text-[var(--n3-text-light)]">Una propiedad, una identidad lógica</h3>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--n3-text-muted)]">
                Conservamos la evidencia original, pero los duplicados confirmados se consolidan antes de calcular mercado, territorio y valorización.
              </p>
            </div>
            <Link href="/dashboard/market/identidades" className="inline-flex min-h-10 items-center border border-[var(--n3-line)] px-3 text-xs text-[var(--n3-teal-soft)] hover:bg-white/[0.02]">
              Ver identidad y duplicados
            </Link>
          </div>

          <div className="mt-4 grid gap-px bg-[var(--n3-line)] sm:grid-cols-3">
            <div className="bg-[var(--n3-bg)] px-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Registros V1</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{number(market.canonicalProperties)}</p>
              <p className="mt-1 text-[11px] text-[var(--n3-text-muted)]">Casas dentro del universo operativo</p>
            </div>
            <div className="bg-[var(--n3-bg)] px-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Duplicados consolidados</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--n3-teal-soft)]">−{number(market.confirmedDuplicateRows)}</p>
              <p className="mt-1 text-[11px] text-[var(--n3-text-muted)]">{number(market.duplicateComponents)} grupos con identidad duplicada confirmada</p>
            </div>
            <div className="bg-[var(--n3-bg)] px-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Propiedades lógicas</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{number(market.logicalHouseComponents)}</p>
              <p className="mt-1 text-[11px] text-[var(--n3-text-muted)]">Base limpia usada por la inteligencia</p>
            </div>
          </div>

          <p className="mt-3 font-mono text-[11px] text-[var(--n3-text-muted)]">
            {number(market.canonicalProperties)} registros − {number(market.confirmedDuplicateRows)} duplicados confirmados = {number(market.logicalHouseComponents)} propiedades lógicas
          </p>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Inteligencia derivada</p>
          <h2 className="mt-1 text-lg font-medium text-[var(--n3-text-light)]">Qué nos dicen los datos</h2>
        </div>
        <MetricStrip items={[
          { label: 'Oferta activa', value: number(market.activeInventory) },
          { label: 'Ventas confirmadas', value: number(market.confirmedSales), tone: market.confirmedSales === null || market.confirmedSales === 0 ? 'warning' : 'default' },
          { label: 'Días en mercado', value: market.medianDaysOnMarket === null ? '—' : number(market.medianDaysOnMarket) },
          { label: 'Absorción', value: percent(market.absorptionRate) },
        ]} />

        <div className="mt-4">
          <CalculationTrace
            title="Oferta activa"
            source="Portal Inmobiliario · fuente canónica live de casas"
            universe="Venta · Casa · Vitacura · publicaciones vigentes reconciliadas"
            filters="Estado active/observed · fuente live actual"
            exclusions="Legacy, publicaciones retiradas y fuentes fuera del universo"
            formula="conteo de publicaciones vigentes del snapshot canónico"
            result={number(market.activeInventory)}
            note="La identidad canónica se aplica después para análisis por propiedad; los duplicados confirmados no inflan el universo lógico."
          />
          <CalculationTrace
            title="Propiedades lógicas"
            source="Universo V1 + relaciones de identidad confirmadas"
            universe={`${number(market.canonicalProperties)} registros V1`}
            exclusions={`${number(market.confirmedDuplicateRows)} registros duplicados confirmados`}
            formula="registros V1 − duplicados confirmados"
            result={number(market.logicalHouseComponents)}
          />
          <CalculationTrace
            title="Ventas confirmadas"
            source="Transacciones canónicas de casas"
            universe="Operaciones respaldadas por fuente transaccional"
            exclusions="Señales CRM sin fecha de cierre y estados no confirmados"
            formula="conteo de operaciones confirmadas del período"
            result={number(market.confirmedSales)}
          />
          <CalculationTrace
            title="Absorción"
            source="Oferta comparable + ventas confirmadas"
            universe="Mismo tipo de propiedad, territorio y período comparable"
            exclusions="Períodos sin ventas confirmadas suficientes"
            formula="ventas confirmadas / oferta comparable"
            result={percent(market.absorptionRate)}
            note="Si falta una fuente reciente de ventas, el sistema no publica una absorción estimada."
          />
        </div>
      </section>

      {actions.length > 0 ? (
        <section className="mt-8 max-w-5xl">
          <div className="flex items-center justify-between border-b border-[var(--n3-line)] pb-2">
            <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Qué requiere atención</h2>
            <span className="text-xs text-[var(--n3-text-muted)]">{actions.length}</span>
          </div>
          <div className="divide-y divide-[var(--n3-line)]">
            {actions.map((item) => (
              <Link key={item.label} href={item.href} className="grid min-h-20 gap-3 py-4 hover:bg-white/[0.02] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--n3-text-light)]">{item.label}</p>
                  <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--n3-text-muted)]">{item.reason}</p>
                </div>
                <span className={`text-sm font-semibold ${item.critical ? 'text-[#ff8d87]' : 'text-[#f0c96a]'}`}>{item.value}</span>
              </Link>
            ))}
          </div>
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
