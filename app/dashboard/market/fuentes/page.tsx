import data from '@/data/market-source-intelligence.json'

function number(value: number) { return value.toLocaleString('es-CL') }
function category(source: Record<string, unknown>, key: string) { return (source[key] || []) as Array<[string, number]> }
function populated(typeCounts: Record<string, number | undefined>) { return Object.entries(typeCounts).reduce((sum, [type, count]) => type === 'null' ? sum : sum + (count || 0), 0) }

export default function MarketSourcesPage() {
  const portalRows = data.cross.portal.reduce((sum, item) => sum + item.listingIds.present, 0)
  const categories = data.cross.cbrs.categories as unknown as Record<string, unknown>
  const cbrsTypes = category(categories, 'DESCRIPCION')
  const cbrsOperations = category(categories, 'TIPO DE INSCRIPCION')
  const cbrsGeo = category(categories, 'GEO_STATUS')

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 pb-16 text-[#242424]">
      <header className="overflow-hidden border border-white/10 bg-black text-white">
        <div className="grid gap-8 p-7 lg:grid-cols-[1fr_430px] lg:p-10">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#e23b31]">Pilar 02 · Herramienta de inteligencia de negocios</p><h1 className="mt-3 text-3xl font-semibold lg:text-4xl">Oferta, territorio y ventas registradas</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#aaa]">Portal Inmobiliario describe oferta publicada. CBRS describe cierres registrales. El KML asigna territorio. El sistema conserva estas funciones separadas y solo cruza candidatos con evidencia.</p></div>
          <div className="grid grid-cols-2 gap-px bg-white/15">{[['Avisos Portal', portalRows], ['Registros CBRS', data.cross.cbrs.rows], ['Polígonos KML', data.kml.geometryAudit.polygonCount], ['Celdas auditadas', data.sourceInventory.cellManifest.cellCount]].map(([label, value]) => <div key={label} className="bg-[#111] p-4"><p className="text-[10px] uppercase tracking-[0.16em] text-[#888]">{label}</p><p className="mt-2 text-2xl font-semibold">{number(Number(value))}</p></div>)}</div>
        </div><div className="h-1 bg-[#d7332b]" />
      </header>

      <section className="grid gap-px bg-[#cfcfcf] lg:grid-cols-3">
        {data.operatingModel.sourceRoles.map((source, index) => <article key={source.source} className="bg-[#f0f0f0] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#d7332b]">0{index + 1} · {source.role}</p><h2 className="mt-2 text-lg font-semibold">{source.source}</h2><p className="mt-2 text-xs leading-5 text-[#666]">{source.use}</p></article>)}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {data.cross.portal.map((source) => <article key={source.file} className="border border-[#d6d6d6] bg-white p-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#777]">Portal Inmobiliario</p><h2 className="mt-2 break-words text-base font-semibold">{source.file}</h2><p className="mt-4 text-3xl font-semibold">{number(source.listingIds.present)}</p><p className="text-xs text-[#777]">IDs MLC únicos · {source.listingIds.duplicateExtraOccurrences} duplicados extra</p><div className="mt-4 grid grid-cols-2 gap-px bg-[#ddd] text-xs"><div className="bg-[#f5f5f5] p-3"><strong>{number(source.photoQuality.rows_with_photo_urls || 0)}</strong><span className="block text-[#777]">filas con fotos</span></div><div className="bg-[#f5f5f5] p-3"><strong>{number(source.photoQuality.photo_url_count || 0)}</strong><span className="block text-[#777]">URLs de fotos</span></div><div className="bg-[#f5f5f5] p-3"><strong>{number(source.coordinateQuality.single_polygon || 0)}</strong><span className="block text-[#777]">barrio único</span></div><div className="bg-[#f5f5f5] p-3"><strong>{number(source.coordinateQuality.multiple_polygons || 0)}</strong><span className="block text-[#777]">barrio ambiguo</span></div></div><p className="mt-4 border-l-2 border-[#f39c12] pl-3 text-xs leading-5 text-[#666]">Indicadores de arriendo: {source.operationIndicators.rent_indicator || 0}. Se marcan para revisión; no se mezclan con ventas.</p></article>)}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_1.9fr]">
        <article className="border border-[#d6d6d6] bg-[#f0f0f0] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#d7332b]">Geografía</p><h2 className="mt-2 text-xl font-semibold">19 barrios KML</h2><div className="mt-4 flex flex-wrap gap-2">{data.kml.placemarks.map((item) => <span key={item.name} className="border border-[#ccc] bg-white px-2 py-1 text-xs">{item.name}</span>)}</div><p className="mt-4 text-xs leading-5 text-[#666]">{data.kml.geometryAudit.areaOverlapCandidates.length} pares candidatos a solapamiento. Los puntos contenidos por más de un polígono reciben `AMBIGUOUS_POLYGON`; nunca se asigna el primer resultado.</p></article>
        <article className="border border-[#d6d6d6] bg-white p-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#777]">Incidencias territoriales</p><h2 className="mt-2 text-xl font-semibold">Solapamientos que requieren regla explícita</h2><div className="mt-4 grid gap-px bg-[#ddd] md:grid-cols-2">{data.kml.geometryAudit.areaOverlapCandidates.map((item) => <div key={item.pair.join('-')} className="bg-[#f7f7f7] p-3 text-sm"><strong>{item.pair[0]}</strong><span className="mx-2 text-[#d7332b]">×</span><strong>{item.pair[1]}</strong></div>)}</div></article>
      </section>

      <section className="border border-[#d6d6d6] bg-white">
        <div className="border-b border-[#d6d6d6] bg-black p-5 text-white"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#e23b31]">CBRS Vitacura</p><h2 className="mt-2 text-xl font-semibold">40.843 registros · 2014 a 9 enero 2026</h2></div>
        <div className="grid gap-px bg-[#ddd] lg:grid-cols-3">
          <div className="bg-[#f5f5f5] p-5"><h3 className="font-semibold">Tipos registrales</h3><div className="mt-3 space-y-2 text-xs">{cbrsTypes.map(([label, value]) => <p key={label}>{label}<strong className="float-right">{number(value)}</strong></p>)}</div></div>
          <div className="bg-[#f5f5f5] p-5"><h3 className="font-semibold">Operaciones</h3><div className="mt-3 space-y-2 text-xs">{cbrsOperations.map(([label, value]) => <p key={label}>{label}<strong className="float-right">{number(value)}</strong></p>)}</div></div>
          <div className="bg-[#f5f5f5] p-5"><h3 className="font-semibold">Estado geográfico</h3><div className="mt-3 space-y-2 text-xs">{cbrsGeo.map(([label, value]) => <p key={label}>{label}<strong className="float-right">{number(value)}</strong></p>)}</div><p className="mt-4 border-l-2 border-[#d7332b] pl-3 text-xs leading-5">La cobertura 2026 contiene solo 53 filas. No representa el año completo.</p></div>
        </div>
      </section>

      <section className="border border-[#d6d6d6] bg-[#f0f0f0] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#d7332b]">Matching Portal ↔ CBRS</p><div className="mt-2 flex flex-wrap items-end justify-between gap-4"><h2 className="text-xl font-semibold">Candidatos con evidencia, cero confirmaciones inventadas</h2><span className="bg-black px-3 py-1 text-xs font-semibold text-white">{data.operatingModel.matchPolicy.currentConfirmedMatches} matches confirmados</span></div><div className="mt-5 grid gap-px bg-[#ccc] lg:grid-cols-4">{[['Llave Portal', data.operatingModel.deterministicKeys.portal], ['Evento CBRS', data.operatingModel.deterministicKeys.cbrsEvent], ['Activo CBRS', data.operatingModel.deterministicKeys.cbrsAsset], ['Cruce directo', 'No disponible']].map(([label, value]) => <div key={label} className="bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#777]">{label}</p><p className="mt-2 break-words font-mono text-xs">{value}</p></div>)}</div><ol className="mt-5 grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-4">{data.operatingModel.matchPolicy.candidateEvidence.map((item, index) => <li key={item} className="border-l-2 border-[#d7332b] bg-white p-3"><span className="text-xs text-[#777]">{String(index + 1).padStart(2, '0')}</span><strong className="ml-2 capitalize">{item}</strong></li>)}</ol><p className="mt-4 text-xs leading-5 text-[#666]">{data.operatingModel.matchPolicy.rule}</p></section>

      <section className="space-y-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#d7332b]">Trazabilidad</p><h2 className="mt-2 text-xl font-semibold text-white">Estructura completa de archivos</h2></div>{data.workbooks.map((workbook) => <details key={workbook.file} className="border border-white/10 bg-[#111] text-white"><summary className="cursor-pointer px-5 py-4 text-sm font-semibold">{workbook.sourceFolder} / {workbook.file} · SHA-256 {workbook.sha256.slice(0, 12)}…</summary><div className="border-t border-white/10 p-5">{workbook.sheets.map((sheet) => <div key={sheet.title} className="mb-5"><h3 className="text-sm font-semibold">{sheet.title} · {sheet.dimension} · {number(sheet.populatedCells)} celdas pobladas</h3><div className="mt-3 overflow-x-auto"><table className="min-w-full text-xs"><thead className="text-[#999]"><tr><th className="py-2 text-left">Columna</th><th className="text-left">Tipo</th><th className="text-left">Pobladas</th><th className="text-left">Nulas</th><th className="text-left">Únicos</th></tr></thead><tbody>{sheet.columns.map((column) => <tr key={column.column} className="border-t border-white/10"><td className="py-2">{column.column} · {column.header || 'sin encabezado'}</td><td>{Object.entries(column.typeCounts || {}).map(([type, count]) => `${type}:${count}`).join(' · ')}</td><td>{number(populated(column.typeCounts))}</td><td>{number(column.nullCount)}</td><td>{number(column.uniqueNonNull)}</td></tr>)}</tbody></table></div></div>)}</div></details>)}</section>

      <footer className="border-l-2 border-[#d7332b] bg-[#f0f0f0] p-4 text-xs leading-5 text-[#666]">Manifiesto celda a celda: {number(data.sourceInventory.cellManifest.cellCount)} celdas · SHA-256 <span className="font-mono">{data.sourceInventory.cellManifest.sha256}</span>. Los archivos fuente permanecen fuera del repositorio público; la app contiene perfiles, hashes y reglas sin publicar registros personales.</footer>
    </div>
  )
}
