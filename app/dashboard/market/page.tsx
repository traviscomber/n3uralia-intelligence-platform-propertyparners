import Link from 'next/link'
import {
  IntelligenceHeader,
  IntelligencePage,
  IntelligencePanel,
  MethodologyNote,
  MetricCard,
  MetricGrid,
  RankedRow,
  SectionHeading,
} from '@/components/intelligence/design-system'
import { buildMarketContractSnapshot } from '@/lib/market-contract'
import { getOperationalMarketSnapshot, type MarketFreshnessStatus } from '@/lib/market-operational'

function n(value: number) {
  return value.toLocaleString('es-CL')
}

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`
}

function statusLabel(status: 'available' | 'partial' | 'pending_source') {
  if (status === 'available') return 'Disponible'
  if (status === 'partial') return 'Parcial'
  return 'Pendiente de fuente'
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
  const snapshot = buildMarketContractSnapshot()
  const operational = await getOperationalMarketSnapshot()
  const availableMetrics = snapshot.metrics.filter((metric) => metric.status !== 'pending_source')
  const pendingMetrics = snapshot.metrics.filter((metric) => metric.status === 'pending_source')
  const topNeighborhoods = snapshot.neighborhoods.slice(0, 12)
  const staleObservation = operational.freshnessStatus === 'stale'
  const agingObservation = operational.freshnessStatus === 'aging'

  return (
    <IntelligencePage>
      <IntelligenceHeader
        eyebrow="Módulo I · Alcance contractual"
        title="Inteligencia de Mercado Vitacura"
        description="Oferta publicada, ventas registrales, registros de propiedades e indicadores se presentan con trazabilidad explícita. La plataforma distingue procesamiento, fecha observada, identidades candidatas e identidades confirmadas."
        actions={[
          { label: 'Exportar resumen CSV', href: '/api/market/export', primary: true },
          { label: 'Fuentes y trazabilidad', href: '/dashboard/market/fuentes' },
          { label: 'Importar nueva fuente', href: '/dashboard/market/import' },
        ]}
        meta={
          <div className="grid min-w-[420px] grid-cols-4 gap-px border border-[var(--n3-line)] bg-[var(--n3-line)]">
            <div className="bg-[#0c1111] p-4"><p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Fuentes históricas</p><p className="mt-2 text-sm font-semibold">{snapshot.sourceCount}</p></div>
            <div className="bg-[#0c1111] p-4"><p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Celdas auditadas</p><p className="mt-2 text-sm font-semibold">{n(snapshot.cellCount)}</p></div>
            <div className="bg-[#0c1111] p-4"><p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Base operativa</p><p className="mt-2 text-sm font-semibold">{operational.connected ? 'Conectada' : 'Pendiente'}</p></div>
            <div className="bg-[#0c1111] p-4"><p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Frescura del dato</p><p className={`mt-2 text-sm font-semibold ${staleObservation || agingObservation ? 'text-[#ff766f]' : ''}`}>{freshnessLabel(operational.freshnessStatus, operational.observationAgeDays)}</p></div>
          </div>
        }
      />

      <section>
        <SectionHeading eyebrow="01 · Operación" title="Registros operativos y métricas validadas" description="Los conteos distinguen publicaciones importadas de propiedades cuya identidad ya fue confirmada. Velocidad y absorción sólo se publican cuando existen ventas confirmadas y un período calculado." />
        <MetricGrid>
          <MetricCard label="Registros canónicos candidatos" value={operationalValue(operational.canonicalProperties)} detail={`${operational.confirmedProperties ?? 0} identidades confirmadas; el resto permanece en revisión`} />
          <MetricCard label="Publicaciones observadas como activas" value={operationalValue(operational.activeInventory)} detail={operational.latestPeriod ? `Inventario calculado para ${operational.latestPeriod}` : `Última observación disponible: ${formatDate(operational.latestObservedAt)}. No equivale a actividad verificada hoy.`} />
          <MetricCard label="Velocidad de venta" value={operationalValue(operational.medianDaysOnMarket, ' días')} detail="Sólo se calcula con venta confirmada vinculada a la primera publicación" />
          <MetricCard label="Absorción" value={operational.absorptionRate === null ? 'Sin datos operativos' : pct(operational.absorptionRate)} detail="Ventas confirmadas / inventario deduplicado del mismo período" />
        </MetricGrid>
      </section>

      <section>
        <SectionHeading eyebrow="02 · Pipeline" title="Procesamiento, observación y calidad" description="La fecha de procesamiento indica cuándo se ejecutó el pipeline. La fecha observada indica hasta cuándo la fuente respalda el estado de las publicaciones." />
        <MetricGrid>
          <MetricCard label="Ejecuciones registradas" value={operationalValue(operational.ingestionRuns)} detail="Incluye backfill histórico e importaciones canónicas." />
          <MetricCard label="Procesado el" value={formatDate(operational.latestIngestionAt)} detail={`Estado de la última ejecución: ${operational.latestIngestionStatus ?? 'sin ejecución'}.`} />
          <MetricCard label="Datos observados hasta" value={formatDate(operational.latestObservedAt)} detail={freshnessLabel(operational.freshnessStatus, operational.observationAgeDays)} />
          <MetricCard label="Calidad de última ejecución" value={`${operational.latestIngestionAccepted ?? 0} / ${operational.latestIngestionRejected ?? 0}`} detail="Aceptadas / rechazadas con errores explícitos." />
        </MetricGrid>
        {staleObservation ? <div className="mt-4 border border-[#d7332b] bg-[#0c1111] p-4 text-xs leading-5 text-[var(--n3-text-muted)]">La última observación de la fuente supera siete días. Las publicaciones deben tratarse como históricas y no como inventario activo actual hasta completar una nueva observación.</div> : null}
        {agingObservation ? <div className="mt-4 border border-[#8a6b2e] bg-[#0c1111] p-4 text-xs leading-5 text-[var(--n3-text-muted)]">La última observación tiene entre cuatro y siete días. El inventario puede haber cambiado desde el último corte.</div> : null}
      </section>

      <section>
        <SectionHeading eyebrow="03 · Archivo histórico auditado" title="Indicadores respaldados por archivos entregados" description="Estos valores provienen del inventario documental Portal, CBRS y KML auditado. No representan automáticamente el estado operativo actual." />
        <MetricGrid>
          {availableMetrics.slice(0, 4).map((metric) => (
            <MetricCard key={metric.key} label={metric.label} value={metric.value === null ? 'Sin información' : `${n(metric.value)}${metric.unit ? ` ${metric.unit}` : ''}`} detail={`${statusLabel(metric.status)} · ${metric.source} · ${metric.period}`} />
          ))}
        </MetricGrid>
      </section>

      <section>
        <SectionHeading eyebrow="04 · Calidad de datos" title="Cobertura y restricciones visibles" />
        <MetricGrid>
          <MetricCard label="Filas Portal históricas analizadas" value={n(snapshot.portalRows)} detail="Casas, departamentos y proyectos del archivo suministrado." />
          <MetricCard label="Sin coordenadas en archivo Portal" value={`${n(snapshot.missingCoordinates)} · ${pct(snapshot.missingCoordinatesRate)}`} detail="No pueden recibir asignación territorial automática." />
          <MetricCard label="Registros operativos sin barrio" value={operationalValue(operational.missingNeighborhoods)} detail={`De ${operational.canonicalProperties ?? 0} registros canónicos candidatos en Supabase.`} />
          <MetricCard label="Identidades por revisar" value={operationalValue(operational.pendingMatches)} detail="Registros candidatos o vínculos Portal–CBRS pendientes de validación humana." />
        </MetricGrid>
      </section>

      <section>
        <SectionHeading eyebrow="05 · Territorio histórico" title="Oferta y registros por barrio" description="Los siguientes agregados provienen del archivo histórico auditado y permanecen separados del inventario operativo actual." />
        <div className="grid gap-5 xl:grid-cols-2">
          <IntelligencePanel eyebrow="Archivo Portal + KML" title="Publicaciones históricas asignadas por polígono" description="Publicaciones con coordenadas dentro de un polígono reproducible del archivo suministrado.">
            <div>{topNeighborhoods.map((row, index) => <RankedRow key={`portal-${row.neighborhood}`} index={index} label={row.neighborhood} value={n(row.publishedListings)} />)}</div>
          </IntelligencePanel>
          <IntelligencePanel eyebrow="Archivo CBRS" title="Registros históricos por barrio" description="Conteo de filas registrales con barrio asignado en el archivo auditado.">
            <div>{topNeighborhoods.map((row, index) => <RankedRow key={`cbrs-${row.neighborhood}`} index={index} label={row.neighborhood} value={n(row.registeredSales)} />)}</div>
          </IntelligencePanel>
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="06 · Identidad" title="Deduplicación y vinculación Portal–CBRS" />
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <IntelligencePanel eyebrow="Claves determinísticas" title="Identidad de origen" description="Cada registro mantiene su clave original antes de la reconciliación.">
            <div className="space-y-4 p-5 text-sm">
              <div className="border-b border-[var(--n3-line)] pb-3"><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Portal</p><p className="mt-1 font-semibold">{snapshot.deduplicationPolicy.portalKey}</p></div>
              <div className="border-b border-[var(--n3-line)] pb-3"><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Evento CBRS</p><p className="mt-1 font-semibold">{snapshot.deduplicationPolicy.cbrsEventKey}</p></div>
              <div><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Activo CBRS</p><p className="mt-1 font-semibold">{snapshot.deduplicationPolicy.cbrsAssetKey}</p></div>
            </div>
          </IntelligencePanel>
          <IntelligencePanel eyebrow="Confirmación humana" title="No se confirma por score solamente" description={snapshot.deduplicationPolicy.rule} critical>
            <div className="p-5"><div className="flex flex-wrap gap-2">{snapshot.deduplicationPolicy.confirmedRequires.map((item) => <span key={item} className="border border-[var(--n3-line)] px-2.5 py-1 text-[11px]">{item}</span>)}</div></div>
          </IntelligencePanel>
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="07 · Brechas de datos" title="Métricas aún sin observaciones suficientes" />
        <div className="grid gap-px border border-[var(--n3-line)] bg-[var(--n3-line)] lg:grid-cols-3">
          {pendingMetrics.map((metric) => (
            <article key={metric.key} className="bg-[#0c1111] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ff766f]">Pendiente de carga</p><h3 className="mt-4 text-lg font-semibold">{metric.label}</h3><p className="mt-3 text-xs leading-5 text-[var(--n3-text-muted)]">{metric.methodology}</p></article>
          ))}
        </div>
      </section>

      <section>
        <IntelligencePanel eyebrow="Metodología" title="Cálculo contractual reproducible" description="El esquema incluye historial, ciclo de vida, ventas confirmadas y snapshots mensuales.">
          <div className="p-5"><MethodologyNote>La velocidad usa la mediana de días desde la primera observación hasta una venta vinculada. La absorción usa ventas confirmadas divididas por inventario activo del mismo período. El retiro de una publicación no se interpreta automáticamente como venta. La fecha de proceso nunca sustituye la fecha observada de la fuente.</MethodologyNote></div>
        </IntelligencePanel>
      </section>

      <footer className="flex flex-col justify-between gap-4 border-t border-[var(--n3-line)] pt-5 text-xs text-[var(--n3-text-muted)] sm:flex-row">
        <span>Archivo histórico: {snapshot.sourceCount} fuentes · {n(snapshot.cellCount)} celdas auditadas.</span>
        <span>Manifiesto generado {new Date(snapshot.generatedAt).toLocaleString('es-CL')}</span>
      </footer>
    </IntelligencePage>
  )
}
