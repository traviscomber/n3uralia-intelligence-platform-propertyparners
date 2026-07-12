import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadDirectorReportBundle } from '@/lib/director-reports'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function statusTone(status: string) {
  if (status === 'on_track') return { bg: '#dcfce7', fg: '#166534', label: 'En linea' }
  if (status === 'warning') return { bg: '#fef3c7', fg: '#92400e', label: 'En observacion' }
  return { bg: '#fee2e2', fg: '#991b1b', label: 'Bajo objetivo' }
}

export default async function DirectorReportDetailPage({
  params,
  searchParams,
}: {
  params: { directorId: string }
  searchParams?: { week_start?: string }
}) {
  const directorId = decodeURIComponent(params.directorId)
  const supabase = await createClient()
  const bundle = await loadDirectorReportBundle(supabase, directorId)
  const requestedWeekStart = searchParams?.week_start ? decodeURIComponent(searchParams.week_start) : null

  if (!bundle.latestReport && !bundle.reports.length) {
    notFound()
  }

  const selectedReport = requestedWeekStart
    ? bundle.reports.find((report) => report.week_start === requestedWeekStart) || bundle.latestReport
    : bundle.latestReport
  const selectedWeekStart = selectedReport?.week_start || null
  const pdfHref = selectedWeekStart
    ? `/api/reports/directors/${encodeURIComponent(directorId)}/pdf?week_start=${encodeURIComponent(selectedWeekStart)}`
    : `/api/reports/directors/${encodeURIComponent(directorId)}/pdf`
  const csvHref = selectedWeekStart
    ? `/api/reports/directors/${encodeURIComponent(directorId)}/export?week_start=${encodeURIComponent(selectedWeekStart)}&format=csv`
    : `/api/reports/directors/${encodeURIComponent(directorId)}/export?format=csv`
  const jsonHref = selectedWeekStart
    ? `/api/reports/directors/${encodeURIComponent(directorId)}/export?week_start=${encodeURIComponent(selectedWeekStart)}&format=json`
    : `/api/reports/directors/${encodeURIComponent(directorId)}/export?format=json`
  const weekOptions = bundle.reports
    .slice()
    .sort((a, b) => b.week_start.localeCompare(a.week_start))

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3">
            <Link href="/dashboard/reportes" className="text-sm font-medium" style={{ color: '#8fb2aa' }}>
              ← Volver a Reportes IA
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{directorId}</h1>
          <p className="mt-2 text-sm text-gray-600">
            Drill-down del director con historico persistido en `weekly_reports` y exportacion PDF.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {selectedReport && (
            <span className="inline-flex items-center rounded-lg px-3 py-2 text-xs font-medium" style={{ background: '#f5f9f7', color: '#555a56', border: '1px solid #d8e5e2' }}>
              Corte activo {formatDate(selectedReport.week_start)}
            </span>
          )}
          <a
            href={pdfHref}
            className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ background: '#8fb2aa' }}
          >
            Descargar PDF
          </a>
          <a
            href={csvHref}
            className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold"
            style={{ background: '#f5f9f7', color: '#555a56', border: '1px solid #d8e5e2' }}
          >
            CSV
          </a>
          <a
            href={jsonHref}
            className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold"
            style={{ background: '#f5f9f7', color: '#555a56', border: '1px solid #d8e5e2' }}
          >
            JSON
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Ventas acumuladas', value: bundle.metrics.totalSales.toLocaleString('es-CL') },
          { label: 'Comision total', value: `${bundle.metrics.totalCommission.toLocaleString('es-CL')} UF` },
          { label: 'Conversion promedio', value: `${bundle.metrics.avgConversion.toFixed(1)}%` },
          { label: 'Snapshots', value: bundle.metrics.reportCount.toString() },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-lg p-4 shadow-sm" style={{ border: '1px solid #d8e5e2' }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#555a56' }}>{item.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{item.value}</p>
          </div>
        ))}
      </div>

      {selectedReport && (
        <div className="bg-white rounded-lg p-6 shadow-sm" style={{ border: '1px solid #d8e5e2' }}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#555a56' }}>Corte seleccionado</p>
              <h2 className="mt-1 text-lg font-semibold text-gray-900">
                {formatDate(selectedReport.week_start)} - {formatDate(selectedReport.week_end)}
              </h2>
            </div>
            <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: statusTone(selectedReport.status).bg, color: statusTone(selectedReport.status).fg }}>
              {statusTone(selectedReport.status).label}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Ventas', value: selectedReport.sales_count.toLocaleString('es-CL') },
              { label: 'Conversion', value: `${selectedReport.conversion_rate.toFixed(1)}%` },
              { label: 'Objetivo', value: `${selectedReport.target_progress}%` },
              { label: 'Velocidad', value: `${selectedReport.velocity_change.toFixed(1)} dias` },
            ].map((item) => (
              <div key={item.label} className="rounded-lg p-3" style={{ background: '#f5f9f7', border: '1px solid #d8e5e2' }}>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#555a56' }}>{item.label}</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg bg-white p-6 shadow-sm" style={{ border: '1px solid #d8e5e2' }}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Seleccionar semana</h2>
            <p className="text-sm" style={{ color: '#9ca9a3' }}>
              Elige el corte a revisar y exporta ese snapshot exacto en PDF.
            </p>
          </div>
          <form method="get" className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="sr-only" htmlFor="week_start">Semana</label>
            <select
              id="week_start"
              name="week_start"
              defaultValue={selectedWeekStart || ''}
              className="w-full rounded-lg border px-3 py-2 text-sm sm:w-auto"
              style={{ borderColor: '#d8e5e2', background: '#f5f9f7', color: '#111827' }}
            >
              {weekOptions.map((report) => (
                <option key={report.week_start} value={report.week_start}>
                  {formatDate(report.week_start)} - {formatDate(report.week_end)}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ background: '#8fb2aa' }}
            >
              Ver corte
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="bg-white rounded-lg p-6 shadow-sm" style={{ border: '1px solid #d8e5e2' }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Historial semanal</h2>
              <p className="text-sm" style={{ color: '#9ca9a3' }}>Ultimos reportes persistidos para este director</p>
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ background: '#f5f9f7', color: '#555a56', border: '1px solid #d8e5e2' }}>
              {bundle.reports.length} items
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {bundle.reports.map((report) => {
              const tone = statusTone(report.status)
              const reportHref = `/api/reports/directors/${encodeURIComponent(directorId)}/pdf?week_start=${encodeURIComponent(report.week_start)}`
              return (
                <div
                  key={report.id}
                  className="rounded-lg p-4"
                  style={{
                    background: report.week_start === selectedWeekStart ? '#eef7f4' : '#f5f9f7',
                    border: `1px solid ${report.week_start === selectedWeekStart ? '#8fb2aa' : '#d8e5e2'}`,
                  }}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatDate(report.week_start)} - {formatDate(report.week_end)}
                      </p>
                      <p className="text-xs mt-1" style={{ color: '#555a56' }}>
                        {report.sales_count} ventas · {report.conversion_rate.toFixed(1)}% conversion · {report.target_progress}% objetivo
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: tone.bg, color: tone.fg }}>
                        {tone.label}
                      </span>
                      <Link
                        href={`/dashboard/reportes/${encodeURIComponent(directorId)}?week_start=${encodeURIComponent(report.week_start)}`}
                        className="rounded-md border px-3 py-1.5 text-xs font-medium"
                        style={{ borderColor: '#d8e5e2', background: '#fff', color: '#555a56' }}
                      >
                        Ver semana
                      </Link>
                      <a
                        href={reportHref}
                        className="rounded-md border px-3 py-1.5 text-xs font-medium"
                        style={{ borderColor: '#d8e5e2', background: '#fff', color: '#555a56' }}
                      >
                        PDF
                      </a>
                      <a
                        href={`/api/reports/directors/${encodeURIComponent(directorId)}/export?week_start=${encodeURIComponent(report.week_start)}&format=csv`}
                        className="rounded-md border px-3 py-1.5 text-xs font-medium"
                        style={{ borderColor: '#d8e5e2', background: '#fff', color: '#555a56' }}
                      >
                        CSV
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm" style={{ border: '1px solid #d8e5e2' }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Snapshots KPI</h2>
              <p className="text-sm" style={{ color: '#9ca9a3' }}>Base operativa usada para los reportes semanales</p>
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ background: '#f5f9f7', color: '#555a56', border: '1px solid #d8e5e2' }}>
              {bundle.kpis.length} snapshots
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {bundle.kpis.length ? bundle.kpis.map((kpi) => (
              <div key={kpi.period_date} className="rounded-lg p-4" style={{ background: '#f5f9f7', border: '1px solid #d8e5e2' }}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900">{formatDate(kpi.period_date)}</p>
                  <span className="text-xs" style={{ color: '#555a56' }}>{kpi.monthly_target ?? 0} target</span>
                </div>
                <p className="mt-1 text-xs" style={{ color: '#555a56' }}>
                  {kpi.ventas_count} ventas · {kpi.conversion_rate.toFixed(1)}% conversion · {kpi.velocidad_venta ?? 0} dias velocidad
                </p>
              </div>
            )) : (
              <p className="text-sm" style={{ color: '#9ca9a3' }}>No hay snapshots KPI para este director.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
