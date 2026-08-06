import Link from 'next/link'
import { AlertTriangle, ArrowRight, Database, MapPin, RefreshCw } from 'lucide-react'
import { PublicErrorNotice } from '@/components/feedback/public-error-notice'
import { IntelligenceHeader, IntelligencePage, MetricCard, MetricGrid, SectionHeading } from '@/components/intelligence/design-system'
import { hasCapability } from '@/lib/access-control'
import { requireUserScope } from '@/lib/access-guards'
import { getOperationalMarketSnapshot, type MarketFreshnessStatus } from '@/lib/market-operational'

function n(value: number) { return value.toLocaleString('es-CL') }
function pct(value: number) { return `${(value * 100).toFixed(1)}%` }
function operationalValue(value: number | null, suffix = '') { return value === null ? 'N/D' : `${n(value)}${suffix}` }
function formatDate(value: string | null) {
  if (!value) return 'N/D'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'N/D' : date.toLocaleString('es-CL')
}
function freshnessLabel(status: MarketFreshnessStatus, ageDays: number | null) {
  if (status === 'recent') return ageDays === 0 ? 'Observado hoy' : `${ageDays} días`
  if (status === 'aging') return `${ageDays ?? 'N/D'} días`
  if (status === 'stale') return `${ageDays ?? 'N/D'} días`
  return 'Sin observación'
}

export default async function MarketPage() {
  const [operational, scope] = await Promise.all([getOperationalMarketSnapshot(), requireUserScope()])
  const canSeeAdministration = hasCapability(scope.role, 'management.global.read') || hasCapability(scope.role, 'management.office.read')
  const staleObservation = operational.freshnessStatus === 'stale'
  const agingObservation = operational.freshnessStatus === 'aging'
  const territorialCoverage = operational.canonicalProperties && operational.missingNeighborhoods !== null
    ? (operational.canonicalProperties - operational.missingNeighborhoods) / operational.canonicalProperties
    : null
  const currentInventoryLabel = staleObservation ? 'Publicaciones del último corte' : 'Publicaciones activas observadas'
  const dataRisk = staleObservation || agingObservation || (operational.pendingMatches ?? 0) > 0 || (operational.missingNeighborhoods ?? 0) > 0
  const decisionTitle = staleObservation
    ? 'Actualizar la observación antes de usar el inventario como vigente'
    : agingObservation
      ? 'Verificar disponibilidad y precios antes de decidir'
      : (operational.pendingMatches ?? 0) > 0
        ? `Resolver ${operational.pendingMatches} señales pendientes de revisión`
        : 'No hay una alerta operativa prioritaria en este corte'

  const actions = [
    ...(canSeeAdministration ? [{ label: 'Actualizar fuentes', href: '/dashboard/market/import', primary: true }] : []),
    { label: 'Revisar pendientes', href: '/dashboard/market/reconciliacion' },
    { label: 'Descargar reporte', href: '/dashboard/market/export' },
  ]

  return <IntelligencePage>
    <IntelligenceHeader
      eyebrow="Mercado · control ejecutivo"
      title="Estado del mercado y calidad del inventario"
      description="Inventario observado, vigencia del corte, señales pendientes y acciones necesarias antes de decidir."
      actions={actions}
      meta={<div className="grid w-full min-w-0 grid-cols-1 gap-px border border-[var(--n3-line)] bg-[var(--n3-line)] sm:min-w-[360px] sm:grid-cols-2">
        <div className="bg-[var(--n3-deep)] p-4"><p className="text-xs uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Base operativa</p><p className="mt-2 text-sm font-semibold">{operational.connected ? 'Conectada' : 'No disponible'}</p></div>
        <div className="bg-[var(--n3-deep)] p-4"><p className="text-xs uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Antigüedad del corte</p><p className={`mt-2 text-sm font-semibold ${staleObservation || agingObservation ? 'text-[#ff766f]' : ''}`}>{freshnessLabel(operational.freshnessStatus, operational.observationAgeDays)}</p></div>
      </div>}
    />

    {operational.error ? <PublicErrorNotice compact message="No fue posible consultar toda la información operativa. No se presentan resultados parciales como si fueran completos." /> : null}

    <section>
      <SectionHeading eyebrow="01 · Lo que debe saber hoy" title="Mercado en una mirada" description="Datos visibles, riesgo principal y decisión requerida." />
      <MetricGrid>
        <MetricCard label={currentInventoryLabel} value={operationalValue(operational.activeInventory)} detail={`Observado hasta ${formatDate(operational.latestObservedAt)}`} />
        <MetricCard label="Propiedades candidatas" value={operationalValue(operational.canonicalProperties)} detail={`${operational.confirmedProperties ?? 0} identidades confirmadas`} />
        <MetricCard label="Ventas confirmadas" value={operationalValue(operational.confirmedSales)} detail="Sólo transacciones persistidas y vinculadas" />
        <MetricCard label="Pendientes de revisión" value={operationalValue(operational.pendingMatches)} detail="Identidades o coincidencias que requieren validación" />
      </MetricGrid>
    </section>

    <section className={`border-l-2 bg-[#0c1111] p-5 ${dataRisk ? 'border-[#d7332b]' : 'border-[#2f8f4e]'}`}>
      <p className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] ${dataRisk ? 'text-[#ff766f]' : 'text-[#65c780]'}`}><AlertTriangle className="h-4 w-4"/>Decisión prioritaria</p>
      <h2 className="mt-2 text-xl font-semibold text-[var(--n3-text-light)]">{decisionTitle}</h2>
      <p className="mt-2 max-w-3xl text-sm text-[var(--n3-text-muted)]">Antes de usar una publicación para contacto, comparación o valorización, la plataforma debe mostrar vigencia suficiente, identidad revisada y cobertura territorial utilizable.</p>
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        {canSeeAdministration ? <Link href="/dashboard/market/import" className="inline-flex items-center gap-2 font-semibold text-[#ff766f]"><RefreshCw className="h-4 w-4"/>Actualizar fuentes</Link> : null}
        <Link href="/dashboard/market/reconciliacion" className="inline-flex items-center gap-2 font-semibold text-[var(--n3-text-light)]">Resolver pendientes<ArrowRight className="h-4 w-4"/></Link>
      </div>
    </section>

    <section>
      <SectionHeading eyebrow="02 · Calidad utilizable" title="Cobertura e integridad" description="Indicadores que determinan si el inventario puede utilizarse con seguridad." />
      <MetricGrid>
        <MetricCard label="Cobertura territorial" value={territorialCoverage === null ? 'N/D' : pct(territorialCoverage)} detail={`${operational.missingNeighborhoods ?? 0} registros sin barrio`} />
        <MetricCard label="Identidades confirmadas" value={operationalValue(operational.confirmedProperties)} detail={`De ${operational.canonicalProperties ?? 0} propiedades candidatas`} />
        <MetricCard label="Última ingestión" value={formatDate(operational.latestIngestionAt)} detail={`Estado: ${operational.latestIngestionStatus ?? 'N/D'}`} />
        <MetricCard label="Aceptadas / rechazadas" value={operational.latestIngestionAccepted === null && operational.latestIngestionRejected === null ? 'N/D' : `${operational.latestIngestionAccepted ?? 0} / ${operational.latestIngestionRejected ?? 0}`} detail="Resultado de la última ejecución" />
      </MetricGrid>
    </section>

    <section>
      <SectionHeading eyebrow="03 · Indicadores disponibles" title="Velocidad y absorción" description="Se muestran sólo cuando existe evidencia comparable suficiente." />
      <MetricGrid>
        <MetricCard label="Velocidad de venta" value={operationalValue(operational.medianDaysOnMarket, ' días')} detail="Requiere ventas confirmadas vinculadas" />
        <MetricCard label="Absorción" value={operational.absorptionRate === null ? 'N/D' : pct(operational.absorptionRate)} detail="Requiere inventario y ventas del mismo período" />
        <MetricCard label="Ejecuciones registradas" value={operationalValue(operational.ingestionRuns)} detail="Importaciones y backfills persistidos" />
        <MetricCard label="Observación más reciente" value={formatDate(operational.latestObservedAt)} detail={freshnessLabel(operational.freshnessStatus, operational.observationAgeDays)} />
      </MetricGrid>
    </section>

    <section className="grid gap-4 md:grid-cols-3">
      <Link href="/dashboard/properties" className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5 hover:border-[var(--n3-teal)]"><Database className="h-5 w-5"/><h3 className="mt-3 font-semibold">Ver propiedades y cartera</h3><p className="mt-2 text-sm text-[var(--n3-text-muted)]">Revisar propiedades asignadas, identidad y vigencia.</p></Link>
      <Link href="/dashboard/market/reconciliacion" className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5 hover:border-[var(--n3-teal)]"><MapPin className="h-5 w-5"/><h3 className="mt-3 font-semibold">Resolver calidad territorial</h3><p className="mt-2 text-sm text-[var(--n3-text-muted)]">Revisar coincidencias, barrios e identidad.</p></Link>
      <Link href="/dashboard/market/export" className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5 hover:border-[var(--n3-teal)]"><ArrowRight className="h-5 w-5"/><h3 className="mt-3 font-semibold">Abrir reporte de mercado</h3><p className="mt-2 text-sm text-[var(--n3-text-muted)]">Descargar el mismo corte con fecha y trazabilidad.</p></Link>
    </section>

    <details className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-4 text-sm text-[var(--n3-text-muted)]">
      <summary className="cursor-pointer font-semibold text-[var(--n3-text-light)]">Ver metodología, exportaciones y límites</summary>
      <div className="mt-4 space-y-3 leading-6">
        <p>Las publicaciones representan el último corte observado y no confirman disponibilidad en tiempo real. El retiro de una publicación no se interpreta automáticamente como venta.</p>
        <p>Los valores faltantes permanecen como N/D. Velocidad y absorción no se calculan sin ventas confirmadas e inventario comparable del mismo período.</p>
        <p>CSV, XLSX y PDF reutilizan el mismo dataset operativo y conservan fecha de generación, fecha observada y metodología.</p>
        <div className="flex flex-wrap gap-4 pt-2"><a href="/api/market/export?dataset=summary&format=csv" className="font-semibold text-[#ff766f]">CSV resumen</a><a href="/api/market/export?dataset=listings&format=xlsx" className="font-semibold text-[#ff766f]">XLSX publicaciones</a>{canSeeAdministration?<Link href="/dashboard/market/roadmap" className="font-semibold text-[#ff766f]">Roadmap canónico</Link>:null}</div>
      </div>
    </details>
  </IntelligencePage>
}
