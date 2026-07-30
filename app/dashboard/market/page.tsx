import {
  IntelligenceHeader,
  IntelligencePage,
  IntelligencePanel,
  MethodologyNote,
  OperationalDataCard,
  OperationalDataGrid,
  OperationalPageStatus,
  SectionHeading,
  type OperationalFreshness,
} from '@/components/intelligence/design-system'
import { getOperationalMarketSnapshot } from '@/lib/market-operational'

function n(value: number | null) {
  return value === null ? 'Sin datos' : value.toLocaleString('es-CL')
}

function pct(value: number | null) {
  return value === null ? 'Sin datos' : `${(value * 100).toFixed(1)}%`
}

export default async function MarketPage() {
  const operational = await getOperationalMarketSnapshot()
  const freshness = operational.freshnessStatus as OperationalFreshness
  const territorialCoverage = operational.canonicalProperties && operational.missingNeighborhoods !== null
    ? (operational.canonicalProperties - operational.missingNeighborhoods) / operational.canonicalProperties
    : null
  const warning = freshness === 'stale'
    ? 'El corte supera siete días; no representa disponibilidad actual.'
    : freshness === 'aging'
      ? 'El inventario puede haber cambiado desde el último corte.'
      : operational.error ?? null

  return (
    <IntelligencePage>
      <IntelligenceHeader
        eyebrow="Módulo I · Datos operativos"
        title="Inteligencia de Mercado Vitacura"
        description="Cada cifra incluye estado, fuente, fecha observada y explicación. Esta vista excluye benchmarks, datos demostrativos y archivos históricos no materializados en la base operativa."
        actions={[
          { label: 'Fuentes operativas', href: '/dashboard/market/fuentes' },
          { label: 'Importar nueva fuente', href: '/dashboard/market/import', primary: true },
        ]}
      />

      <OperationalPageStatus
        connected={operational.connected}
        observedAt={operational.latestObservedAt}
        processedAt={operational.latestIngestionAt}
        freshness={freshness}
        warning={warning}
        source="Supabase · publicaciones y propiedades canónicas"
      />

      <section>
        <SectionHeading eyebrow="01 · Qué sabemos" title="Estado operativo del mercado" description="Los valores corresponden exclusivamente al estado persistido en Supabase." />
        <OperationalDataGrid>
          <OperationalDataCard label="Registros canónicos" value={n(operational.canonicalProperties)} status="candidate" observedAt={operational.latestObservedAt} source="market_properties" explanation={`${operational.confirmedProperties ?? 0} identidades confirmadas; los demás registros permanecen pendientes de conciliación.`} />
          <OperationalDataCard label="Publicaciones activas" value={n(operational.activeInventory)} status="observed" observedAt={operational.latestObservedAt} source="market_current_listings" explanation="Estado más reciente observado por publicación. No equivale a disponibilidad verificada hoy." />
          <OperationalDataCard label="Ventas confirmadas" value={n(operational.confirmedSales)} status={operational.confirmedSales ? 'confirmed' : 'no_data'} observedAt={operational.latestObservedAt} source="market_transactions" explanation="Sólo transacciones persistidas y vinculadas a una propiedad canónica." />
          <OperationalDataCard label="Identidades por revisar" value={n(operational.pendingMatches)} status={operational.pendingMatches ? 'incomplete' : 'confirmed'} observedAt={operational.latestObservedAt} source="market_properties · market_property_matches" explanation="Registros candidatos o coincidencias pendientes de validación humana." />
        </OperationalDataGrid>
      </section>

      <section>
        <SectionHeading eyebrow="02 · Calidad" title="Cobertura y brechas visibles" description="Una brecha no se reemplaza por inferencias ni valores estimados." />
        <OperationalDataGrid>
          <OperationalDataCard label="Registros sin barrio" value={n(operational.missingNeighborhoods)} status={operational.missingNeighborhoods ? 'incomplete' : 'confirmed'} observedAt={operational.latestObservedAt} source="market_properties.neighborhood_id" explanation={`Registros sin asignación territorial de un total de ${operational.canonicalProperties ?? 0}.`} />
          <OperationalDataCard label="Cobertura territorial" value={pct(territorialCoverage)} status={territorialCoverage === null ? 'no_data' : territorialCoverage === 1 ? 'confirmed' : 'incomplete'} observedAt={operational.latestObservedAt} source="market_properties" explanation="Proporción de registros con barrio asignado respecto del total operativo." />
          <OperationalDataCard label="Ejecuciones" value={n(operational.ingestionRuns)} status={operational.ingestionRuns ? 'confirmed' : 'no_data'} observedAt={operational.latestIngestionAt} source="market_ingestion_runs" explanation="Backfills e importaciones canónicas registradas en el pipeline." />
          <OperationalDataCard label="Última ejecución" value={`${operational.latestIngestionAccepted ?? 0} / ${operational.latestIngestionRejected ?? 0}`} status={(operational.latestIngestionRejected ?? 0) > 0 ? 'incomplete' : 'confirmed'} observedAt={operational.latestIngestionAt} source="market_ingestion_runs" explanation="Filas aceptadas / rechazadas en la ejecución más reciente." />
        </OperationalDataGrid>
      </section>

      <section>
        <SectionHeading eyebrow="03 · Qué falta" title="Métricas aún no calculables" description="Se mantienen como sin datos hasta contar con evidencia suficiente del mismo período." />
        <OperationalDataGrid>
          <OperationalDataCard label="Velocidad de venta" value={operational.medianDaysOnMarket === null ? 'Sin datos' : `${operational.medianDaysOnMarket} días`} status={operational.medianDaysOnMarket === null ? 'no_data' : 'confirmed'} observedAt={operational.latestObservedAt} source="market_metric_snapshots" explanation="Requiere primera observación y venta confirmada vinculada." />
          <OperationalDataCard label="Absorción" value={operational.absorptionRate === null ? 'Sin datos' : pct(operational.absorptionRate)} status={operational.absorptionRate === null ? 'no_data' : 'confirmed'} observedAt={operational.latestObservedAt} source="market_metric_snapshots" explanation="Requiere inventario y ventas confirmadas dentro del mismo período." />
          <OperationalDataCard label="Identidades confirmadas" value={n(operational.confirmedProperties)} status={operational.confirmedProperties ? 'confirmed' : 'no_data'} observedAt={operational.latestObservedAt} source="market_properties.identity_status" explanation="Sólo se confirma una identidad después de revisar evidencia suficiente." />
          <OperationalDataCard label="Estado del corte" value={freshness === 'stale' ? 'Desactualizado' : freshness === 'aging' ? 'Envejeciendo' : freshness === 'recent' ? 'Reciente' : 'Sin observación'} status={freshness === 'recent' ? 'confirmed' : freshness === 'unknown' ? 'no_data' : 'incomplete'} observedAt={operational.latestObservedAt} source="market_current_listings.observed_at" explanation="La vigencia se calcula desde la fecha observada, no desde la fecha de procesamiento." />
        </OperationalDataGrid>
      </section>

      <IntelligencePanel eyebrow="Conclusión operacional" title="Lectura ejecutiva" description="Resumen automático del estado actual.">
        <div className="p-5"><MethodologyNote>La base contiene {operational.canonicalProperties ?? 0} registros candidatos, {operational.confirmedProperties ?? 0} identidades confirmadas y {operational.missingNeighborhoods ?? 0} registros sin barrio. Las ventas, velocidad y absorción permanecen sin datos hasta incorporar transacciones confirmadas y períodos comparables.</MethodologyNote></div>
      </IntelligencePanel>
    </IntelligencePage>
  )
}
