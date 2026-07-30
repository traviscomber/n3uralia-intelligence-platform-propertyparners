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
import { createClient } from '@/lib/supabase/server'

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
  if (!value) return 'Sin fecha disponible'
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
  const [operational, supabase] = await Promise.all([
    getOperationalMarketSnapshot(),
    createClient(),
  ])
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    : { data: null }
  const role = String(profile?.role ?? '').toLowerCase()
  const canSeeAdministration = ['admin', 'ceo', 'director', 'subdirector'].includes(role)
  const staleObservation = operational.freshnessStatus === 'stale'
  const agingObservation = operational.freshnessStatus === 'aging'
  const territorialCoverage = operational.canonicalProperties && operational.missingNeighborhoods !== null
    ? (operational.canonicalProperties - operational.missingNeighborhoods) / operational.canonicalProperties
    : null
  const currentInventoryLabel = staleObservation ? 'Publicaciones del último corte' : 'Publicaciones observadas activas'

  return (
    <IntelligencePage>
      <IntelligenceHeader
        eyebrow="Módulo I · Datos operativos"
        title="Inteligencia de Mercado Vitacura"
        description="Vista operativa construida exclusivamente con registros persistidos en Supabase. Las publicaciones corresponden al último corte observado y no constituyen una confirmación de disponibilidad en tiempo real."
        actions={canSeeAdministration ? [
          { label: 'Roadmap canónico', href: '/dashboard/market/roadmap', primary: true },
          { label: 'Reconciliación canónica', href: '/dashboard/market/reconciliacion' },
        ] : []}
        meta={
          <div className="grid w-full min-w-0 grid-cols-1 gap-px border border-[var(--n3-line)] bg-[var(--n3-line)] sm:min-w-[360px] sm:grid-cols-2">
            <div className="bg-[#0c1111] p-4"><p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Base operativa</p><p className="mt-2 text-sm font-semibold">{operational.connected ? 'Conectada' : 'No disponible'}</p></div>
            <div className="bg-[#0c1111] p-4"><p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Frescura del corte</p><p className={`mt-2 text-sm font-semibold ${staleObservation || agingObservation ? 'text-[#ff766f]' : ''}`}>{freshnessLabel(operational.freshnessStatus, operational.observationAgeDays)}</p></div>
          </div>
        }
      />

      {operational.error ? <div role="alert" className="border border-[#d7332b] bg-[#0c1111] p-4 text-sm text-[#ff766f]">No fue posible consultar toda la información operativa: {operational.error}</div> : null}

      {!operational.error && operational.canonicalProperties === 0 ? (
        <div className="border border-dashed border-[var(--n3-line)] p-5 text-sm text-[var(--n3-text-muted)]">La conexión está disponible, pero todavía no existen registros materializados para este mercado.</div>
      ) : null}

      <section>
        <SectionHeading eyebrow="01 · Estado real" title="Registros y publicaciones observadas" description="Los registros permanecen como candidatos mientras no exista confirmación humana de identidad. Las cifras de inventario corresponden al estado más reciente almacenado." />
        <MetricGrid>
          <MetricCard label="Registros canónicos candidatos" value={operationalValue(operational.canonicalProperties)} detail={`${operational.confirmedProperties ?? 0} identidades confirmadas`} />
          <MetricCard label={currentInventoryLabel} value={operationalValue(operational.activeInventory)} detail={`Observados hasta: ${formatDate(operational.latestObservedAt)}`} />
          <MetricCard label="Ventas confirmadas" value={operationalValue(operational.confirmedSales)} detail="Sólo transacciones persistidas y vinculadas en la base operativa" />
          <MetricCard label="Señales pendientes de revisión" value={operationalValue(operational.pendingMatches)} detail="Suma operativa de identidades y coincidencias candidatas; no equivale necesariamente a propiedades únicas" />
        </MetricGrid>
      </section>

      <section>
        <SectionHeading eyebrow="02 · Calidad" title="Cobertura territorial e integridad" description="Métricas calculadas directamente sobre los registros operativos actuales." />
        <MetricGrid>
          <MetricCard label="Registros sin barrio" value={operationalValue(operational.missingNeighborhoods)} detail={`De ${operational.canonicalProperties ?? 0} registros operativos`} />
          <MetricCard label="Cobertura territorial" value={territorialCoverage === null ? 'Sin datos operativos' : pct(territorialCoverage)} detail="Registros con barrio asignado / total de registros" />
          <MetricCard label="Ejecuciones registradas" value={operationalValue(operational.ingestionRuns)} detail="Backfills e importaciones canónicas almacenadas" />
          <MetricCard label="Última ejecución" value={operational.latestIngestionAccepted === null && operational.latestIngestionRejected === null ? 'Sin ejecución' : `${operational.latestIngestionAccepted ?? 0} / ${operational.latestIngestionRejected ?? 0}`} detail="Filas aceptadas / rechazadas" />
        </MetricGrid>
      </section>

      <section>
        <SectionHeading eyebrow="03 · Vigencia" title="Procesamiento y fecha observada" description="La fecha de procesamiento técnico no reemplaza la fecha real de observación de la fuente." />
        <MetricGrid>
          <MetricCard label="Último procesamiento" value={formatDate(operational.latestIngestionAt)} detail={`Estado: ${operational.latestIngestionStatus ?? 'sin ejecución'}`} />
          <MetricCard label="Datos observados hasta" value={formatDate(operational.latestObservedAt)} detail={freshnessLabel(operational.freshnessStatus, operational.observationAgeDays)} />
          <MetricCard label="Velocidad de venta" value={operationalValue(operational.medianDaysOnMarket, ' días')} detail="No se calcula sin ventas confirmadas vinculadas" />
          <MetricCard label="Absorción" value={operational.absorptionRate === null ? 'Sin datos operativos' : pct(operational.absorptionRate)} detail="No se calcula sin inventario y ventas del mismo período" />
        </MetricGrid>
        {staleObservation ? <div role="status" className="mt-4 border border-[#d7332b] bg-[#0c1111] p-4 text-xs leading-5 text-[var(--n3-text-muted)]">La última observación supera siete días. Estas publicaciones deben tratarse como un corte histórico operativo, no como inventario vigente, hasta ejecutar una nueva observación.</div> : null}
        {agingObservation ? <div role="status" className="mt-4 border border-[#8a6b2e] bg-[#0c1111] p-4 text-xs leading-5 text-[var(--n3-text-muted)]">La última observación tiene entre cuatro y siete días. La disponibilidad y los precios pueden haber cambiado desde el corte.</div> : null}
      </section>

      <section>
        <IntelligencePanel eyebrow="Criterio de presentación" title="Sólo evidencia operativa" description="Los históricos no materializados y benchmarks externos permanecen fuera de esta vista.">
          <div className="p-5"><MethodologyNote>La plataforma no completa valores faltantes con ejemplos. Velocidad, absorción, ventas y valorizaciones permanecen en “Sin datos operativos” hasta contar con evidencia suficiente y trazable. El retiro de una publicación no se interpreta automáticamente como venta.</MethodologyNote></div>
        </IntelligencePanel>
      </section>
    </IntelligencePage>
  )
}
