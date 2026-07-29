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

export default function MarketPage() {
  const snapshot = buildMarketContractSnapshot()
  const availableMetrics = snapshot.metrics.filter((metric) => metric.status !== 'pending_source')
  const pendingMetrics = snapshot.metrics.filter((metric) => metric.status === 'pending_source')
  const topNeighborhoods = snapshot.neighborhoods.slice(0, 12)

  return (
    <IntelligencePage>
      <IntelligenceHeader
        eyebrow="Módulo I · Alcance contractual"
        title="Inteligencia de Mercado Vitacura"
        description="Oferta publicada, ventas registrales y territorio se presentan con trazabilidad explícita. La plataforma diferencia publicaciones, propiedades y transacciones, y no reemplaza datos faltantes con estimaciones."
        actions={[
          { label: 'Exportar resumen CSV', href: '/api/market/export', primary: true },
          { label: 'Fuentes y trazabilidad', href: '/dashboard/market/fuentes' },
          { label: 'Importar nueva fuente', href: '/dashboard/market/import' },
        ]}
        meta={
          <div className="grid min-w-[320px] grid-cols-3 gap-px border border-[var(--n3-line)] bg-[var(--n3-line)]">
            <div className="bg-[#0c1111] p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Fuentes</p>
              <p className="mt-2 text-sm font-semibold">{snapshot.sourceCount}</p>
            </div>
            <div className="bg-[#0c1111] p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Celdas</p>
              <p className="mt-2 text-sm font-semibold">{n(snapshot.cellCount)}</p>
            </div>
            <div className="bg-[#0c1111] p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Polígonos</p>
              <p className="mt-2 text-sm font-semibold">{n(snapshot.polygonCount)}</p>
            </div>
          </div>
        }
      />

      <section>
        <SectionHeading eyebrow="01 · Universo disponible" title="Indicadores respaldados por fuente" description="Cada indicador declara fuente, período, metodología y limitación." />
        <MetricGrid>
          {availableMetrics.slice(0, 4).map((metric) => (
            <MetricCard
              key={metric.key}
              label={metric.label}
              value={metric.value === null ? 'Sin información' : `${n(metric.value)}${metric.unit ? ` ${metric.unit}` : ''}`}
              detail={`${statusLabel(metric.status)} · ${metric.source}`}
            />
          ))}
        </MetricGrid>
      </section>

      <section>
        <SectionHeading eyebrow="02 · Calidad de datos" title="Cobertura y restricciones visibles" />
        <MetricGrid>
          <MetricCard label="Filas Portal analizadas" value={n(snapshot.portalRows)} detail="Incluye los archivos suministrados para casas, departamentos y proyectos." />
          <MetricCard label="Sin coordenadas Portal" value={`${n(snapshot.missingCoordinates)} · ${pct(snapshot.missingCoordinatesRate)}`} detail="No pueden recibir asignación territorial automática." />
          <MetricCard label="Sin indicador explícito de operación" value={`${n(snapshot.noOperationSignal)} · ${pct(snapshot.noOperationSignalRate)}`} detail="Se conservan como universo parcial y no se clasifican artificialmente." />
          <MetricCard label="Filas CBRS residenciales" value={n(snapshot.residentialCbrsRows)} detail="Casas-habitación y departamentos identificados en la base registral." />
        </MetricGrid>
      </section>

      <section>
        <SectionHeading eyebrow="03 · Territorio" title="Oferta y registros por barrio" description="Los conteos no equivalen todavía a propiedades canónicas ni a inventario activo." />
        <div className="grid gap-5 xl:grid-cols-2">
          <IntelligencePanel eyebrow="Oferta publicada" title="Publicaciones asignadas por KML" description="Publicaciones con coordenadas dentro de un polígono territorial reproducible.">
            <div>
              {topNeighborhoods.map((row, index) => (
                <RankedRow key={`portal-${row.neighborhood}`} index={index} label={row.neighborhood} value={n(row.publishedListings)} />
              ))}
            </div>
          </IntelligencePanel>

          <IntelligencePanel eyebrow="Ventas registrales" title="Registros CBRS por barrio" description="Conteo histórico de filas registrales con barrio asignado.">
            <div>
              {topNeighborhoods.map((row, index) => (
                <RankedRow key={`cbrs-${row.neighborhood}`} index={index} label={row.neighborhood} value={n(row.registeredSales)} />
              ))}
            </div>
          </IntelligencePanel>
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="04 · Propiedad canónica" title="Política de deduplicación y vinculación" />
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <IntelligencePanel eyebrow="Identidad determinística" title="Claves de origen" description="Cada fuente mantiene su identidad original antes de cualquier reconciliación.">
            <div className="space-y-4 p-5 text-sm">
              <div className="border-b border-[var(--n3-line)] pb-3"><p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Portal</p><p className="mt-1 font-semibold">{snapshot.deduplicationPolicy.portalKey}</p></div>
              <div className="border-b border-[var(--n3-line)] pb-3"><p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Evento CBRS</p><p className="mt-1 font-semibold">{snapshot.deduplicationPolicy.cbrsEventKey}</p></div>
              <div><p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Activo CBRS</p><p className="mt-1 font-semibold">{snapshot.deduplicationPolicy.cbrsAssetKey}</p></div>
            </div>
          </IntelligencePanel>

          <IntelligencePanel eyebrow="Confirmación" title="No se confirma por score solamente" description={snapshot.deduplicationPolicy.rule} critical>
            <div className="p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Requisitos mínimos</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {snapshot.deduplicationPolicy.confirmedRequires.map((item) => (
                  <span key={item} className="border border-[var(--n3-line)] px-2.5 py-1 text-[11px] text-[var(--n3-text-light)]">{item}</span>
                ))}
              </div>
              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Evidencia candidata</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {snapshot.deduplicationPolicy.candidateEvidence.map((item) => (
                  <span key={item} className="border border-[var(--n3-line)] px-2.5 py-1 text-[11px] text-[var(--n3-text-muted)]">{item}</span>
                ))}
              </div>
            </div>
          </IntelligencePanel>
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="05 · Brechas contractuales" title="Indicadores todavía no calculables" description="Se mantienen visibles para evitar confundir ausencia de datos con cero." />
        <div className="grid gap-px border border-[var(--n3-line)] bg-[var(--n3-line)] lg:grid-cols-3">
          {pendingMetrics.map((metric) => (
            <article key={metric.key} className="bg-[#0c1111] p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ff766f]">Pendiente de fuente</p>
                <span className="text-[10px] text-[var(--n3-text-muted)]">{metric.period}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{metric.label}</h3>
              <p className="mt-3 text-xs leading-5 text-[var(--n3-text-muted)]">{metric.methodology}</p>
              <p className="mt-4 border-t border-[var(--n3-line)] pt-3 text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Fuente requerida: {metric.source}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="06 · Metodología" title="Principio de publicación" />
        <IntelligencePanel eyebrow="Control contractual" title="Sólo información sustentada" description="La plataforma no muestra velocidad, absorción, inventario activo ni propiedades canónicas hasta que existan historial y reglas verificables.">
          <div className="p-5">
            <MethodologyNote>
              Las nuevas fuentes deben incorporarse mediante el flujo de importación, conservar su procedencia y superar validaciones de esquema antes de modificar indicadores visibles.
            </MethodologyNote>
          </div>
        </IntelligencePanel>
      </section>

      <footer className="flex flex-col justify-between gap-4 border-t border-[var(--n3-line)] pt-5 text-xs leading-5 text-[var(--n3-text-muted)] sm:flex-row">
        <span>Fuente: {snapshot.sourceCount} archivos · {n(snapshot.cellCount)} celdas auditadas.</span>
        <span>Generado {new Date(snapshot.generatedAt).toLocaleString('es-CL')}</span>
      </footer>
    </IntelligencePage>
  )
}
