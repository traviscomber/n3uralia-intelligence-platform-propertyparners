import Link from 'next/link'
import { getManagementEntities, getPresentationComparisons, getPresentations2026, type PresentationComparisonStatus } from '@/lib/presentations-2026'

const METRICS: Record<string, string> = {
  sales_count: 'Cierres', sales_uf: 'UF vendidas', target_sales_count: 'Meta cierres', target_sales_uf: 'Meta UF',
  stock: 'Cartera', requirements: 'Requerimientos', active_leads: 'Leads activos', classified_leads: 'Leads clasificados',
  stale_90_leads: 'Leads sin gestión 90d', scheduled_visits: 'Visitas agendadas', realized_visits: 'Visitas realizadas',
}

function format(value: number | null, metric?: string) {
  if (value === null) return 'n/d'
  const maximumFractionDigits = metric?.includes('count') ? 2 : 0
  return value.toLocaleString('es-CL', { maximumFractionDigits })
}

function statusLabel(status: PresentationComparisonStatus) {
  return status === 'exact' ? 'Coincide' : status === 'different' ? 'Diferencia' : 'No comparable'
}

export default async function PresentationsPage({ searchParams }: { searchParams: Promise<{ status?: string; deck?: string; slide?: string }> }) {
  const params = await searchParams
  const data = getPresentations2026()
  const entities = getManagementEntities()
  const requestedStatus = ['exact', 'different', 'not_comparable'].includes(params.status || '') ? params.status as PresentationComparisonStatus : 'different'
  const comparisons = getPresentationComparisons(requestedStatus)
  const selectedDeck = data.decks.find((deck) => deck.file === params.deck) || data.decks[0]
  const selectedSlideNumber = Math.min(selectedDeck.slideCount, Math.max(1, Number(params.slide) || 1))
  const selectedSlide = selectedDeck.slides.find((slide) => slide.index === selectedSlideNumber) || selectedDeck.slides[0]

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-16 text-[#242424]">
      <header className="overflow-hidden border border-white/10 bg-black text-white">
        <div className="grid gap-8 p-7 lg:grid-cols-[minmax(0,1fr)_420px] lg:p-10">
          <div>
            <img src="/brand/property-partners-vitacura.png" alt="Property Partners Vitacura" className="h-auto w-full max-w-[390px]" />
            <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.26em] text-[#e23b31]">Control de gestión · fuente real</p>
            <h1 className="mt-3 font-sans text-3xl font-semibold tracking-tight normal-case lg:text-4xl">Presentaciones 2026 conciliadas</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#b8b8b8]">Cada cifra de los cinco PPTX se conserva como snapshot de gestión y se compara con CRM y Metas 2026. Las diferencias se explicitan; no se corrigen, promedian ni ocultan.</p>
          </div>
          <div className="grid grid-cols-2 gap-px self-end bg-white/15">
            {[
              ['Presentaciones', data.source.presentationCount], ['Láminas', data.source.slideCount],
              ['Tablas', data.source.contentCoverage.tables], ['Gráficos', data.source.contentCoverage.charts],
            ].map(([label, value]) => <div key={label} className="bg-[#111] p-4"><p className="text-[10px] uppercase tracking-[0.18em] text-[#8f8f8f]">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{Number(value).toLocaleString('es-CL')}</p></div>)}
          </div>
        </div>
        <div className="h-1 bg-[#d7332b]" />
      </header>

      <section className="grid gap-px bg-[#cfcfcf] lg:grid-cols-3">
        {[
          ['01 · Datos CRM', 'Hechos operacionales', 'Conteos normalizados por período, sucursal y responsable.'],
          ['02 · Metas 2026', 'Contrato de desempeño', 'Valores crudos, fórmulas y celdas de los tres libros vigentes.'],
          ['03 · Presentaciones', 'Snapshot interpretado', 'Scoring, semáforos, cortes y narrativa usada por Directorio y Partners.'],
        ].map(([eyebrow, title, text], index) => <article key={title} className="bg-[#f0f0f0] p-5"><p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${index === 2 ? 'text-[#d7332b]' : 'text-[#686868]'}`}>{eyebrow}</p><h2 className="mt-2 text-lg font-semibold">{title}</h2><p className="mt-2 text-xs leading-5 text-[#666]">{text}</p></article>)}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_1.9fr]">
        <article className="border border-[#d6d6d6] bg-[#f0f0f0] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#d7332b]">Brecha principal</p>
          <h2 className="mt-2 text-xl font-semibold">Acumulado enero-junio</h2>
          <div className="mt-5 grid grid-cols-2 gap-px bg-[#cfcfcf]">
            <div className="bg-white p-4"><p className="text-xs text-[#737373]">PPT Directorio</p><p className="mt-1 text-3xl font-semibold">{format(data.reconciliation.headline.presentationYtdSales)}</p><p className="text-xs text-[#737373]">{format(data.reconciliation.headline.presentationYtdUf)} UF</p></div>
            <div className="bg-white p-4"><p className="text-xs text-[#737373]">CRM normalizado</p><p className="mt-1 text-3xl font-semibold">{format(data.reconciliation.headline.crmYtdSales)}</p><p className="text-xs text-[#737373]">{format(data.reconciliation.headline.crmYtdUf)} UF</p></div>
          </div>
          <p className="mt-4 border-l-2 border-[#d7332b] pl-3 text-sm leading-6">Delta PPT vs CRM: <strong>{format(data.reconciliation.headline.salesDelta)} cierre</strong> y <strong>{format(data.reconciliation.headline.ufDelta)} UF</strong>. La diferencia se concentra en junio.</p>
        </article>
        <article className="border border-[#d6d6d6] bg-white p-5">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#686868]">Scoring real · junio</p><h2 className="mt-2 text-xl font-semibold">Lectura por sucursal</h2></div><p className="text-xs text-[#737373]">Fórmula: 40% cartera · 30% seguimiento · 30% conversión</p></div>
          <div className="mt-5 grid gap-px bg-[#d6d6d6] md:grid-cols-3">
            {entities.branches.map((branch) => <div key={branch.name} className="bg-[#f7f7f7] p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-semibold">{branch.name}</h3><span className="text-2xl font-semibold text-[#d7332b]">{format(branch.scores.management)}</span></div><div className="mt-4 space-y-2 text-xs text-[#616161]"><p>Cartera <strong className="float-right text-[#1565c0]">{format(branch.scores.portfolio)}</strong></p><p>Seguimiento <strong className="float-right text-[#f39c12]">{format(branch.scores.followUp)}</strong></p><p>Conversión <strong className="float-right text-[#27ae60]">{format(branch.scores.conversion)}</strong></p></div><p className="mt-4 border-t border-[#ddd] pt-3 text-[11px] text-[#737373]">{branch.scores.classification || 'Sin clasificación'}</p></div>)}
          </div>
        </article>
      </section>

      <section className="border border-[#d6d6d6] bg-[#f0f0f0]">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#d6d6d6] p-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#d7332b]">Matriz de conciliación</p><h2 className="mt-2 text-xl font-semibold">115 comparaciones trazables</h2></div><div className="flex flex-wrap gap-2">{(['different', 'exact', 'not_comparable'] as const).map((status) => <Link key={status} href={`/dashboard/presentaciones?status=${status}&deck=${encodeURIComponent(selectedDeck.file)}&slide=${selectedSlide.index}`} className="border px-3 py-1.5 text-xs font-semibold" style={{ background: requestedStatus === status ? '#000' : '#fff', color: requestedStatus === status ? '#fff' : '#333', borderColor: requestedStatus === status ? '#000' : '#ccc' }}>{statusLabel(status)}</Link>)}</div></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-xs">
            <thead className="bg-black text-white"><tr><th className="px-4 py-3">Ámbito</th><th>Métrica</th><th>Período</th><th>PPT</th><th>Comparación</th><th>Delta</th><th>Fuente PPT</th><th>Fuente comparada</th></tr></thead>
            <tbody>{comparisons.map((item, index) => <tr key={`${item.scope}-${item.metric}-${item.period}-${index}`} className="border-t border-[#d8d8d8] bg-white align-top"><td className="px-4 py-3 font-semibold">{item.scope}</td><td>{METRICS[item.metric] || item.metric}</td><td>{item.period}</td><td className="font-semibold">{format(item.presentation, item.metric)}</td><td>{format(item.comparison, item.metric)}</td><td className={item.status === 'different' ? 'font-bold text-[#d7332b]' : ''}>{format(item.delta, item.metric)}</td><td>{item.presentationSource.deck} · lámina {item.presentationSource.slide}</td><td className="pr-4">{item.comparisonSource}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="border border-[#d6d6d6] bg-white">
        <div className="border-b border-[#d6d6d6] bg-black p-5 text-white"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#e23b31]">Archivo completo</p><h2 className="mt-2 text-xl font-semibold">304 láminas navegables con tablas y series</h2></div>
        <div className="grid lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="border-r border-[#d6d6d6] bg-[#f0f0f0] p-4">
            <div className="space-y-2">{data.decks.map((deck) => <Link key={deck.file} href={`/dashboard/presentaciones?status=${requestedStatus}&deck=${encodeURIComponent(deck.file)}&slide=1`} className="block border-l-2 px-3 py-2 text-xs" style={{ borderColor: deck.file === selectedDeck.file ? '#d7332b' : '#c8c8c8', background: deck.file === selectedDeck.file ? '#fff' : 'transparent' }}><strong className="block">{deck.file}</strong><span className="text-[#737373]">{deck.slideCount} láminas · {deck.stats.tables} tablas · {deck.stats.charts} gráficos</span></Link>)}</div>
            <div className="mt-5 grid grid-cols-6 gap-1">{selectedDeck.slides.map((slide) => <Link key={slide.index} title={slide.title} href={`/dashboard/presentaciones?status=${requestedStatus}&deck=${encodeURIComponent(selectedDeck.file)}&slide=${slide.index}`} className="flex aspect-square items-center justify-center border text-[10px] font-semibold" style={{ background: slide.index === selectedSlide.index ? '#000' : '#fff', color: slide.index === selectedSlide.index ? '#fff' : '#444', borderColor: slide.index === selectedSlide.index ? '#000' : '#ccc' }}>{slide.index}</Link>)}</div>
          </aside>
          <article className="min-w-0 p-5 lg:p-7">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#d7332b]">{selectedDeck.file} · lámina {selectedSlide.index}/{selectedDeck.slideCount}</p>
            <h3 className="mt-2 text-2xl font-semibold">{selectedSlide.title || 'Sin título'}</h3>
            <div className="mt-5 space-y-3">{selectedSlide.texts.filter(Boolean).map((text, index) => <p key={index} className="border-l-2 border-[#d0d0d0] pl-3 text-sm leading-6 text-[#555]">{text}</p>)}</div>
            {selectedSlide.tables.map((table, tableIndex) => <div key={table.id || tableIndex} className="mt-6 overflow-x-auto"><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#737373]">Tabla {tableIndex + 1}</p><table className="min-w-full border-collapse text-xs"><tbody>{table.value.map((row, rowIndex) => <tr key={rowIndex} className={rowIndex === 0 ? 'bg-black text-white' : 'border-t border-[#ddd]'}>{row.map((cell, cellIndex) => <td key={cellIndex} className="whitespace-nowrap px-3 py-2">{cell}</td>)}</tr>)}</tbody></table></div>)}
            {selectedSlide.charts.map((chart, chartIndex) => <div key={chart.id || chartIndex} className="mt-6 border border-[#d6d6d6] bg-[#f7f7f7] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#737373]">Gráfico {chartIndex + 1} · {chart.value.chartKinds.join(', ')}</p>{chart.value.series.map((series, seriesIndex) => <div key={seriesIndex} className="mt-3"><p className="text-sm font-semibold">{series.name || 'Serie sin nombre'}</p><p className="mt-1 break-words text-xs text-[#666]">{series.categories.map((category, index) => `${category}: ${series.values[index] ?? 'n/d'}`).join(' · ')}</p><p className="mt-1 font-mono text-[10px] text-[#888]">{series.categoryFormula} · {series.valueFormula}</p></div>)}</div>)}
          </article>
        </div>
      </section>

      <footer className="border-l-2 border-[#d7332b] bg-[#f0f0f0] p-4 text-xs leading-5 text-[#626262]">Cobertura: {data.source.contentCoverage.textObjects.toLocaleString('es-CL')} objetos de texto, {data.source.contentCoverage.tables} tablas, {data.source.contentCoverage.charts} gráficos y {data.source.contentCoverage.embeddedWorkbooks} libros embebidos. SHA-256 del extracto auditado: <span className="font-mono">{data.source.sha256}</span>.</footer>
    </div>
  )
}
