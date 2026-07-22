import Link from 'next/link'
import crm from '@/data/crm-intelligence.json'
import targets from '@/data/targets-2026.json'
import presentations from '@/data/presentations-2026-summary.json'
import market from '@/data/market-source-intelligence.json'
import valuation from '@/data/valuation-intelligence.json'

function number(value: number, maximumFractionDigits = 0) {
  return value.toLocaleString('es-CL', { maximumFractionDigits })
}

function percent(value: number, maximumFractionDigits = 1) {
  return `${number(value, maximumFractionDigits)}%`
}

function uf(value: number) {
  return `${number(value)} UF`
}

function Evidence({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 border-l-2 border-[#d7332b] pl-3 text-xs leading-5 text-[#5f6864]">{children}</p>
}

function Status({ children, tone = 'fact' }: { children: React.ReactNode; tone?: 'fact' | 'relation' | 'limit' }) {
  const styles = tone === 'fact'
    ? 'border-[#bdd8cf] bg-[#edf7f3] text-[#175343]'
    : tone === 'relation'
      ? 'border-[#d8d2bd] bg-[#faf7ed] text-[#705d19]'
      : 'border-[#e5beba] bg-[#fff1f0] text-[#8f2822]'
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${styles}`}>{children}</span>
}

export default function CorporateManagementPage() {
  const months = crm.months
  const january = months[0]
  const may = months[4]
  const june = months[5]
  const stockChangePct = Math.abs((crm.ytd.stockChange / january.stockCount) * 100)
  const ticket2026 = crm.ytd.salesUf / crm.ytd.salesCount
  const ticket2025 = crm.baseline2025.firstHalfSalesUf / crm.baseline2025.firstHalfSalesCount
  const ticketChange = ((ticket2026 / ticket2025) - 1) * 100
  const juneStockTarget = targets.companyMonthlyTargets.stock_count['2026-06']
  const stockAttainment = (june.stockCount / juneStockTarget) * 100
  const portalListings = market.cross.portal.reduce((sum, source) => sum + source.rows, 0)
  const branchRows = presentations.management.branches.map((branch) => ({
    name: branch.name,
    management: branch.scores.management,
    countAttainment: branch.salesSummary.cumulativeTargetSalesCount > 0
      ? (branch.salesSummary.cumulativeSalesCount / branch.salesSummary.cumulativeTargetSalesCount) * 100
      : 0,
    ufAttainment: branch.salesSummary.cumulativeTargetSalesUf > 0
      ? (branch.salesSummary.cumulativeSalesUf / branch.salesSummary.cumulativeTargetSalesUf) * 100
      : 0,
    classifiedRate: branch.indicators.activeLeads > 0
      ? (branch.indicators.classifiedLeads / branch.indicators.activeLeads) * 100
      : 0,
    stale90Rate: branch.indicators.activeLeads > 0
      ? (branch.indicators.stale90Leads / branch.indicators.activeLeads) * 100
      : 0,
    visitCompletion: branch.indicators.scheduledVisits > 0
      ? (branch.indicators.realizedVisits / branch.indicators.scheduledVisits) * 100
      : 0,
  }))

  const cards = [
    ['Cierres', number(crm.ytd.salesCount), 'CRM normalizado · enero-junio 2026'],
    ['Volumen', uf(crm.ytd.salesUf), 'CRM normalizado · ventas Vitacura'],
    ['Ticket promedio', uf(ticket2026), 'UF vendidas / cierres del período'],
    ['Cartera', number(june.stockCount), `Junio · variación de ${crm.ytd.stockChange} desde enero`],
    ['Leads activos', number(crm.latestLeadSnapshot.active), 'Snapshot de cierre de junio'],
    ['Sin gestión +15d', number(crm.latestLeadSnapshot.staleOver15Total), '596 entre 15–90d · 505 sobre 90d'],
  ]

  return (
    <div className="mx-auto max-w-[1600px] space-y-7 pb-16 text-[var(--n3-text-light)]">
      <header className="overflow-hidden border border-white/10 bg-black text-white">
        <div className="grid gap-8 p-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-10">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#e23b31]">Gestión corporativa · uso interno</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight lg:text-4xl">Resultados y control de gestión</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#bcbcbc]">Resumen para CEO y dirección. Corte acumulado enero–junio 2026, con comparación 2025, cartera, actividad comercial y alertas de calidad.</p>
          </div>
          <div className="grid grid-cols-2 gap-px self-end bg-white/15">
            {[
              ['Variación cierres', percent(crm.ytd.comparison2025.salesChangePct)],
              ['Variación UF', percent(crm.ytd.comparison2025.salesUfChangePct)],
              ['Variación cartera', number(crm.ytd.stockChange)],
              ['Alertas críticas', targets.quality.criticalCount],
            ].map(([label, value]) => <div key={label} className="bg-[#111] p-4"><p className="text-[10px] uppercase tracking-[0.16em] text-[#888]">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>)}
          </div>
        </div>
        <div className="h-1 bg-[#d7332b]" />
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {cards.map(([label, value, detail]) => (
          <article key={label} className="border border-[#dedede] bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6d746f]">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-black">{value}</p>
            <p className="mt-2 text-[11px] leading-4 text-[#777]">{detail}</p>
          </article>
        ))}
      </section>

      <section className="border border-[#d4d4d4] bg-white">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#d4d4d4] p-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#d7332b]">Revisión de gestión</p><h2 className="mt-2 text-xl font-semibold">Excepciones del corte</h2></div><p className="text-xs text-[#777]">Valores reportados; no incluyen diagnóstico causal</p></div>
        <div className="grid gap-px bg-[#d4d4d4] md:grid-cols-3">
          <article className="bg-[#f6f6f6] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#777]">Cartera vs. meta junio</p><p className="mt-2 text-2xl font-semibold">{percent(stockAttainment)}</p><p className="mt-2 text-xs leading-5 text-[#666]">{number(june.stockCount)} propiedades informadas frente a meta de {number(juneStockTarget)}.</p><Link href="/dashboard/control" className="mt-4 inline-flex text-xs font-semibold text-[#d7332b]">Revisar control de gestión →</Link></article>
          <article className="bg-[#f6f6f6] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#777]">Leads sin gestión +90 días</p><p className="mt-2 text-2xl font-semibold">{number(crm.latestLeadSnapshot.staleOver90)}</p><p className="mt-2 text-xs leading-5 text-[#666]">Parte de los {number(crm.latestLeadSnapshot.staleOver15Total)} leads con más de 15 días sin gestión.</p><Link href="/dashboard/datos-crm" className="mt-4 inline-flex text-xs font-semibold text-[#d7332b]">Revisar CRM →</Link></article>
          <article className="bg-[#f6f6f6] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#777]">Calidad de metas</p><p className="mt-2 text-2xl font-semibold">{targets.quality.criticalCount} críticas</p><p className="mt-2 text-xs leading-5 text-[#666]">{targets.quality.issueCount} observaciones conservadas en Metas 2026.</p><Link href="/dashboard/metas" className="mt-4 inline-flex text-xs font-semibold text-[#d7332b]">Revisar metas →</Link></article>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="border border-[#d8d8d8] bg-[#f3f3f3] p-5">
          <Status>Hecho</Status>
          <h2 className="mt-4 text-xl font-semibold">Cierres y volumen vs. primer semestre 2025</h2>
          <p className="mt-3 text-sm leading-6 text-[#4f5753]">El primer semestre registra {crm.ytd.salesCount} ventas y {uf(crm.ytd.salesUf)}. Frente al mismo período de 2025, los cierres aumentan {percent(crm.ytd.comparison2025.salesChangePct)} y el volumen {percent(crm.ytd.comparison2025.salesUfChangePct)}.</p>
          <Evidence>Fuente: CRM normalizado 2026 y baseline CRM enero–junio 2025.</Evidence>
        </article>
        <article className="border border-[#d8d8d8] bg-[#f3f3f3] p-5">
          <Status tone="relation">Relación observada</Status>
          <h2 className="mt-4 text-xl font-semibold">Variación del ticket promedio</h2>
          <p className="mt-3 text-sm leading-6 text-[#4f5753]">El cociente UF/cierres pasa de {uf(ticket2025)} en el primer semestre de 2025 a {uf(ticket2026)} en 2026, una diferencia calculada de {percent(ticketChange)}.</p>
          <Evidence>Cálculo derivado: volumen UF dividido por cantidad de cierres en cada período. No atribuye causalidad.</Evidence>
        </article>
        <article className="border border-[#d8d8d8] bg-[#f3f3f3] p-5">
          <Status tone="relation">Relación observada</Status>
          <h2 className="mt-4 text-xl font-semibold">Variación de la cartera disponible</h2>
          <p className="mt-3 text-sm leading-6 text-[#4f5753]">El stock comparable baja de {number(january.stockCount)} en enero a {number(june.stockCount)} en junio: {number(Math.abs(crm.ytd.stockChange))} propiedades, equivalentes a {percent(stockChangePct)}.</p>
          <Evidence>Fuente: snapshots mensuales CRM. La relación no determina la causa de la reducción.</Evidence>
        </article>
      </section>

      <section className="border border-[#d4d4d4] bg-white">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#d4d4d4] bg-black p-5 text-white">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#e23b31]">Seguimiento mensual</p><h2 className="mt-2 text-xl font-semibold">Actividad comercial</h2></div>
          <p className="text-xs text-[#aaa]">Los cocientes mensuales no son conversiones de cohorte</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-xs">
            <thead className="bg-[#ededed] text-[#555]"><tr><th className="px-4 py-3">Período</th><th>Cierres</th><th>UF</th><th>Ticket medio</th><th>Captaciones</th><th>Leads</th><th>Requerimientos</th><th>Visitas</th><th>Realizadas</th><th>Stock</th><th>Cobertura</th></tr></thead>
            <tbody>{months.map((month) => <tr key={month.period} className="border-t border-[#e3e3e3]"><td className="px-4 py-3 font-semibold">{month.label}</td><td>{number(month.salesCount)}</td><td>{number(month.salesUf)}</td><td>{month.salesCount ? uf(month.salesUf / month.salesCount) : 'n/d'}</td><td>{number(month.capturesCount)}</td><td>{number(month.newLeadsCount)}</td><td>{number(month.requirementsCount)}</td><td>{month.visitsCount === null ? 'n/d' : number(month.visitsCount)}</td><td>{month.realizedVisitsCount === null ? 'n/d' : number(month.realizedVisitsCount)}</td><td>{number(month.stockCount)}</td><td>{percent(month.quality.sourceCoverage)}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <article className="border border-[#d4d4d4] bg-white">
          <div className="border-b border-[#d4d4d4] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#d7332b]">Sucursales · corte de gestión</p><h2 className="mt-2 text-xl font-semibold">Cumplimiento y actividad por sucursal</h2></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="bg-[#ededed] text-[#555]"><tr><th className="px-4 py-3">Sucursal</th><th>Índice de gestión</th><th>Cumpl. cierres</th><th>Cumpl. UF</th><th>Leads clasificados</th><th>Sin gestión +90d</th><th>Visitas realizadas</th></tr></thead><tbody>{branchRows.map((branch) => <tr key={branch.name} className="border-t border-[#e3e3e3]"><td className="px-4 py-3 font-semibold">{branch.name}</td><td>{number(branch.management, 1)}</td><td>{percent(branch.countAttainment)}</td><td>{percent(branch.ufAttainment)}</td><td>{percent(branch.classifiedRate)}</td><td>{percent(branch.stale90Rate)}</td><td>{percent(branch.visitCompletion)}</td></tr>)}</tbody></table></div>
          <Evidence>Fuente: Jun_Directorio_5.pptx. Los cierres fraccionarios y scores se conservan exactamente como snapshot de presentación.</Evidence>
        </article>
        <article className="border border-[#d4d4d4] bg-[#f3f3f3] p-5">
          <Status tone="relation">Relación observada</Status>
          <h2 className="mt-4 text-xl font-semibold">Comparación mayo–junio</h2>
          <div className="mt-5 grid grid-cols-2 gap-px bg-[#ccc]">
            {[['Mayo', may], ['Junio', june]].map(([label, raw]) => {
              const month = raw as typeof may
              return <div key={label as string} className="bg-white p-4"><p className="font-semibold">{label as string}</p><p className="mt-3 text-2xl font-semibold">{month.salesCount} cierres</p><p className="text-xs text-[#666]">{number(month.newLeadsCount)} leads · {number(month.requirementsCount)} requerimientos</p></div>
            })}
          </div>
          <Evidence>Comparación de totales mensuales. No vincula los leads de un mes con sus cierres posteriores.</Evidence>
        </article>
      </section>

      <section className="grid gap-px bg-[#cfcfcf] lg:grid-cols-3">
        <article className="bg-[#f5f5f5] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#666]">Mercado</p><p className="mt-2 text-3xl font-semibold">{number(portalListings)}</p><p className="mt-1 text-sm text-[#555]">filas de publicaciones auditadas</p><p className="mt-4 text-xs leading-5 text-[#666]">{number(valuation.sourceReconciliation.currentPortalSaleEligibleListings)} publicaciones sin señal explícita de arriendo y {number(valuation.sourceReconciliation.portalListingsQuarantinedByRentIndicator)} señales de arriendo excluidas.</p></article>
        <article className="bg-[#f5f5f5] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#666]">Registro</p><p className="mt-2 text-3xl font-semibold">{number(market.cross.cbrs.rows)}</p><p className="mt-1 text-sm text-[#555]">inscripciones CBRS Vitacura</p><p className="mt-4 text-xs leading-5 text-[#666]">La clave evento + rol es única en los {number(market.cross.cbrs.candidateKeyCardinality.event_plus_rol.unique)} registros.</p></article>
        <article className="bg-[#f5f5f5] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#666]">Territorio</p><p className="mt-2 text-3xl font-semibold">{number(market.kml.geometryAudit.polygonCount)}</p><p className="mt-1 text-sm text-[#555]">polígonos de barrios</p><p className="mt-4 text-xs leading-5 text-[#666]">{number(market.cross.cbrs.barrioComparison.coordinate_agrees_with_barrio)} registros coinciden entre coordenada y barrio asignado.</p></article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="border border-[#d4d4d4] bg-white p-5">
          <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#d7332b]">Valorización</p><h2 className="mt-2 text-xl font-semibold">Metodología fuente</h2></div><Status>Hecho</Status></div>
          <div className="mt-5 space-y-3 text-sm leading-6 text-[#4f5753]"><p><strong>Departamento:</strong> superficie útil + terraza al 50%; valor comercial calculado sobre superficie útil y UF/m² aplicada.</p><p><strong>Casa:</strong> valor de construcción + terreno; superficie comparable con terreno ponderado al 25%.</p></div>
          <Evidence>{valuation.sourceInventory.length} plantillas · {valuation.sourceInventory.reduce((sum, source) => sum + source.sheets.reduce((sheetSum, sheet) => sheetSum + sheet.formulaCells, 0), 0)} fórmulas · cero errores de fórmula detectados.</Evidence>
        </article>
        <article className="border border-[#e5beba] bg-[#fff7f6] p-5">
          <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#a72f28]">Límites visibles</p><h2 className="mt-2 text-xl font-semibold">Lo que la fuente no permite afirmar</h2></div><Status tone="limit">Límite</Status></div>
          <ul className="mt-5 space-y-2 text-sm leading-6 text-[#5b4d4a]"><li>• Febrero no contiene archivo de visitas; el acumulado semestral permanece no disponible.</li><li>• Los ratios mensuales no representan conversión de cohorte.</li><li>• Las diferencias CRM/PPT se conservan por corte y definición.</li><li>• El caso histórico de valorización no constituye validación predictiva.</li></ul>
        </article>
      </section>

      <section className="border border-[#d4d4d4] bg-black p-6 text-white">
        <div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#e23b31]">Detalle y respaldo</p><h2 className="mt-2 text-xl font-semibold">Fuentes del reporte</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#bcbcbc]">Los indicadores se calculan desde las capas auditadas. El detalle de CRM, metas, presentaciones y mercado está disponible en los módulos correspondientes.</p></div><div className="flex flex-wrap gap-2">{[
          ['/dashboard/datos-crm', 'CRM'], ['/dashboard/metas', 'Metas'], ['/dashboard/presentaciones', 'Presentaciones'], ['/dashboard/market/fuentes', 'Portal + CBRS'], ['/dashboard/valorizador', 'Valorizador'],
        ].map(([href, label]) => <Link key={href} href={href} className="border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10">{label}</Link>)}</div></div>
        <div className="mt-5 grid gap-px bg-white/15 sm:grid-cols-3">{[
          ['Hecho', 'Valor leído directamente de una fuente auditada.'], ['Relación observada', 'Cálculo reproducible; no implica causalidad.'], ['Límite', 'Ausencia, diferencia o restricción que permanece visible.'],
        ].map(([label, detail]) => <div key={label} className="bg-[#111] p-4"><p className="text-xs font-semibold">{label}</p><p className="mt-1 text-[11px] leading-4 text-[#999]">{detail}</p></div>)}</div>
      </section>
    </div>
  )
}
