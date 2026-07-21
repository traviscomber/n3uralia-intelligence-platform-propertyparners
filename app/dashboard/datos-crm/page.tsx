import { CRM_INTELLIGENCE } from '@/lib/crm-snapshot'

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
  lead_stale_15_90: 'Sin gestion 15-90 dias',
  lead_stale_over_90: 'Sin gestion sobre 90 dias',
  requirement_created: 'Requerimientos',
  visit_appointment: 'Agendamientos',
}

const ROLE_LABELS: Record<string, string> = {
  authoritative: 'Autoritativa',
  snapshot: 'Snapshot',
  reconciliation: 'Reconciliacion',
  annual_context: 'Contexto anual',
  fortnight_audit: 'Auditoria quincenal',
}

const RECONCILIATION_LABELS: Record<string, string> = {
  sales2025WithoutSellerVsWithSeller: 'Ventas 2025 sin vendedor vs. fuente autoritativa',
  sales2025SummaryVsAuthoritative: 'Resumen ventas 2025 vs. fuente autoritativa',
  q1CumulativeVsMonthlyUnion: 'Acumulado Q1 vs. union enero-marzo',
  marchMiscVsMarchSales: 'Archivo auxiliar marzo vs. ventas marzo',
}

function number(value: number | null) {
  return value === null ? 'n/d' : value.toLocaleString('es-CL')
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--n3-text-muted)]">{label}</p>
      <p className="mt-3 font-display text-3xl tracking-[0.08em] text-[var(--n3-text-light)]">{value}</p>
      <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">{note}</p>
    </article>
  )
}

export default function CrmDataPage() {
  const data = CRM_INTELLIGENCE
  const coverage = data.sourceInventory.cellCoverage
  const groupedWorkbooks = Object.groupBy(data.sourceInventory.workbooks, (workbook) => workbook.file.split('/raw/')[0])

  return (
    <div className="mx-auto max-w-[1600px] space-y-8">
      <header className="relative overflow-hidden border border-[var(--n3-line)] bg-[var(--n3-deep)] px-6 py-8 md:px-9">
        <div className="absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle_at_center,rgba(139,169,167,0.18),transparent_68%)]" />
        <div className="relative max-w-4xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--n3-teal)]">Trazabilidad privada</p>
          <h1 className="mt-3 font-display text-3xl tracking-[0.1em] text-[var(--n3-text-light)] md:text-5xl">Datos CRM Vitacura</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">
            Inventario verificable de ventas de casas y departamentos en Vitacura. Cada libro y hoja tiene una huella SHA-256 reproducible; los datos personales y valores crudos permanecen exclusivamente en los XLS privados.
          </p>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Libros auditados" value={number(coverage.workbookCount)} note="Cobertura binaria completa de Datos 2025 a Datos 202606." />
        <Metric label="Hojas auditadas" value={number(coverage.sheetCount)} note="Incluye Data, tablas auxiliares y cualquier hoja adicional." />
        <Metric label="Celdas almacenadas" value={number(coverage.storedCells)} note={`${number(coverage.populatedCells)} celdas con contenido o formula.`} />
        <Metric label="Formulas / errores" value={`${number(coverage.formulaCells)} / ${number(coverage.formulaErrorCells)}`} note="Los errores heredados se preservan y no alimentan KPI." />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--n3-teal)]">Cortes de gestion</p>
              <h2 className="mt-2 font-display text-xl text-[var(--n3-text-light)]">Snapshots de leads</h2>
            </div>
            <span className="text-xs text-[var(--n3-text-muted)]">n/d significa archivo no entregado o tasa no comparable</span>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="border-b border-[var(--n3-line)] text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">
                <tr><th className="py-3 pr-4">Corte</th><th>Activos</th><th>Clasificados</th><th>Sin clasificar</th><th>15-90 dias</th><th>&gt;90 dias</th><th>Tasa vencida</th></tr>
              </thead>
              <tbody>
                {data.leadSnapshots.map((snapshot) => (
                  <tr key={snapshot.period} className="border-b border-[var(--n3-line)] text-[var(--n3-text-light)]">
                    <td className="py-3 pr-4 font-semibold text-[var(--n3-teal-soft)]">{snapshot.period}</td>
                    <td>{number(snapshot.active)}</td><td>{number(snapshot.classified)}</td><td>{number(snapshot.unclassified)}</td>
                    <td>{number(snapshot.stale15To90)}</td><td>{number(snapshot.staleOver90)}</td>
                    <td>{snapshot.staleOver15Rate === null ? 'n/d' : `${snapshot.staleOver15Rate}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--n3-teal)]">Control cruzado</p>
          <h2 className="mt-2 font-display text-xl text-[var(--n3-text-light)]">Reconciliaciones</h2>
          <div className="mt-5 space-y-3">
            {Object.entries(data.sourceReconciliations).map(([key, reconciliation]) => (
              <div key={key} className="flex items-start justify-between gap-4 border-b border-[var(--n3-line)] pb-3">
                <div>
                  <p className="text-sm text-[var(--n3-text-light)]">{RECONCILIATION_LABELS[key] ?? key}</p>
                  <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{reconciliation.left} vs. {reconciliation.right}; {reconciliation.overlap} coincidencias</p>
                </div>
                <span className={`shrink-0 border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${reconciliation.exactMatch ? 'border-[var(--n3-teal)] text-[var(--n3-teal-soft)]' : 'border-amber-600 text-amber-400'}`}>
                  {reconciliation.exactMatch ? 'Exacta' : 'Diferencia'}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5 border-l-2 border-amber-600 bg-amber-950/20 p-3 text-xs leading-5 text-amber-200">
            Quincena abril: {number(data.aprilFortnightLeadSnapshot.staleOver15Total)} registros vencidos frente a {number(data.aprilFortnightLeadSnapshot.active)} activos. No se calcula tasa por base no comparable.
          </div>
        </div>
      </section>

      <section className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--n3-teal)]">Cobertura semantica</p>
        <h2 className="mt-2 font-display text-xl text-[var(--n3-text-light)]">13 familias de datos</h2>
        <div className="mt-5 grid gap-px bg-[var(--n3-line)] sm:grid-cols-2 xl:grid-cols-4">
          {data.sourceInventory.datasetCoverage.map((dataset) => (
            <article key={dataset.dataset} className="bg-[var(--n3-black)] p-4">
              <p className="text-sm font-semibold text-[var(--n3-text-light)]">{DATASET_LABELS[dataset.dataset] ?? dataset.dataset}</p>
              <p className="mt-2 text-2xl font-light text-[var(--n3-teal-soft)]">{dataset.workbookCount}</p>
              <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{number(dataset.dataRows)} filas fuente · {dataset.periods.join(', ')}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--n3-teal)]">Inventario completo</p>
          <h2 className="mt-2 font-display text-xl text-[var(--n3-text-light)]">84 libros y 92 hojas</h2>
        </div>
        {Object.entries(groupedWorkbooks).sort(([a], [b]) => a.localeCompare(b)).map(([folder, workbooks]) => (
          <details key={folder} open className="group border border-[var(--n3-line)] bg-[var(--n3-deep)]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
              <span className="font-display text-base tracking-[0.12em] text-[var(--n3-text-light)]">{folder}</span>
              <span className="text-xs text-[var(--n3-text-muted)]">{workbooks?.length ?? 0} archivos</span>
            </summary>
            <div className="overflow-x-auto border-t border-[var(--n3-line)]">
              <table className="w-full min-w-[1120px] text-left text-xs">
                <thead className="text-[10px] uppercase tracking-[0.13em] text-[var(--n3-text-muted)]">
                  <tr><th className="px-5 py-3">Archivo</th><th>Dataset</th><th>Rol</th><th>Hojas</th><th>Filas</th><th>Celdas</th><th>Formula / error</th><th>SHA-256</th></tr>
                </thead>
                <tbody>
                  {(workbooks ?? []).map((workbook) => (
                    <tr key={workbook.file} className="border-t border-[var(--n3-line)] text-[var(--n3-text-light)]">
                      <td className="max-w-[360px] px-5 py-3 font-medium">{workbook.file.split('/').at(-1)}</td>
                      <td>{DATASET_LABELS[workbook.dataset] ?? workbook.dataset}</td>
                      <td>{ROLE_LABELS[workbook.sourceRole] ?? workbook.sourceRole}</td>
                      <td>{workbook.sheets.map((sheet) => `${sheet.name} ${sheet.range ?? 'sin rango'}`).join(' · ')}</td>
                      <td>{number(workbook.dataRows)}</td><td>{number(workbook.storedCells)}</td>
                      <td>{workbook.formulaCells} / {workbook.formulaErrorCells}</td>
                      <td className="font-mono text-[10px] text-[var(--n3-teal-soft)]" title={workbook.fileSha256}>{workbook.fileSha256.slice(0, 12)}...</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ))}
      </section>

      <section className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--n3-teal)]">Incidencias sin ocultar</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {data.quality.issues.map((issue) => (
            <article key={issue.code} className="border-l-2 border-[var(--n3-teal)] bg-[var(--n3-black)] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">{issue.severity} · {issue.code}</p>
              <h3 className="mt-2 text-sm font-semibold normal-case tracking-normal text-[var(--n3-text-light)]">{issue.title}</h3>
              <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">{issue.detail}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
