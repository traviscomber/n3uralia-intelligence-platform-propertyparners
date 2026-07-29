'use client'

import { useEffect, useState } from 'react'

export default function ManagementOperationsPage() {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [rows, setRows] = useState('[]')
  const [runs, setRuns] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function refresh() {
    const [importsResponse, reportsResponse] = await Promise.all([
      fetch('/api/management/import', { cache: 'no-store' }),
      fetch('/api/management/reports', { cache: 'no-store' }),
    ])
    if (importsResponse.ok) setRuns((await importsResponse.json()).runs ?? [])
    if (reportsResponse.ok) setReports((await reportsResponse.json()).reports ?? [])
  }

  useEffect(() => { void refresh() }, [])

  async function evaluate() {
    setBusy(true); setMessage('')
    const response = await fetch('/api/management/evaluate-alerts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ period }) })
    const data = await response.json()
    setMessage(response.ok ? `Evaluación completada: ${data.result.created_count} creadas, ${data.result.resolved_count} resueltas.` : data.error)
    setBusy(false)
  }

  async function importRows() {
    setBusy(true); setMessage('')
    try {
      const parsed = JSON.parse(rows)
      const response = await fetch('/api/management/import', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sourceName: 'Carga administrativa', rows: parsed }) })
      const data = await response.json()
      setMessage(response.ok ? `Importación ${data.runId}: ${data.imported} filas procesadas.` : data.error)
      if (response.ok) await refresh()
    } catch {
      setMessage('JSON inválido.')
    }
    setBusy(false)
  }

  async function generateReport() {
    setBusy(true); setMessage('')
    const summaryResponse = await fetch(`/api/management/summary?period=${period}`, { cache: 'no-store' })
    const summary = await summaryResponse.json()
    if (!summaryResponse.ok) { setMessage(summary.error); setBusy(false); return }
    const start = `${period}-01`
    const endDate = new Date(`${start}T00:00:00Z`); endDate.setUTCMonth(endDate.getUTCMonth() + 1); endDate.setUTCDate(0)
    const response = await fetch('/api/management/reports', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reportType: 'monthly', periodStart: start, periodEnd: endDate.toISOString().slice(0, 10), snapshot: summary }) })
    const data = await response.json()
    setMessage(response.ok ? `Reporte mensual generado: ${data.report.id}.` : data.error)
    if (response.ok) await refresh()
    setBusy(false)
  }

  return <div className="space-y-6">
    <header><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">Módulo III · Operaciones</p><h1 className="mt-2 text-3xl font-semibold">Automatización y cargas</h1><p className="mt-2 text-sm text-[var(--n3-text-muted)]">Importación conciliada, evaluación de alertas y snapshots mensuales.</p></header>
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="border border-[var(--n3-line)] p-5"><h2 className="font-semibold">Período operativo</h2><input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} className="mt-4 w-full border border-[var(--n3-line)] bg-transparent p-3" /><div className="mt-4 space-y-2"><button disabled={busy} onClick={() => void evaluate()} className="w-full border border-[#d7332b] p-3 text-sm">Evaluar alertas</button><button disabled={busy} onClick={() => void generateReport()} className="w-full border border-[var(--n3-line)] p-3 text-sm">Generar reporte mensual</button></div></section>
      <section className="border border-[var(--n3-line)] p-5 lg:col-span-2"><h2 className="font-semibold">Importación masiva JSON</h2><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Máximo 5.000 filas. Todas deben compartir período.</p><textarea value={rows} onChange={(event) => setRows(event.target.value)} className="mt-4 min-h-48 w-full border border-[var(--n3-line)] bg-transparent p-3 font-mono text-xs" /><button disabled={busy} onClick={() => void importRows()} className="mt-3 border border-[#d7332b] px-4 py-3 text-sm">Importar y evaluar</button></section>
    </div>
    {message ? <div className="border border-[var(--n3-line)] p-4 text-sm">{message}</div> : null}
    <section><h2 className="mb-3 text-lg font-semibold">Últimas importaciones</h2><div className="overflow-x-auto border border-[var(--n3-line)]"><table className="min-w-[800px] w-full text-sm"><thead><tr>{['Fuente','Período','Estado','Recibidas','Insertadas','Fecha'].map((item) => <th key={item} className="p-3 text-left text-xs uppercase text-[var(--n3-text-muted)]">{item}</th>)}</tr></thead><tbody>{runs.map((run) => <tr key={run.id} className="border-t border-[var(--n3-line)]"><td className="p-3">{run.source_name}</td><td className="p-3">{run.period_start} — {run.period_end}</td><td className="p-3">{run.status}</td><td className="p-3">{run.rows_received}</td><td className="p-3">{run.rows_inserted}</td><td className="p-3">{new Date(run.created_at).toLocaleString('es-CL')}</td></tr>)}</tbody></table></div></section>
    <section><h2 className="mb-3 text-lg font-semibold">Historial de reportes</h2><div className="space-y-2">{reports.map((report) => <div key={report.id} className="flex flex-wrap justify-between gap-3 border border-[var(--n3-line)] p-4 text-sm"><span>{report.report_type} · {report.period_start} — {report.period_end}</span><span className="text-[var(--n3-text-muted)]">{report.status} · {new Date(report.generated_at).toLocaleString('es-CL')}</span></div>)}</div></section>
  </div>
}
