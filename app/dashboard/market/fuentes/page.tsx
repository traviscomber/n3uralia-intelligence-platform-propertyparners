import { getMarketSourceTrace } from '@/lib/market-source-trace'

function number(value: number) {
  return value.toLocaleString('es-CL')
}

function date(value: string | null) {
  return value ? new Date(value).toLocaleString('es-CL') : 'Sin cierre'
}

function shortDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString('es-CL') : 'Sin fecha'
}

function age(value: string | null) {
  if (!value) return 'Sin ejecución'
  const diff = Date.now() - new Date(value).getTime()
  if (!Number.isFinite(diff) || diff < 0) return shortDate(value)
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Hace 1 día'
  return `Hace ${number(days)} días`
}

function statusLabel(value: string | null) {
  if (!value) return 'Sin ejecución'
  if (value === 'completed') return 'Completada'
  if (value === 'failed') return 'Fallida'
  if (value === 'rejected') return 'Rechazada'
  if (value === 'running') return 'En curso'
  if (value === 'pending') return 'Pendiente'
  return value
}

function sourceStatusLabel(value: string) {
  if (value === 'active') return 'Activa'
  if (value === 'quarantined') return 'Cuarentena'
  if (value === 'superseded') return 'Reemplazada'
  return value
}

function statusClass(value: string | null) {
  if (value === 'failed' || value === 'rejected' || value === 'quarantined') return 'text-[#ff766f]'
  if (value === 'completed' || value === 'active') return 'text-[var(--n3-teal)]'
  return 'text-[var(--n3-text-muted)]'
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
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">Estado real de fuentes, ejecuciones y registros raw almacenados en Supabase. Las fuentes heredadas se identifican explícitamente y no se presentan como ingestiones actuales.</p>
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
          <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">Los indicadores se calculan directamente sobre fuentes, ejecuciones y registros raw. Una fuente sin ejecución vinculada se reporta como brecha; una fuente en cuarentena no se considera operativamente sana.</p>
        </div>
        <div className="grid gap-px bg-[var(--n3-line)] md:grid-cols-4 lg:grid-cols-8">
          {[
            ['Fuentes', trace.sourceCount],
            ['Ejecuciones', trace.runCount],
            ['Raw', trace.rawCount],
            ['Sin ejecución', trace.sourcesWithoutRuns],
            ['En cuarentena', trace.quarantinedSources],
            ['Ejecuciones fallidas', trace.failedRuns],
            ['Ejecuciones sin raw', trace.runsWithoutRaw],
            ['Conteos inconsistentes', trace.inconsistentRuns],
          ].map(([label, value]) => {
            const alert = ['Sin ejecución', 'En cuarentena', 'Ejecuciones fallidas', 'Ejecuciones sin raw', 'Conteos inconsistentes'].includes(String(label)) && Number(value) > 0
            return (
              <div key={label} className="bg-[var(--n3-deep)] p-4">
                <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">{label}</p>
                <p className={`mt-2 text-2xl font-semibold ${alert ? 'text-[#ff766f]' : ''}`}>{number(Number(value))}</p>
              </div>
            )
          })}
        </div>
        {trace.error ? <p className="border-t border-[#d7332b] p-4 text-xs text-[#ff766f]">No fue posible completar la consulta de trazabilidad. Reintenta más tarde o revisa el estado operativo con un administrador.</p> : null}
      </section>

      <section className="border border-[var(--n3-line)] bg-[var(--n3-deep)]">
        <div className="border-b border-[var(--n3-line)] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--n3-teal)]">Salud de fuentes</p>
          <h2 className="mt-2 text-xl font-semibold">Fuentes registradas y última evidencia operativa</h2>
          <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">La frescura se expresa como antigüedad de la última ejecución observada. No se aplica un SLA artificial mientras no exista una política de actualización definida para cada fuente.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="text-[var(--n3-text-muted)]">
              <tr>
                <th className="px-5 py-3 text-left">Fuente</th>
                <th className="text-left">Origen</th>
                <th className="text-left">Estado fuente</th>
                <th className="text-left">Última ejecución</th>
                <th className="text-left">Frescura</th>
                <th className="text-right">Filas fuente</th>
                <th className="text-right">Aceptadas</th>
                <th className="px-5 text-left">Último error</th>
              </tr>
            </thead>
            <tbody>
              {trace.sources.length ? trace.sources.map((source) => (
                <tr key={source.id} className="border-t border-[var(--n3-line)] align-top">
                  <td className="px-5 py-3">
                    <p className="font-medium">{source.name}</p>
                    <p className="mt-1 font-mono text-[10px] text-[var(--n3-text-muted)]">{source.code}</p>
                  </td>
                  <td>
                    <p>{source.isLegacy ? 'Legada' : source.sourceType}</p>
                    <p className="mt-1 text-[10px] text-[var(--n3-text-muted)]">{source.fileName ?? 'Sin archivo'}</p>
                  </td>
                  <td className={statusClass(source.status)}>{sourceStatusLabel(source.status)}</td>
                  <td className={statusClass(source.latestRunStatus)}>
                    <p>{statusLabel(source.latestRunStatus)}</p>
                    <p className="mt-1 text-[10px] text-[var(--n3-text-muted)]">{source.latestRunCompletedAt ? date(source.latestRunCompletedAt) : source.latestRunStartedAt ? date(source.latestRunStartedAt) : 'Sin ejecución vinculada'}</p>
                  </td>
                  <td>{age(source.latestRunCompletedAt ?? source.latestRunStartedAt)}</td>
                  <td className="text-right">{number(source.rowCount)}</td>
                  <td className="text-right">{source.latestRunId ? number(source.latestRunAccepted) : '—'}</td>
                  <td className="px-5">
                    {source.latestRunError ? <span className="text-[#ff766f]">{source.latestRunError}</span> : <span className="text-[var(--n3-text-muted)]">Sin error registrado</span>}
                  </td>
                </tr>
              )) : (
                <tr className="border-t border-[var(--n3-line)]"><td colSpan={8} className="px-5 py-8 text-center text-[var(--n3-text-muted)]">No existen fuentes registradas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
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
                  <td className={statusClass(run.status)}>
                    <p>{statusLabel(run.status)}</p>
                    {run.errorMessage ? <p className="mt-1 max-w-[340px] text-[10px] text-[#ff766f]">{run.errorMessage}</p> : null}
                  </td>
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
        <h2 className="mt-2 text-xl font-semibold">Evidencia operativa separada de registros heredados</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--n3-text-muted)]">Los perfiles de archivos, hashes y cifras históricas permanecen disponibles como evidencia interna. La tabla de salud distingue explícitamente fuentes legadas de aquellas que poseen ejecuciones canónicas vinculadas, evitando presentar una fuente heredada como una carga operativa vigente.</p>
      </section>
    </div>
  )
}
