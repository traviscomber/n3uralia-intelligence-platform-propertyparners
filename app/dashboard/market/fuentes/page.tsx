import { getMarketSourceTrace } from '@/lib/market-source-trace'

function number(value: number) {
  return value.toLocaleString('es-CL')
}

function date(value: string | null) {
  return value ? new Date(value).toLocaleString('es-CL') : 'Sin cierre'
}

export default async function MarketSourcesPage() {
  const trace = await getMarketSourceTrace()

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 pb-16 text-[var(--n3-text-light)]">
      <header className="overflow-hidden border border-white/10 bg-black text-white">
        <div className="grid gap-8 p-7 lg:grid-cols-[1fr_430px] lg:p-10">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--n3-teal)]">Fuentes operativas</p>
            <h1 className="mt-3 text-3xl font-semibold lg:text-4xl">Trazabilidad de datos de mercado</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">Esta vista muestra únicamente fuentes, ejecuciones y registros raw almacenados en Supabase. No incluye cifras de archivos históricos ni benchmarks externos.</p>
          </div>
          <div className="grid grid-cols-3 gap-px bg-[var(--n3-line)]">
            {[
              ['Fuentes', trace.sourceCount],
              ['Ejecuciones', trace.runCount],
              ['Filas raw', trace.rawCount],
            ].map(([label, value]) => (
              <div key={label} className="bg-[var(--n3-deep)] p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--n3-text-light)]">{number(Number(value))}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="h-1 bg-[#d7332b]" />
      </header>

      <section className="border border-[var(--n3-line)] bg-[var(--n3-deep)]">
        <div className="border-b border-[var(--n3-line)] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--n3-teal)]">Integridad operativa</p>
          <h2 className="mt-2 text-xl font-semibold">Estado de la trazabilidad</h2>
          <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">Los indicadores se calculan directamente sobre ejecuciones y registros raw. Una fuente sin ejecución vinculada se reporta como brecha, no como carga procesada.</p>
        </div>
        <div className="grid gap-px bg-[var(--n3-line)] md:grid-cols-3 lg:grid-cols-6">
          {[
            ['Fuentes', trace.sourceCount],
            ['Ejecuciones', trace.runCount],
            ['Raw', trace.rawCount],
            ['Fuentes sin ejecución', trace.sourcesWithoutRuns],
            ['Ejecuciones sin raw', trace.runsWithoutRaw],
            ['Conteos inconsistentes', trace.inconsistentRuns],
          ].map(([label, value]) => (
            <div key={label} className="bg-[var(--n3-deep)] p-4">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">{label}</p>
              <p className={`mt-2 text-2xl font-semibold ${String(label).includes('sin') || String(label).includes('inconsistentes') ? Number(value) > 0 ? 'text-[#ff766f]' : '' : ''}`}>{number(Number(value))}</p>
            </div>
          ))}
        </div>
        {trace.error ? <p className="border-t border-[#d7332b] p-4 text-xs text-[#ff766f]">No fue posible completar la consulta de trazabilidad. Reintenta más tarde o revisa el estado operativo con un administrador.</p> : null}
      </section>

      <section className="border border-[var(--n3-line)] bg-[var(--n3-deep)]">
        <div className="border-b border-[var(--n3-line)] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--n3-teal)]">Ejecuciones recientes</p>
          <h2 className="mt-2 text-xl font-semibold">Historial operativo</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="text-[var(--n3-text-muted)]">
              <tr>
                <th className="px-5 py-3 text-left">Dataset</th>
                <th className="text-left">Fuente vinculada</th>
                <th className="text-left">Archivo</th>
                <th className="text-left">Estado</th>
                <th className="text-right">Recibidas</th>
                <th className="text-right">Aceptadas</th>
                <th className="text-right">Rechazadas</th>
                <th className="px-5 text-right">Cierre</th>
              </tr>
            </thead>
            <tbody>
              {trace.latestRuns.length ? trace.latestRuns.map((run) => (
                <tr key={run.id} className="border-t border-[var(--n3-line)]">
                  <td className="px-5 py-3 font-mono">{run.datasetKind}</td>
                  <td>{run.sourceName ?? 'Sin fuente vinculada'}</td>
                  <td>{run.sourceFile ?? 'Sin archivo'}</td>
                  <td>{run.status}</td>
                  <td className="text-right">{number(run.received)}</td>
                  <td className="text-right">{number(run.accepted)}</td>
                  <td className="text-right">{number(run.rejected)}</td>
                  <td className="px-5 text-right">{date(run.completedAt)}</td>
                </tr>
              )) : (
                <tr className="border-t border-[var(--n3-line)]"><td colSpan={8} className="px-5 py-8 text-center text-[var(--n3-text-muted)]">No existen ejecuciones operativas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#d7332b]">Criterio de reunión</p>
        <h2 className="mt-2 text-xl font-semibold">Sin datos históricos mezclados</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--n3-text-muted)]">Los perfiles de archivos, celdas auditadas, hashes y cifras históricas se mantienen como evidencia interna, pero no se muestran en esta vista para evitar confundirlos con el estado operativo actual.</p>
      </section>
    </div>
  )
}
