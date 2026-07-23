import { AlertTriangle, ArrowRight, Database, ShieldCheck, Target, Users } from 'lucide-react'
import { CRM_INTELLIGENCE } from '@/lib/crm-snapshot'
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

const DATASET_LABELS: Record<string, string> = {
  sale_closed: 'Ventas cerradas',
  sales_summary: 'Resumen de ventas',
  property_capture: 'Captaciones',
  property_suspension: 'Propiedades suspendidas',
  property_stock: 'Cartera',
  lead_created: 'Leads creados',
  lead_active: 'Leads activos',
  lead_classified: 'Leads clasificados',
  lead_unclassified: 'Leads sin clasificar',
  lead_stale_15_90: 'Sin gestión 15–90 días',
  lead_stale_over_90: 'Sin gestión sobre 90 días',
  requirement_created: 'Requerimientos',
  visit_appointment: 'Agendamientos',
}

const ROLE_LABELS: Record<string, string> = {
  authoritative: 'Autoritativa',
  snapshot: 'Snapshot',
  reconciliation: 'Reconciliación',
  annual_context: 'Contexto anual',
  fortnight_audit: 'Auditoría quincenal',
}

const RECONCILIATION_LABELS: Record<string, string> = {
  sales2025WithoutSellerVsWithSeller: 'Ventas 2025 sin vendedor vs. fuente autoritativa',
  sales2025SummaryVsAuthoritative: 'Resumen ventas 2025 vs. fuente autoritativa',
  q1CumulativeVsMonthlyUnion: 'Acumulado Q1 vs. unión enero–marzo',
  marchMiscVsMarchSales: 'Archivo auxiliar marzo vs. ventas marzo',
}

function number(value: number | null) {
  return value === null ? 'n/d' : value.toLocaleString('es-CL')
}

function percentage(value: number | null) {
  return value === null ? 'n/d' : `${value.toLocaleString('es-CL')}%`
}

function priorityLabel(priority: 'high' | 'medium' | 'low') {
  if (priority === 'high') return 'Prioridad alta'
  if (priority === 'medium') return 'Prioridad media'
  return 'Seguimiento'
}

export default function CrmDataPage() {
  const data = CRM_INTELLIGENCE
  const coverage = data.sourceInventory.cellCoverage
  const latestMonth = data.months.at(-1)
  const latestLead = data.latestLeadSnapshot
  const groupedWorkbooks = Object.groupBy(data.sourceInventory.workbooks, (workbook) => workbook.file.split('/raw/')[0])
  const ceoActions = data.actions.ceo
  const maxOfficeSales = Math.max(...data.ytd.salesByOffice.map((item) => item.count), 1)
  const maxAgentSales = Math.max(...data.ytd.salesByListingAgent.map((item) => item.count), 1)

  return (
    <IntelligencePage>
      <IntelligenceHeader
        eyebrow="CRM Intelligence · Vitacura"
        title="Centro de Decisiones Comerciales"
        description="Una lectura ejecutiva de ventas, leads, captaciones, visitas y cartera. El sistema prioriza acciones respaldadas por datos auditados y mantiene la trazabilidad completa hacia los libros privados de origen."
        actions={[
          { label: 'Ver Control de Gestión', href: '/dashboard/control', primary: true },
          { label: 'Abrir Reportes Ejecutivos', href: '/dashboard/reportes/autonomos' },
        ]}
        meta={<div className="border border-[var(--n3-line)] bg-[#0c1111] px-4 py-3 text-xs text-[var(--n3-text-muted)]">Motor de inteligencia N3uralia · sin PII en la capa analítica</div>}
      />

      <section>
        <SectionHeading eyebrow="Commercial Pulse" title="Estado actual del negocio" description={`Último período operacional disponible: ${latestMonth?.label ?? 'sin período disponible'}.`} />
        <MetricGrid>
          <MetricCard label="Ventas YTD" value={number(data.ytd.salesCount)} detail={`${number(data.ytd.salesUf)} UF acumuladas en la fuente autoritativa.`} />
          <MetricCard label="Leads activos" value={number(latestLead.active)} detail={`${number(latestLead.staleOver15Total)} registros con antigüedad superior a 15 días.`} />
          <MetricCard label="Cobertura vendedores" value={percentage(data.ytd.sellerAttribution.coverage)} detail={`${number(data.ytd.sellerAttribution.missing)} ventas sin atribución identificada.`} />
          <MetricCard label="Cobertura de fuentes" value={percentage(data.quality.sourceCoverage)} detail={`${coverage.workbookCount} libros y ${coverage.sheetCount} hojas auditadas.`} />
        </MetricGrid>
      </section>

      <section>
        <SectionHeading eyebrow="01 · Recommended Actions" title="Qué requiere atención ahora" description="Las recomendaciones siguientes provienen del contrato de acciones del dataset; no son proyecciones generadas libremente." />
        <div className="grid gap-4 lg:grid-cols-3">
          {ceoActions.map((item) => (
            <article key={item.title} className={`border bg-[#0c1111] p-5 ${item.priority === 'high' ? 'border-[#d7332b]' : 'border-[var(--n3-line)]'}`}>
              <div className="flex items-center justify-between gap-3">
                <Target size={18} className={item.priority === 'high' ? 'text-[#ff766f]' : 'text-[var(--n3-teal-soft)]'} />
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">{priorityLabel(item.priority)}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[var(--n3-text-light)]">{item.title}</h3>
              <p className="mt-3 text-xs leading-5 text-[var(--n3-text-muted)]">{item.evidence}</p>
              <div className="mt-4 flex gap-2 border-t border-[var(--n3-line)] pt-4 text-xs font-semibold text-[var(--n3-text-light)]"><ArrowRight size={15} className="mt-0.5 shrink-0 text-[#ff766f]" />{item.action}</div>
            </article>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="02 · Pipeline Health" title="Salud de leads y actividad" />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
          <IntelligencePanel eyebrow="Lead Aging" title="Evolución de la cartera activa" description="Los cortes históricos mantienen bases y disponibilidad distintas; n/d indica ausencia de archivo o tasa no comparable.">
            <div className="overflow-x-auto p-5">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="border-b border-[var(--n3-line)] text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">
                  <tr><th className="py-3 pr-4">Corte</th><th>Activos</th><th>Clasificados</th><th>Sin clasificar</th><th>15–90 días</th><th>&gt;90 días</th><th>Tasa vencida</th></tr>
                </thead>
                <tbody>
                  {data.leadSnapshots.map((snapshot) => (
                    <tr key={snapshot.period} className="border-b border-[var(--n3-line)] text-[var(--n3-text-light)]">
                      <td className="py-3 pr-4 font-semibold text-[#ff766f]">{snapshot.period}</td>
                      <td>{number(snapshot.active)}</td><td>{number(snapshot.classified)}</td><td>{number(snapshot.unclassified)}</td>
                      <td>{number(snapshot.stale15To90)}</td><td>{number(snapshot.staleOver90)}</td><td>{percentage(snapshot.staleOver15Rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </IntelligencePanel>

          <IntelligencePanel eyebrow="Latest Operating Month" title={latestMonth?.label ?? 'Último mes'} description="Indicadores operacionales disponibles para el último período cargado." critical>
            <div className="grid grid-cols-2 gap-px bg-[var(--n3-line)] p-5">
              {[
                ['Ventas', number(latestMonth?.salesCount ?? null)],
                ['Ventas UF', number(latestMonth?.salesUf ?? null)],
                ['Leads nuevos', number(latestMonth?.newLeadsCount ?? null)],
                ['Captaciones', number(latestMonth?.capturesCount ?? null)],
                ['Visitas', number(latestMonth?.visitsCount ?? null)],
                ['Stock', number(latestMonth?.stockCount ?? null)],
              ].map(([label, value]) => <div key={label} className="bg-[#080d0d] p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{label}</p><p className="mt-2 text-2xl font-semibold text-[var(--n3-text-light)]">{value}</p></div>)}
            </div>
          </IntelligencePanel>
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="03 · Performance" title="Dónde se concentra el resultado" />
        <div className="grid gap-5 xl:grid-cols-2">
          <IntelligencePanel eyebrow="Office Ranking" title="Ventas por sucursal" description="Conteo acumulado del período disponible.">
            <div className="space-y-2 p-5">
              {data.ytd.salesByOffice.map((item, index) => <RankedRow key={item.label} rank={index + 1} label={item.label} value={number(item.count)} share={(item.count / maxOfficeSales) * 100} />)}
              {data.ytd.salesByOffice.length === 0 ? <p className="text-sm text-[var(--n3-text-muted)]">No hay distribución por sucursal disponible.</p> : null}
            </div>
          </IntelligencePanel>

          <IntelligencePanel eyebrow="Partner Ranking" title="Ventas por ejecutivo" description="La atribución depende de la identificación disponible en la fuente.">
            <div className="space-y-2 p-5">
              {data.ytd.salesByListingAgent.slice(0, 10).map((item, index) => <RankedRow key={item.label} rank={index + 1} label={item.label} value={number(item.count)} share={(item.count / maxAgentSales) * 100} />)}
              {data.ytd.salesByListingAgent.length === 0 ? <p className="text-sm text-[var(--n3-text-muted)]">No hay ranking individual disponible.</p> : null}
            </div>
          </IntelligencePanel>
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="04 · Data Confidence" title="Confianza, conciliación y límites" />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <IntelligencePanel eyebrow="Cross-checks" title="Reconciliaciones de fuentes" description="Diferencias visibles entre archivos que representan universos o cortes potencialmente distintos.">
            <div className="space-y-3 p-5">
              {Object.entries(data.sourceReconciliations).map(([key, reconciliation]) => (
                <div key={key} className="flex items-start justify-between gap-4 border-b border-[var(--n3-line)] pb-3">
                  <div><p className="text-sm text-[var(--n3-text-light)]">{RECONCILIATION_LABELS[key] ?? key}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{reconciliation.left} vs. {reconciliation.right}; {reconciliation.overlap} coincidencias</p></div>
                  <span className={`shrink-0 border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${reconciliation.exactMatch ? 'border-[var(--n3-teal)] text-[var(--n3-teal-soft)]' : 'border-amber-600 text-amber-400'}`}>{reconciliation.exactMatch ? 'Exacta' : 'Diferencia'}</span>
                </div>
              ))}
            </div>
          </IntelligencePanel>

          <IntelligencePanel eyebrow="Quality Issues" title="Incidencias sin ocultar" description="Problemas de fuente que deben permanecer visibles para interpretación y gobierno.">
            <div className="grid gap-3 p-5 md:grid-cols-2">
              {data.quality.issues.map((issue) => (
                <article key={issue.code} className="border border-[var(--n3-line)] bg-[#080d0d] p-4">
                  <div className="flex gap-3"><AlertTriangle size={16} className={issue.severity === 'critical' ? 'mt-0.5 shrink-0 text-[var(--destructive)]' : 'mt-0.5 shrink-0 text-amber-400'} /><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">{issue.severity} · {issue.code}</p><h3 className="mt-2 text-sm font-semibold text-[var(--n3-text-light)]">{issue.title}</h3><p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">{issue.detail}</p></div></div>
                </article>
              ))}
            </div>
          </IntelligencePanel>
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="05 · Source Coverage" title="Cobertura semántica" description="Las familias de datos mantienen su rol documental y período de origen." />
        <div className="grid gap-px border border-[var(--n3-line)] bg-[var(--n3-line)] sm:grid-cols-2 xl:grid-cols-4">
          {data.sourceInventory.datasetCoverage.map((dataset) => (
            <article key={dataset.dataset} className="bg-[#0c1111] p-4">
              <p className="text-sm font-semibold text-[var(--n3-text-light)]">{DATASET_LABELS[dataset.dataset] ?? dataset.dataset}</p>
              <p className="mt-2 text-2xl font-semibold text-[#ff766f]">{dataset.workbookCount}</p>
              <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{number(dataset.dataRows)} filas · {dataset.periods.join(', ')}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="06 · Advanced Administration" title="Inventario técnico de fuentes" description="Detalle para auditoría y administración. No es la vista principal de decisión comercial." />
        <div className="space-y-3">
          {Object.entries(groupedWorkbooks).sort(([a], [b]) => a.localeCompare(b)).map(([folder, workbooks]) => (
            <details key={folder} className="group border border-[var(--n3-line)] bg-[#0c1111]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
                <span className="flex items-center gap-3 text-sm font-semibold text-[var(--n3-text-light)]"><Database size={16} className="text-[#ff766f]" />{folder}</span>
                <span className="text-xs text-[var(--n3-text-muted)]">{workbooks?.length ?? 0} archivos</span>
              </summary>
              <div className="overflow-x-auto border-t border-[var(--n3-line)]">
                <table className="w-full min-w-[1120px] text-left text-xs">
                  <thead className="text-[10px] uppercase tracking-[0.13em] text-[var(--n3-text-muted)]"><tr><th className="px-5 py-3">Archivo</th><th>Dataset</th><th>Rol</th><th>Hojas</th><th>Filas</th><th>Celdas</th><th>Fórmula / error</th><th>SHA-256</th></tr></thead>
                  <tbody>
                    {(workbooks ?? []).map((workbook) => (
                      <tr key={workbook.file} className="border-t border-[var(--n3-line)] text-[var(--n3-text-light)]">
                        <td className="max-w-[360px] px-5 py-3 font-medium">{workbook.file.split('/').at(-1)}</td>
                        <td>{DATASET_LABELS[workbook.dataset] ?? workbook.dataset}</td><td>{ROLE_LABELS[workbook.sourceRole] ?? workbook.sourceRole}</td>
                        <td>{workbook.sheets.map((sheet) => `${sheet.name} ${sheet.range ?? 'sin rango'}`).join(' · ')}</td>
                        <td>{number(workbook.dataRows)}</td><td>{number(workbook.storedCells)}</td><td>{workbook.formulaCells} / {workbook.formulaErrorCells}</td>
                        <td className="font-mono text-[10px] text-[var(--n3-teal-soft)]" title={workbook.fileSha256}>{workbook.fileSha256.slice(0, 12)}...</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="Methodology" title="Regla de interpretación" />
        <MethodologyNote>
          Los indicadores representan únicamente ventas de casas y departamentos en Vitacura dentro de los archivos entregados. Las diferencias de corte, universos y disponibilidad se conservan explícitamente. Los datos personales y valores crudos permanecen fuera de esta interfaz analítica.
        </MethodologyNote>
      </section>

      <footer className="flex items-center gap-2 border-t border-[var(--n3-line)] pt-5 text-xs text-[var(--n3-text-muted)]"><ShieldCheck size={15} /> Property Partners · CRM Intelligence · Powered by N3uralia Intelligence</footer>
    </IntelligencePage>
  )
}
