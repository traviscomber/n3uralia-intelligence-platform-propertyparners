import Link from 'next/link'
import { buildBoardReport } from '@/lib/board-report'
import { PrintBoardReportButton } from '@/components/reports/PrintBoardReportButton'

const MONTHS: Record<string, string> = {
  '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril', '05': 'Mayo', '06': 'Junio',
  '07': 'Julio', '08': 'Agosto', '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre',
}

function number(value: number | null, maximumFractionDigits = 0) {
  return value === null ? 'n/d' : value.toLocaleString('es-CL', { maximumFractionDigits })
}

function uf(value: number | null) {
  return value === null ? 'n/d' : `${number(value)} UF`
}

function pct(value: number | null) {
  return value === null ? 'n/d' : `${number(value, 1)}%`
}

function periodLabel(period: string) {
  const [year, month] = period.split('-')
  return `${MONTHS[month]} ${year}`
}

function Evidence({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 border-l-2 border-[#d7332b] pl-3 text-[11px] leading-5 text-[#6a6a6a]">{children}</p>
}

export default async function BoardReportPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const params = await searchParams
  const report = buildBoardReport(params.period)
  const presentation = report.company.presentation

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 pb-16 text-[#222] print:max-w-none print:bg-white print:pb-0">
      <header className="overflow-hidden bg-black text-white print:break-after-page">
        <div className="grid min-h-[430px] gap-8 p-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:p-12">
          <div className="flex flex-col justify-between">
            <img src="/brand/property-partners-vitacura.png" alt="Property Partners Vitacura" className="h-auto w-full max-w-[390px]" />
            <div className="mt-16"><p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#e23b31]">Reporte automático de Directorio</p><h1 className="mt-4 text-4xl font-semibold tracking-tight lg:text-5xl">{periodLabel(report.period)}</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-[#b6b6b6]">Estructura basada en las presentaciones auditadas. Datos CRM, metas y diferencias conservados con su definición y fuente.</p></div>
          </div>
          <div className="flex flex-col justify-between border-l border-white/15 pl-6">
            <div className="space-y-5">{[
              ['Modo', 'Determinístico'], ['Alcance', 'Vitacura · Venta'], ['CRM', `${report.sources.crm.workbooks} Excel`], ['Presentaciones', `${report.sources.presentations.decks} decks · ${report.sources.presentations.slides} láminas`],
            ].map(([label, value]) => <div key={label} className="border-b border-white/10 pb-3"><p className="text-[10px] uppercase tracking-[0.16em] text-[#777]">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>)}</div>
            <PrintBoardReportButton />
          </div>
        </div>
        <div className="h-1 bg-[#d7332b]" />
      </header>

      <nav className="print:hidden flex flex-wrap gap-2" aria-label="Período del reporte">
        {report.availablePeriods.map((period) => <Link key={period} href={`/dashboard/reportes/directorio?period=${period}`} className="border px-3 py-1.5 text-xs font-semibold" style={{ background: period === report.period ? '#000' : '#fff', color: period === report.period ? '#fff' : '#444', borderColor: period === report.period ? '#000' : '#ccc' }}>{periodLabel(period)}</Link>)}
        <a href={`/api/reports/board?period=${report.period}`} className="ml-auto border border-[#ccc] bg-white px-3 py-1.5 text-xs font-semibold">JSON trazable</a>
      </nav>

      <section className="grid gap-px bg-[#cfcfcf] lg:grid-cols-4 print:grid-cols-4">
        {[
          ['Cierres CRM', number(report.company.crm.sales), `Meta ${number(report.company.target.sales)} · ${pct(report.company.compliance.sales)}`],
          ['UF CRM', uf(report.company.crm.salesUf), `Meta ${uf(report.company.target.salesUf)} · ${pct(report.company.compliance.salesUf)}`],
          ['Acumulado CRM', number(report.company.cumulativeCrm.salesCount), `${uf(report.company.cumulativeCrm.salesUf)}`],
          ['Cobertura fuente', pct(report.quality.crmCoverage), report.quality.crmMissingDatasets.length ? `Falta: ${report.quality.crmMissingDatasets.join(', ')}` : 'Datasets esperados presentes'],
        ].map(([label, value, detail]) => <article key={label} className="bg-[#f2f2f2] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#666]">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p><p className="mt-2 text-xs text-[#666]">{detail}</p></article>)}
      </section>

      {report.presentationAligned && presentation && report.reconciliation.headline ? (
        <section className="grid gap-4 lg:grid-cols-[1fr_1.4fr] print:break-before-page">
          <article className="border border-[#d5d5d5] bg-[#f2f2f2] p-6"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#d7332b]">Conciliación principal</p><h2 className="mt-2 text-2xl font-semibold">PPT Directorio vs CRM</h2><div className="mt-5 grid grid-cols-2 gap-px bg-[#ccc]"><div className="bg-white p-4"><p className="text-xs text-[#777]">Presentación</p><p className="mt-1 text-3xl font-semibold">{number(presentation.sales)}</p><p className="text-xs text-[#666]">{uf(presentation.salesUf)}</p></div><div className="bg-white p-4"><p className="text-xs text-[#777]">CRM normalizado</p><p className="mt-1 text-3xl font-semibold">{number(report.company.crm.sales)}</p><p className="text-xs text-[#666]">{uf(report.company.crm.salesUf)}</p></div></div><Evidence>Fuente PPT: {presentation.sources.sales.deck}, lámina {presentation.sources.sales.slide}. Diferencia conservada: {number(report.reconciliation.headline.salesDelta)} cierre y {number(report.reconciliation.headline.ufDelta)} UF.</Evidence></article>
          <article className="border border-[#d5d5d5] bg-white p-6"><div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#666]">Score fuente</p><h2 className="mt-2 text-2xl font-semibold">Calidad de gestión</h2></div><p className="text-5xl font-semibold text-[#d7332b]">{number(presentation.score.management, 1)}</p></div><div className="mt-6 grid gap-px bg-[#d5d5d5] grid-cols-3">{[['Cartera', presentation.score.portfolio, '40%'], ['Seguimiento', presentation.score.followUp, '30%'], ['Conversión', presentation.score.conversion, '30%']].map(([label, value, weight]) => <div key={label as string} className="bg-[#f5f5f5] p-4"><p className="text-xs text-[#666]">{label as string} · {weight as string}</p><p className="mt-2 text-2xl font-semibold">{number(value as number, 1)}</p></div>)}</div><p className="mt-4 text-xs font-semibold">Clasificación fuente: {presentation.score.classification}</p><Evidence>{presentation.sources.score.deck} · lámina {presentation.sources.score.slide}. La fórmula y clasificación se reproducen desde el PPT; no se recalculan con reglas nuevas.</Evidence></article>
        </section>
      ) : <section className="border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">El período seleccionado no coincide con el snapshot de presentación {report.presentationPeriod}. Se muestran CRM y Metas; los scores del PPT no se trasladan a otro mes.</section>}

      <section className="border border-[#d5d5d5] bg-white print:break-before-page">
        <div className="border-b border-[#d5d5d5] bg-black p-5 text-white"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#e23b31]">Sucursales</p><h2 className="mt-2 text-2xl font-semibold">Resultados, metas y snapshot gerencial</h2></div>
        <div className="grid gap-px bg-[#d5d5d5] xl:grid-cols-3 print:grid-cols-3">
          {report.branches.map((branch) => <article key={branch.branch} className="bg-[#f5f5f5] p-5"><h3 className="text-xl font-semibold">{branch.branch}</h3><div className="mt-4 grid grid-cols-2 gap-px bg-[#d5d5d5]"><div className="bg-white p-3"><p className="text-[10px] uppercase text-[#777]">Cierres CRM</p><p className="mt-1 text-2xl font-semibold">{number(branch.crm.sales)}</p><p className="text-[11px] text-[#666]">Meta {number(branch.target.sales)} · {pct(branch.compliance.sales)}</p></div><div className="bg-white p-3"><p className="text-[10px] uppercase text-[#777]">UF CRM</p><p className="mt-1 text-2xl font-semibold">{number(branch.crm.salesUf)}</p><p className="text-[11px] text-[#666]">Meta {number(branch.target.salesUf)} · {pct(branch.compliance.salesUf)}</p></div></div>{branch.presentation ? <div className="mt-4"><div className="flex items-end justify-between border-b border-[#ddd] pb-3"><p className="text-xs text-[#666]">Score gestión PPT</p><p className="text-3xl font-semibold text-[#d7332b]">{number(branch.presentation.score.management, 1)}</p></div><div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]"><div><p className="text-[#777]">Cartera</p><strong>{number(branch.presentation.score.portfolio, 1)}</strong></div><div><p className="text-[#777]">Seguim.</p><strong>{number(branch.presentation.score.followUp, 1)}</strong></div><div><p className="text-[#777]">Conversión</p><strong>{number(branch.presentation.score.conversion, 1)}</strong></div></div><Evidence>PPT: {number(branch.presentation.sales)} cierres y {uf(branch.presentation.salesUf)} · lámina {branch.presentation.sources.sales.slide}.</Evidence></div> : <Evidence>Sin score de presentación aplicable a {periodLabel(report.period)}.</Evidence>}<p className="mt-3 text-[10px] text-[#888]">Meta fuente: {branch.sourceFile}</p></article>)}
        </div>
      </section>

      {presentation ? <section className="grid gap-px bg-[#d5d5d5] lg:grid-cols-3 print:grid-cols-3"><article className="bg-[#f2f2f2] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#666]">Cartera</p><p className="mt-2 text-3xl font-semibold">{number(presentation.indicators.stock)} / {number(presentation.indicators.stockTarget)}</p><p className="mt-1 text-xs text-[#666]">Actual / meta en presentación</p></article><article className="bg-[#f2f2f2] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#666]">Seguimiento</p><p className="mt-2 text-3xl font-semibold">{number(presentation.indicators.classifiedLeads)} / {number(presentation.indicators.activeLeads)}</p><p className="mt-1 text-xs text-[#666]">Leads clasificados / activos</p></article><article className="bg-[#f2f2f2] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#666]">Visitas</p><p className="mt-2 text-3xl font-semibold">{number(presentation.indicators.realizedVisits)} / {number(presentation.indicators.scheduledVisits)}</p><p className="mt-1 text-xs text-[#666]">Realizadas / agendadas</p></article></section> : null}

      <section className="grid gap-4 lg:grid-cols-2 print:break-before-page">
        <article className="border border-[#d5d5d5] bg-[#f2f2f2] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#d7332b]">Calidad y diferencias</p><h2 className="mt-2 text-xl font-semibold">Nada se corrige silenciosamente</h2><div className="mt-5 space-y-3 text-sm"><p><strong>{report.quality.targetCriticalIssues}</strong> incidencias críticas y <strong>{report.quality.targetIssues}</strong> observaciones en Metas 2026.</p><p><strong>{report.quality.presentationDifferences}</strong> diferencias y <strong>{report.quality.presentationNotComparable}</strong> comparaciones no comparables en PPT.</p><p><strong>{pct(report.quality.crmCoverage)}</strong> de cobertura CRM para el período seleccionado.</p></div><Evidence>{report.reconciliation.rule}</Evidence></article>
        <article className="border border-[#d5d5d5] bg-white p-5"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#666]">Contrato editorial</p><h2 className="mt-2 text-xl font-semibold">Automático, no generativo</h2><ul className="mt-5 space-y-2 text-sm leading-6 text-[#555]"><li>• Estructura: presentación de Directorio.</li><li>• Hechos operacionales: CRM auditado.</li><li>• Objetivos: Excel Metas 2026.</li><li>• Scores: snapshot PPT del período correspondiente.</li><li>• Diferencias: matriz de conciliación.</li><li>• Ausencias: siempre `n/d`, nunca cero estimado.</li></ul></article>
      </section>

      <footer className="border-t-4 border-[#d7332b] bg-black p-6 text-white"><div className="grid gap-5 lg:grid-cols-3"><div><p className="text-[10px] uppercase tracking-[0.16em] text-[#777]">CRM</p><p className="mt-1 text-sm">{report.sources.crm.workbooks} libros auditados</p></div><div><p className="text-[10px] uppercase tracking-[0.16em] text-[#777]">Metas</p><p className="mt-1 text-sm">Versión {report.sources.targets.version} · {report.sources.targets.workbooks} libros</p></div><div><p className="text-[10px] uppercase tracking-[0.16em] text-[#777]">Presentaciones</p><p className="mt-1 text-sm">SHA-256 <span className="font-mono text-[10px]">{report.sources.presentations.sha256}</span></p></div></div><p className="mt-6 text-[11px] text-[#888]">Generado automáticamente desde fuentes auditadas · Powered by N3uralia</p></footer>
    </div>
  )
}
