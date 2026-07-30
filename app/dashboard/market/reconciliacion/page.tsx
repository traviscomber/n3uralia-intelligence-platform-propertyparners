import {
  IntelligenceHeader,
  IntelligencePage,
  IntelligencePanel,
  MethodologyNote,
  MetricCard,
  MetricGrid,
  SectionHeading,
} from '@/components/intelligence/design-system'
import { getCanonicalMarketReconciliation } from '@/lib/market-canonical-reconciliation'

function n(value: number) {
  return value.toLocaleString('es-CL')
}

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`
}

function date(value: string | null) {
  if (!value) return 'Sin observación'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? 'Fecha inválida' : parsed.toLocaleString('es-CL')
}

export default async function CanonicalMarketReconciliationPage() {
  const reconciliation = await getCanonicalMarketReconciliation()

  return (
    <IntelligencePage>
      <IntelligenceHeader
        eyebrow="Mercado · Reconciliación canónica"
        title="Cobertura entre fuentes auditadas y base operativa"
        description="Compara el universo documental canónico con los registros materializados en Supabase. Las diferencias se presentan como brechas de procesamiento, no como datos faltantes inventados."
        actions={[
          { label: 'Volver a Mercado', href: '/dashboard/market' },
          { label: 'Ver trazabilidad', href: '/dashboard/market/fuentes', primary: true },
        ]}
        meta={
          <div className="grid min-w-[360px] grid-cols-2 gap-px border border-[var(--n3-line)] bg-[var(--n3-line)]">
            <div className="bg-[#0c1111] p-4"><p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Alcance</p><p className="mt-2 text-sm font-semibold">{reconciliation.scope.commune} · {reconciliation.scope.operation}</p></div>
            <div className="bg-[#0c1111] p-4"><p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Última observación operativa</p><p className="mt-2 text-sm font-semibold">{date(reconciliation.operational.latestObservedAt)}</p></div>
          </div>
        }
      />

      {reconciliation.error ? <div className="border border-[#d7332b] bg-[#0c1111] p-4 text-sm text-[#ff766f]">La reconciliación operativa está incompleta: {reconciliation.error}</div> : null}

      <section>
        <SectionHeading eyebrow="01 · Universo canónico" title="Fuentes auditadas disponibles" description="Estos conteos provienen de manifiestos con hash y perfiles de estructura. No implican que cada fila ya esté reconciliada como entidad operativa." />
        <MetricGrid>
          <MetricCard label="Archivos fuente auditados" value={n(reconciliation.canonical.sourceFiles)} detail="Portal, CBRS y geometría KML" />
          <MetricCard label="Publicaciones Portal con ID válido" value={n(reconciliation.canonical.portalValidListings)} detail={`${n(reconciliation.canonical.portalSaleEligibleListings)} elegibles para venta`} />
          <MetricCard label="Filas CBRS disponibles" value={n(reconciliation.canonical.cbrsRows)} detail="Registros fuente; no ventas confirmadas automáticamente" />
          <MetricCard label="Barrios KML" value={n(reconciliation.canonical.neighborhoods)} detail="Polígonos territoriales auditados" />
        </MetricGrid>
      </section>

      <section>
        <SectionHeading eyebrow="02 · Materialización operativa" title="Registros actualmente disponibles en Supabase" description="Estos son los registros que hoy pueden ser consultados operativamente con trazabilidad de ingestión." />
        <MetricGrid>
          <MetricCard label="Registros candidatos" value={n(reconciliation.operational.properties)} detail={`${n(reconciliation.operational.confirmedProperties)} identidades confirmadas`} />
          <MetricCard label="Publicaciones observadas activas" value={n(reconciliation.operational.activeListings)} detail="Estado de la última observación por fuente y publicación" />
          <MetricCard label="Ventas confirmadas" value={n(reconciliation.operational.confirmedSales)} detail="Sólo transacciones vinculadas y persistidas" />
          <MetricCard label="Ejecuciones de ingestión" value={n(reconciliation.operational.ingestionRuns)} detail="Procesamientos registrados en Supabase" />
        </MetricGrid>
      </section>

      <section>
        <SectionHeading eyebrow="03 · Cobertura" title="Avance real de reconciliación" description="La cobertura Portal se expresa contra publicaciones con identificador válido. No debe interpretarse como cobertura de propiedades únicas." />
        <MetricGrid>
          <MetricCard label="Portal materializado" value={pct(reconciliation.coverage.portalMaterializedRate)} detail={`${n(reconciliation.operational.properties)} registros operativos / ${n(reconciliation.canonical.portalValidListings)} publicaciones fuente`} />
          <MetricCard label="Cobertura territorial operativa" value={pct(reconciliation.coverage.territorialCoverageRate)} detail={`${n(reconciliation.gaps.neighborhoodsMissing)} registros todavía sin barrio`} />
          <MetricCard label="Publicaciones aún no materializadas" value={n(reconciliation.gaps.portalListingsNotMaterialized)} detail="Diferencia documental; requiere ingestión y validación" />
          <MetricCard label="Identidades sin confirmar" value={n(reconciliation.gaps.identitiesUnconfirmed)} detail="No se confirman por similitud o score únicamente" />
        </MetricGrid>
      </section>

      <section>
        <SectionHeading eyebrow="04 · Cuarentena y restricciones" title="Datos que no deben mezclarse" />
        <div className="grid gap-5 xl:grid-cols-2">
          <IntelligencePanel eyebrow="Portal" title={`${n(reconciliation.canonical.portalRentQuarantine)} publicaciones aisladas por señal de arriendo`} description="Se excluyen del universo elegible para venta y no se convierten en inventario comercial de venta.">
            <div className="p-5"><MethodologyNote>La ausencia de una señal explícita de arriendo no confirma por sí sola que una publicación corresponda a venta. El sistema conserva esa limitación.</MethodologyNote></div>
          </IntelligencePanel>
          <IntelligencePanel eyebrow="CBRS" title={`${n(reconciliation.gaps.cbrsRowsNotMaterialized)} filas aún no materializadas como transacciones confirmadas`} description="El universo registral requiere filtrado tipológico, claves determinísticas y vinculación de activos.">
            <div className="p-5"><MethodologyNote>Una fila CBRS puede representar distintos tipos de inscripción. No se presenta como venta residencial comparable sin validación de tipo, fecha, activo y evidencia territorial.</MethodologyNote></div>
          </IntelligencePanel>
        </div>
      </section>

      <section>
        <IntelligencePanel eyebrow="Reglas de control" title="Interpretación permitida" description="La reconciliación conserva diferencias entre archivos, publicaciones, propiedades y transacciones.">
          <div className="space-y-3 p-5 text-sm text-[var(--n3-text-muted)]">
            {reconciliation.notes.map((note) => <p key={note} className="border-l-2 border-[#d7332b] pl-3">{note}</p>)}
          </div>
        </IntelligencePanel>
      </section>
    </IntelligencePage>
  )
}
