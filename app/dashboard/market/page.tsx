import {
  IntelligenceHeader,
  IntelligencePage,
  IntelligencePanel,
  MethodologyNote,
  MetricCard,
  MetricGrid,
  SectionHeading,
} from '@/components/intelligence/design-system'
import { getOperationalMarketSnapshot, type MarketFreshnessStatus } from '@/lib/market-operational'

function n(value: number) {
  return value.toLocaleString('es-CL')
}

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`
}

function operationalValue(value: number | null, suffix = '') {
  return value === null ? 'Sin datos operativos' : `${n(value)}${suffix}`
}

function formatDate(value: string | null) {
  if (!value) return 'Sin fecha'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Fecha inválida' : date.toLocaleString('es-CL')
}

function freshnessLabel(status: MarketFreshnessStatus, ageDays: number | null) {
  if (status === 'recent') return ageDays === 0 ? 'Observado hoy' : `${ageDays} días · reciente`
  if (status === 'aging') return `${ageDays ?? '—'} días · envejeciendo`
  if (status === 'stale') return `${ageDays ?? '—'} días · desactualizado`
  return 'Sin observación'
}

export default async function MarketPage() {
  const operational = await getOperationalMarketSnapshot()
  const staleObservation = operational.freshnessStatus === 'stale'
  const agingObservation = operational.freshnessStatus === 'aging'
  const territorialCoverage = operational.canonicalProperties && operational.missingNeighborhoods !== null
    ? (operational.canonicalProperties - operational.missingNeighborhoods) / operational.canonicalProperties
    : null

  return (
    <IntelligencePage>
      <IntelligenceHeader
        eyebrow="Módulo I · Datos operativos"
        title="Inteligencia de Mercado Vitacura"
        description="Esta vista muestra exclusivamente información almacenada y trazable en Supabase. No incluye cifras de archivos históricos, benchmarks externos, datos demostrativos ni estimaciones no materializadas."
        actions={[
          { label: 'Roadmap canónico', href: '/dashboard/market/roadmap', primary: true },
          { label: 'Reconciliación canónica', href: '/dashboard/market/reconciliacion' },
          { label: 'Fuentes operativas', href: '/dashboard/market/fuentes' },
        ]}
        meta={
          <div className="grid min-w-[360px] grid-cols-2 gap-px border border-[var(--n3-line)] bg-[var(--n3-line)]">
            <div className="bg-[#0c1111] p-4"><p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Base operativa</p><p className="mt-2 text-sm font-semibold">{operational.connected ? 'Conectada' : 'No disponible'}</p></div>
            <div className="bg-[#0c1111] p-4"><p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Frescura del dato</p><p className={`mt-2 text-sm font-semibold ${staleObservation || agingObservation ? 'text-[#ff766f]' : ''}`}>{freshnessLabel(operational.freshnessStatus, operational.observationAgeDays)}</p></div>
          </div>
        }
      />

      {operational.error ? <div className="border border-[#d7332b] bg-[#0c1111] p-4 text-sm text-[#ff766f]">No fue posible consultar toda la información operativa: {operational.error}</div> : null}

      <section>
        <SectionHeading eyebrow="01 · Estado real" title="Registros y publicaciones observadas" description="Los registros permanecen como candidatos mientras no exista confirmación de identidad. Una publicación activa corresponde al estado más reciente observado, no a disponibilidad verificada en tiempo real." />
        <MetricGrid>
          <MetricCard label="Registros canónicos candidatos" value={operationalValue(operational.canonicalProperties)} detail={`${operational.confirmedProperties ?? 0} identidades confirmadas`} />
          <MetricCard label="Publicaciones observadas activas" value={operationalValue(operational.activeInventory)} detail={`Última observación: ${formatDate(operational.latestObservedAt)}`} />
          <MetricCard label="Ventas confirmadas" value={operationalValue(operational.confirmedSales)} detail="Sólo transacciones persistidas y vinculadas en la base operativa" />
          <MetricCard label="Identidades por revisar" value={operationalValue(operational.pendingMatches)} detail="Candidatos y coincidencias pendientes de validación humana" />
        </MetricGrid>
      </section>

      <section>
        <SectionHeading eyebrow="02 · Calidad" title="Cobertura territorial e integridad" description="Estas métricas se calculan directamente sobre los registros operativos actuales." />
        <MetricGrid>
          <MetricCard label="Registros sin barrio" value={operationalValue(operational.missingNeighborhoods)} detail={`De ${operational.canonicalProperties ?? 0} registros operativos`} />
          <MetricCard label="Cobertura territorial" value={territorialCoverage === null ? 'Sin datos operativos' : pct(territorialCoverage)} detail="Registros con barrio asignado / total de registros" />
          <MetricCard label="Ejecuciones registradas" value={operationalValue(operational.ingestionRuns)} detail="Backfills e importaciones canónicas almacenadas" />
          <MetricCard label="Última ejecución" value={`${operational.latestIngestionAccepted ?? 0} / ${operational.latestIngestionRejected ?? 0}`} detail="Aceptadas / rechazadas" />
        </MetricGrid>
      </section>

      <section>
        <SectionHeading eyebrow="03 · Vigencia" title="Procesamiento y fecha observada" description="La fecha de proceso no reemplaza la fecha real de observación de la fuente." />
        <MetricGrid>
          <MetricCard label="Procesado el" value={formatDate(operational.latestIngestionAt)} detail={`Estado: ${operational.latestIngestionStatus ?? 'sin ejecución'}`} />
          <MetricCard label="Datos observados hasta" value={formatDate(operational.latestObservedAt)} detail={freshnessLabel(operational.freshnessStatus, operational.observationAgeDays)} />
          <MetricCard label="Velocidad de venta" value={operationalValue(operational.medianDaysOnMarket, ' días')} detail="No se calcula sin ventas confirmadas vinculadas" />
          <MetricCard label="Absorción" value={operational.absorptionRate === null ? 'Sin datos operativos' : pct(operational.absorptionRate)} detail="No se calcula sin inventario y ventas del mismo período" />
        </MetricGrid>
        {staleObservation ? <div className="mt-4 border border-[#d7332b] bg-[#0c1111] p-4 text-xs leading-5 text-[var(--n3-text-muted)]">La última observación supera siete días. Estas publicaciones no deben presentarse como inventario vigente hasta ejecutar un nuevo corte.</div> : null}
        {agingObservation ? <div className="mt-4 border border-[#8a6b2e] bg-[#0c1111] p-4 text-xs leading-5 text-[var(--n3-text-muted)]">La última observación tiene entre cuatro y siete días. El inventario puede haber cambiado desde el corte.</div> : null}
      </section>

      <section>
        <IntelligencePanel eyebrow="Criterio de presentación" title="Sólo evidencia operativa" description="Los archivos históricos y benchmarks permanecen fuera de esta vista de reunión.">
          <div className="p-5"><MethodologyNote>La plataforma no completa valores faltantes con ejemplos. Velocidad, absorción, ventas y valorizaciones permanecen en estado “Sin datos operativos” hasta contar con evidencia suficiente y trazable. Un retiro de publicación no se interpreta automáticamente como venta.</MethodologyNote></div>
        </IntelligencePanel>
      </section>
    </IntelligencePage>
  )
}
