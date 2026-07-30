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
import { getOperationalMarketSnapshot } from '@/lib/market-operational'

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

export default async function MarketPage() {
  const snapshot = buildMarketContractSnapshot()
  const operational = await getOperationalMarketSnapshot()
  const availableMetrics = snapshot.metrics.filter((metric) => metric.status !== 'pending_source')
  const pendingMetrics = snapshot.metrics.filter((metric) => metric.status === 'pending_source')
  const topNeighborhoods = snapshot.neighborhoods.slice(0, 12)

  return (
    <IntelligencePage>
      <IntelligenceHeader
        eyebrow="Módulo I · Alcance contractual"
        title="Inteligencia de Mercado Vitacura"
        description="Oferta publicada, ventas registrales, propiedades canónicas e indicadores se presentan con trazabilidad explícita. La plataforma no reemplaza datos faltantes con estimaciones."
        actions={[
          { label: 'Exportar resumen CSV', href: '/api/market/export', primary: true },
          { label: 'Fuentes y trazabilidad', href: '/dashboard/market/fuentes' },
          { label: 'Importar nueva fuente', href: '/dashboard/market/import' },
        ]}
        meta={
          <div className="grid min-w-[320px] grid-cols-3 gap-px border border-[var(--n3-line)] bg-[var(--n3-line)]">
            <div className="bg-[#0c1111] p-4"><p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Fuentes</p><p className="mt-2 text-sm font-semibold">{snapshot.sourceCount}</p></div>
            <div className="bg-[#0c1111] p-4"><p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Celdas</p><p className="mt-2 text-sm font-semibold">{n(snapshot.cellCount)}</p></div>
            <div className="bg-[#0c1111] p-4"><p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Base operativa</p><p className="mt-2 text-sm font-semibold">{operational.connected ? 'Conectada' : 'Pendiente'}</p></div>
          </div>
        }
      />

      <section>
        <SectionHeading eyebrow="01 · Operación" title="Propiedad canónica e indicadores calculados" description="Estas métricas se activan desde PostgreSQL cuando existen importaciones fila a fila y vínculos confirmados." />
        <MetricGrid>
          <MetricCard label="Propiedades canónicas" value={operationalValue(operational.canonicalProperties)} detail={`${operational.confirmedProperties ?? 0} identidades confirmadas`} />
          <MetricCard label="Inventario activo" value={operationalValue(operational.activeInventory)} detail={operational.latestPeriod ? `Período ${operational.latestPeriod}` : 'Sin snapshot mensual generado'} />
          <MetricCard label="Velocidad de venta" value={operationalValue(operational.medianDaysOnMarket, ' días')} detail="Mediana entre primera publicación y venta confirmada" />
          <MetricCard label="Absorción" value={operational.absorptionRate === null ? 'Sin datos operativos' : pct(operational.absorptionRate)} detail="Ventas confirmadas / inventario activo del período" />
        </MetricGrid>
        {!operational.connected ? (
          <div className="mt-4 border border-[#d7332b] bg-[#0c1111] p-4 text-xs leading-5 text-[var(--n3-text-muted)]">
            El esquema operativo está preparado, pero las migraciones y cargas fila a fila todavía deben ejecutarse en Supabase. Hasta entonces se conservan los agregados auditados existentes.
          </div>
        ) : null}
      </section>

      <section>
        <SectionHeading eyebrow="02 · Universo disponible" title="Indicadores respaldados por fuente" description="Cada indicador declara fuente, período, metodología y limitación." />
        <MetricGrid>
          {availableMetrics.slice(0, 4).map((metric) => (
            <MetricCard key={metric.key} label={metric.label} value={metric.value === null ? 'Sin información' : `${n(metric.value)}${metric.unit ? ` ${metric.unit}` : ''}`} detail={`${statusLabel(metric.status)} · ${metric.source}`} />
          ))}
        </MetricGrid>
      </section>

      <section>
        <SectionHeading eyebrow="03 · Calidad de datos" title="Cobertura y restricciones visibles" />
        <MetricGrid>
          <MetricCard label="Filas Portal analizadas" value={n(snapshot.portalRows)} detail="Casas, departamentos y proyectos suministrados." />
          <MetricCard label="Sin coordenadas Portal" value={`${n(snapshot.missingCoordinates)} · ${pct(snapshot.missingCoordinatesRate)}`} detail="No pueden recibir asignación territorial automática." />
          <MetricCard label="Sin indicador explícito" value={`${n(snapshot.noOperationSignal)} · ${pct(snapshot.noOperationSignalRate)}`} detail="No se clasifican artificialmente." />
          <MetricCard label="Candidatos por revisar" value={operationalValue(operational.pendingMatches)} detail="Vínculos Portal–CBRS o duplicados pendientes de validación humana." />
        </MetricGrid>
      </section>

      <section>
        <SectionHeading eyebrow="04 · Territorio" title="Oferta y registros por barrio" description="Los agregados históricos permanecen separados del inventario operativo." />
        <div className="grid gap-5 xl:grid-cols-2">
          <IntelligencePanel eyebrow="Oferta publicada" title="Publicaciones asignadas por KML" description="Publicaciones con coordenadas dentro de un polígono reproducible.">
            <div>{topNeighborhoods.map((row, index) => <RankedRow key={`portal-${row.neighborhood}`} index={index} label={row.neighborhood} value={n(row.publishedListings)} />)}</div>
          </IntelligencePanel>
          <IntelligencePanel eyebrow="Ventas registrales" title="Registros CBRS por barrio" description="Conteo histórico de filas registrales con barrio asignado.">
            <div>{topNeighborhoods.map((row, index) => <RankedRow key={`cbrs-${row.neighborhood}`} index={index} label={row.neighborhood} value={n(row.registeredSales)} />)}</div>
          </IntelligencePanel>
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="05 · Identidad" title="Deduplicación y vinculación Portal–CBRS" />
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
        <SectionHeading eyebrow="06 · Brechas de datos" title="Métricas aún sin observaciones suficientes" />
        <div className="grid gap-px border border-[var(--n3-line)] bg-[var(--n3-line)] lg:grid-cols-3">
          {pendingMetrics.map((metric) => (
            <article key={metric.key} className="bg-[#0c1111] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ff766f]">Pendiente de carga</p><h3 className="mt-4 text-lg font-semibold">{metric.label}</h3><p className="mt-3 text-xs leading-5 text-[var(--n3-text-muted)]">{metric.methodology}</p></article>
          ))}
        </div>
      </section>

      <section>
        <IntelligencePanel eyebrow="Metodología" title="Cálculo contractual reproducible" description="El esquema incluye historial, ciclo de vida, ventas confirmadas y snapshots mensuales.">
          <div className="p-5"><MethodologyNote>La velocidad usa la mediana de días desde la primera observación hasta una venta vinculada. La absorción usa ventas confirmadas divididas por inventario activo del mismo período. El retiro de una publicación no se interpreta automáticamente como venta.</MethodologyNote></div>
        </IntelligencePanel>
      </section>

      <footer className="flex flex-col justify-between gap-4 border-t border-[var(--n3-line)] pt-5 text-xs text-[var(--n3-text-muted)] sm:flex-row">
        <span>Fuente: {snapshot.sourceCount} archivos · {n(snapshot.cellCount)} celdas auditadas.</span>
        <span>Generado {new Date(snapshot.generatedAt).toLocaleString('es-CL')}</span>
      </footer>
    </IntelligencePage>
  )
}
