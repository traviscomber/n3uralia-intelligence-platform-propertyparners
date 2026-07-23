import market from '@/data/market-source-intelligence.json'
import valuation from '@/data/valuation-intelligence.json'
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

function n(value: number) {
  return value.toLocaleString('es-CL')
}

export default function MarketPage() {
  const portalFiles = market.cross.portal
  const cbrs = market.cross.cbrs
  const reconciliation = valuation.sourceReconciliation
  const portalRows = portalFiles.reduce((sum, file) => sum + file.rows, 0)
  const noOperationSignal = portalFiles.reduce((sum, file) => sum + (file.operationIndicators.no_explicit_indicator || 0), 0)
  const missingCoordinates = portalFiles.reduce((sum, file) => sum + (file.coordinateQuality.both_missing || 0), 0)
  const cbrsEvents = cbrs.candidateKeyCardinality.event_comuna_tomo_foja_numero_fecha.unique
  const residentialCbrsRows = cbrs.categories.DESCRIPCION
    .filter(([name]) => name === 'DEPARTAMENTO' || name === 'CASA-HABITACION')
    .reduce((sum, [, count]) => sum + Number(count), 0)

  const portalAssignments = new Map<string, number>()
  for (const file of portalFiles) {
    for (const [barrio, count] of Object.entries(file.kmlPolygonAssignments)) {
      portalAssignments.set(barrio, (portalAssignments.get(barrio) || 0) + count)
    }
  }

  const topPortalBarrios = [...portalAssignments.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
  const cbrsBarrios = cbrs.categories.BARRIO.filter(([name]) => name !== '<NULL>').slice(0, 10)

  return (
    <IntelligencePage>
      <IntelligenceHeader
        eyebrow="Market Intelligence · Fuente auditada"
        title="Inteligencia de Mercado Vitacura"
        description="Oferta publicada, ventas registrales y territorio se mantienen como universos separados. La vista prioriza señales respaldadas y conserva explícitamente sus límites metodológicos."
        actions={[
          { label: 'Fuentes y trazabilidad', href: '/dashboard/market/fuentes', primary: true },
          { label: 'Abrir valorizador', href: '/dashboard/valorizador' },
        ]}
        meta={
          <div className="grid min-w-[290px] grid-cols-2 gap-px border border-[var(--n3-line)] bg-[var(--n3-line)]">
            <div className="bg-[#0c1111] p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Archivos</p>
              <p className="mt-2 text-sm font-semibold">{market.sourceInventory.fileCount}</p>
            </div>
            <div className="bg-[#0c1111] p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Celdas</p>
              <p className="mt-2 text-sm font-semibold">{n(market.sourceInventory.cellManifest.cellCount)}</p>
            </div>
          </div>
        }
      />

      <section>
        <SectionHeading eyebrow="Market Pulse" title="Universos principales" />
        <MetricGrid>
          <MetricCard
            label="Publicaciones con ID único"
            value={n(reconciliation.currentPortalValidListings)}
            detail="No equivale a inmuebles canónicos ni inventario activo."
          />
          <MetricCard
            label="Sin señal de arriendo"
            value={n(reconciliation.currentPortalSaleEligibleListings)}
            detail="Contexto de venta por archivo; operación no confirmada fila a fila."
          />
          <MetricCard
            label="Excluidas por arriendo"
            value={n(reconciliation.portalListingsQuarantinedByRentIndicator)}
            detail="La señal explícita se conserva y queda fuera del universo elegible."
          />
          <MetricCard
            label="Activos registrales CBRS"
            value={n(reconciliation.currentCbrsRows)}
            detail={`${n(cbrsEvents)} eventos registrales únicos.`}
          />
        </MetricGrid>
      </section>

      <section>
        <SectionHeading eyebrow="Data Quality" title="Cobertura y restricciones" />
        <MetricGrid>
          <MetricCard
            label="Sin indicador de operación"
            value={`${n(noOperationSignal)} · ${((noOperationSignal / portalRows) * 100).toFixed(1)}%`}
          />
          <MetricCard
            label="Sin coordenadas Portal"
            value={`${n(missingCoordinates)} · ${((missingCoordinates / portalRows) * 100).toFixed(1)}%`}
          />
          <MetricCard label="Filas CBRS residenciales" value={n(residentialCbrsRows)} />
          <MetricCard label="Corte registral" value="2014 · 09 ene 2026" />
        </MetricGrid>
      </section>

      <section>
        <SectionHeading eyebrow="Evidence" title="Distribución territorial" />
        <div className="grid gap-5 xl:grid-cols-2">
          <IntelligencePanel
            eyebrow="Oferta publicada"
            title="Asignación territorial reproducible"
            description="Conteo de publicaciones con coordenadas asignadas a un único polígono KML. No representa inventario total por barrio."
          >
            <div>
              {topPortalBarrios.map(([name, count], index) => (
                <RankedRow key={name} index={index} label={name} value={n(count)} />
              ))}
            </div>
          </IntelligencePanel>

          <IntelligencePanel
            eyebrow="Registro CBRS"
            title="Inscripciones por barrio asignado"
            description="Conteo histórico del archivo registral. No equivale a oferta vigente ni a publicaciones Portal."
          >
            <div>
              {cbrsBarrios.map(([name, count], index) => (
                <RankedRow key={name} index={index} label={name} value={n(Number(count))} />
              ))}
            </div>
          </IntelligencePanel>
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="Methodology" title="Territorio y control de publicación" />
        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <IntelligencePanel
            eyebrow="Territorio"
            title={`${market.kml.geometryAudit.polygonCount} polígonos auditados`}
            description={`El KML contiene ${market.kml.geometryAudit.areaOverlapCandidates.length} pares candidatos a superposición o contención y ${market.kml.geometryAudit.boundaryContacts.length} contactos de borde. Estas condiciones permanecen visibles y no se resuelven artificialmente.`}
          >
            <div className="flex flex-wrap gap-2 p-5">
              {Object.keys(market.kml.geometryAudit.ringCounts).map((name) => (
                <span key={name} className="border border-[var(--n3-line)] px-2.5 py-1 text-[11px] text-[var(--n3-text-muted)]">
                  {name}
                </span>
              ))}
            </div>
          </IntelligencePanel>

          <IntelligencePanel
            eyebrow="Control metodológico"
            title="Sólo métricas respaldadas"
            description="No se publican promedios, velocidad, absorción, inventario ni rankings provenientes de tablas operativas heredadas. Tampoco se sustituyen con estimaciones."
            critical
          >
            <div className="p-5">
              <MethodologyNote>
                Esta vista utiliza únicamente oferta Portal, inscripciones CBRS y polígonos presentes en el paquete auditado.
              </MethodologyNote>
            </div>
          </IntelligencePanel>
        </div>
      </section>

      <footer className="flex flex-col justify-between gap-4 border-t border-[var(--n3-line)] pt-5 text-xs leading-5 text-[var(--n3-text-muted)] sm:flex-row">
        <span>
          Fuente: {market.sourceInventory.fileCount} archivos de mercado · manifiesto de {n(market.sourceInventory.cellManifest.cellCount)} celdas.
        </span>
        <span>Generado {new Date(market.generatedAt).toLocaleString('es-CL')}</span>
      </footer>
    </IntelligencePage>
  )
}
