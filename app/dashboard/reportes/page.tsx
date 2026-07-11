'use client'

import { useEffect, useMemo, useState } from 'react'
import { Calendar, FileText, RefreshCw, Sparkles, TriangleAlert, TrendingUp, Users } from 'lucide-react'
import { useRealtimeQuery } from '@/lib/hooks/use-realtime-query'
import type { AiReport } from '@/lib/types'

type WeeklyReport = {
  week_start: string
  week_end: string
  sales_count: number
  commission_total: number
  conversion_rate: number
  target_progress: number
  velocity_change: number
  director_id: string | null
  status: 'on_track' | 'warning' | 'behind'
}

type WeeklyReportResponse = {
  reports: WeeklyReport[]
  directors: WeeklyReport[]
  generatedAt: string
}

type ReportTypeChoice = 'weekly_directors' | 'monthly_ceo' | 'market_brief' | 'captation_alert'

function formatDate(value: string | null) {
  if (!value) return 'Sin fecha'
  return new Date(value).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function statusTone(status: WeeklyReport['status']) {
  if (status === 'on_track') return { bg: 'var(--n-success-muted)', fg: 'var(--n-success)' }
  if (status === 'warning') return { bg: 'var(--n-warning-muted)', fg: 'var(--n-warning)' }
  return { bg: 'var(--n-danger-muted)', fg: 'var(--n-danger)' }
}

export default function ReportesPage() {
  const [weekly, setWeekly] = useState<WeeklyReportResponse | null>(null)
  const [weeklyLoading, setWeeklyLoading] = useState(true)
  const [weeklyError, setWeeklyError] = useState<string | null>(null)
  const [generateLoading, setGenerateLoading] = useState<ReportTypeChoice | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [generatedReport, setGeneratedReport] = useState<AiReport | null>(null)

  const { data: aiReports, loading: aiLoading, error: aiError, lastUpdated, refresh: refreshAiReports } = useRealtimeQuery<AiReport>(
    async (supabase) => {
      const { data, error: queryError } = await supabase
        .from('ai_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (queryError) throw queryError
      return data || []
    },
    { table: 'ai_reports', refreshIntervalMs: 4 * 60 * 1000 },
  )

  useEffect(() => {
    let active = true

    const loadWeekly = async () => {
      try {
        setWeeklyLoading(true)
        const response = await fetch('/api/reports/weekly', { cache: 'no-store' })
        if (!response.ok) throw new Error('No pudimos generar los reportes semanales.')
        const data = (await response.json()) as WeeklyReportResponse
        if (active) {
          setWeekly(data)
          setWeeklyError(null)
        }
      } catch (err) {
        if (active) {
          setWeeklyError(err instanceof Error ? err.message : 'No pudimos generar los reportes semanales.')
        }
      } finally {
        if (active) setWeeklyLoading(false)
      }
    }

    void loadWeekly()

    return () => {
      active = false
    }
  }, [])

  const handleGenerateReport = async (reportType: ReportTypeChoice) => {
    try {
      setGenerateLoading(reportType)
      setGenerateError(null)
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_type: reportType }),
      })

      const data = (await response.json()) as {
        error?: string
        report?: AiReport
      }
      if (!response.ok || !data.report) {
        throw new Error(data.error || 'No pudimos generar el reporte.')
      }

      setGeneratedReport(data.report)
      await refreshAiReports()
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'No pudimos generar el reporte.')
    } finally {
      setGenerateLoading(null)
    }
  }

  const stats = useMemo(() => {
    const reports = weekly?.reports || []
    const directors = weekly?.directors || []
    return {
      weeklyCount: reports.length,
      directorCount: directors.length,
      latestWeek: reports[0] || null,
      topDirector: directors[0] || null,
      aiCount: aiReports.length,
    }
  }, [aiReports.length, weekly])

  if (weeklyLoading && aiLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="space-y-2">
          <div className="h-8 w-64 rounded-xl bg-white/8" />
          <div className="h-4 w-96 max-w-full rounded-xl bg-white/6" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="n-card p-4">
              <div className="h-3 w-24 rounded-full bg-white/8" />
              <div className="mt-4 h-8 w-20 rounded-xl bg-white/8" />
            </div>
          ))}
        </div>
        <div className="n-card p-6">
          <div className="h-5 w-48 rounded-full bg-white/8" />
          <div className="mt-6 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 rounded-2xl bg-white/6" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="n-chip">
            <FileText size={14} />
            Weekly reports
          </span>
          {weekly?.generatedAt && (
            <span className="n-chip" style={{ background: 'var(--n-success-muted)', color: 'var(--n-success)' }}>
              Generado {new Date(weekly.generatedAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {lastUpdated && (
            <span className="n-chip">
              AI sync {lastUpdated.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl" style={{ color: 'var(--n-fg)' }}>
              Reportes IA
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 md:text-[15px]" style={{ color: 'var(--n-fg-muted)' }}>
              Reportes semanales derivados de KPIs reales y biblioteca histórica de reportes automáticos.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void refreshAiReports()} className="n-button border" style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface-2)', color: 'var(--n-fg-muted)' }}>
              <RefreshCw size={14} />
              Refrescar AI
            </button>
            <button
              onClick={() => {
                void (async () => {
                  setWeeklyLoading(true)
                  const response = await fetch('/api/reports/weekly', { cache: 'no-store' })
                  const data = (await response.json()) as WeeklyReportResponse
                  setWeekly(data)
                  setWeeklyLoading(false)
                })()
              }}
              className="n-button border"
              style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface-2)', color: 'var(--n-fg-muted)' }}
            >
              <RefreshCw size={14} />
              Refrescar semanal
            </button>
          </div>
        </div>
      </div>

      <div className="n-card p-6">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-semibold" style={{ color: 'var(--n-fg)' }}>
              Generar reporte AI
            </h2>
            <p className="text-sm" style={{ color: 'var(--n-fg-muted)' }}>
              Usa `OPENAI_API_KEY` si está disponible. Si no, deja un reporte determinista con contexto real.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { id: 'weekly_directors', label: 'Semanal Directores' },
            { id: 'monthly_ceo', label: 'Mensual CEO' },
            { id: 'market_brief', label: 'Market Brief' },
            { id: 'captation_alert', label: 'Captation Alert' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => void handleGenerateReport(item.id as ReportTypeChoice)}
              className="rounded-2xl border p-4 text-left transition-all hover:translate-y-[-1px]"
              style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface-2)', color: 'var(--n-fg)' }}
              disabled={Boolean(generateLoading)}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--n-fg-subtle)' }}>
                    Generar
                  </p>
                  <p className="mt-2 text-sm font-semibold">{item.label}</p>
                </div>
                {generateLoading === item.id ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} style={{ color: 'var(--n-primary)' }} />
                )}
              </div>
            </button>
          ))}
        </div>

        {generateError && (
          <div className="mt-4 rounded-2xl border-l-4 p-4" style={{ borderLeftColor: 'var(--n-warning)', background: 'var(--n-surface-2)' }}>
            <p className="text-sm" style={{ color: 'var(--n-fg)' }}>
              {generateError}
            </p>
          </div>
        )}

        {generatedReport && (
          <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface-2)' }}>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--n-fg-subtle)' }}>
                  Último reporte generado
                </p>
                <h3 className="mt-2 text-lg font-semibold" style={{ color: 'var(--n-fg)' }}>
                  {generatedReport.title}
                </h3>
              </div>
              <span className="n-chip">{generatedReport.report_type}</span>
            </div>
            <p className="mt-3 text-sm leading-6" style={{ color: 'var(--n-fg-muted)' }}>
              {generatedReport.summary || 'Sin resumen disponible'}
            </p>
          </div>
        )}
      </div>

      {weeklyError && (
        <div className="n-card border-l-4 p-4" style={{ borderLeftColor: 'var(--n-warning)' }}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl p-2.5" style={{ background: 'var(--n-warning-muted)', color: 'var(--n-warning)' }}>
                <TriangleAlert className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium" style={{ color: 'var(--n-fg)' }}>
                  No pudimos actualizar los reportes semanales.
                </p>
                <p className="mt-1 text-sm" style={{ color: 'var(--n-fg-muted)' }}>
                  Mostramos la biblioteca histórica mientras vuelve la fuente calculada.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                void (async () => {
                  setWeeklyLoading(true)
                  const response = await fetch('/api/reports/weekly', { cache: 'no-store' })
                  const data = (await response.json()) as WeeklyReportResponse
                  setWeekly(data)
                  setWeeklyLoading(false)
                })()
              }}
              className="n-button n-button-primary"
            >
              <RefreshCw size={14} />
              Reintentar
            </button>
          </div>
        </div>
      )}

      {aiError && (
        <div className="n-card border-l-4 p-4" style={{ borderLeftColor: 'var(--n-warning)' }}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl p-2.5" style={{ background: 'var(--n-warning-muted)', color: 'var(--n-warning)' }}>
                <TriangleAlert className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium" style={{ color: 'var(--n-fg)' }}>
                  No pudimos actualizar la biblioteca AI.
                </p>
                <p className="mt-1 text-sm" style={{ color: 'var(--n-fg-muted)' }}>
                  Conservamos el último estado visible.
                </p>
              </div>
            </div>
            <button onClick={() => void refreshAiReports()} className="n-button n-button-primary">
              <RefreshCw size={14} />
              Reintentar AI
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="n-card p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--n-fg-subtle)' }}>
            Reportes semanales
          </p>
          <p className="mt-3 text-3xl font-semibold" style={{ color: 'var(--n-primary)' }}>
            {stats.weeklyCount}
          </p>
        </div>
        <div className="n-card p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--n-fg-subtle)' }}>
            Directorios activos
          </p>
          <p className="mt-3 text-3xl font-semibold" style={{ color: 'var(--n-success)' }}>
            {stats.directorCount}
          </p>
        </div>
        <div className="n-card p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--n-fg-subtle)' }}>
            Biblioteca AI
          </p>
          <p className="mt-3 text-3xl font-semibold" style={{ color: 'var(--n-accent)' }}>
            {stats.aiCount}
          </p>
        </div>
        <div className="n-card p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--n-fg-subtle)' }}>
            Última semana
          </p>
          <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--n-fg)' }}>
            {stats.latestWeek ? `${formatDate(stats.latestWeek.week_start)} - ${formatDate(stats.latestWeek.week_end)}` : 'Sin datos'}
          </p>
        </div>
      </div>

      {stats.latestWeek && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="n-card p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--n-fg-subtle)' }}>
              Ventas de la última semana
            </p>
            <p className="mt-3 text-3xl font-semibold" style={{ color: 'var(--n-primary)' }}>
              {stats.latestWeek.sales_count}
            </p>
          </div>
          <div className="n-card p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--n-fg-subtle)' }}>
              Conversión promedio
            </p>
            <p className="mt-3 text-3xl font-semibold" style={{ color: 'var(--n-success)' }}>
              {stats.latestWeek.conversion_rate.toFixed(1)}%
            </p>
          </div>
          <div className="n-card p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--n-fg-subtle)' }}>
              Cumplimiento objetivo
            </p>
            <p className="mt-3 text-3xl font-semibold" style={{ color: 'var(--n-warning)' }}>
              {stats.latestWeek.target_progress}%
            </p>
          </div>
        </div>
      )}

      {weekly?.directors?.length ? (
        <div className="n-card p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold" style={{ color: 'var(--n-fg)' }}>
                Reportes por director
              </h2>
              <p className="text-sm" style={{ color: 'var(--n-fg-muted)' }}>
                Consolidado automático por `director_id` usando los KPIs cargados
              </p>
            </div>
            <span className="n-chip">
              <Users size={14} />
              {weekly.directors.length} directores
            </span>
          </div>
          <div className="space-y-3">
            {weekly.directors.map((report, index) => {
              const tone = statusTone(report.status)
              return (
                <div key={`${report.director_id || 'director'}-${index}`} className="rounded-2xl border p-4" style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface-2)' }}>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--n-fg)' }}>
                        {report.director_id || 'Sin director asignado'}
                      </p>
                      <p className="mt-1 text-sm" style={{ color: 'var(--n-fg-muted)' }}>
                        {report.sales_count} ventas, {report.conversion_rate.toFixed(1)}% conversión, +{report.velocity_change.toFixed(1)} velocidad
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: tone.bg, color: tone.fg }}>
                        {report.status === 'on_track' ? 'En línea' : report.status === 'warning' ? 'En observación' : 'Bajo objetivo'}
                      </span>
                      <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: 'var(--n-primary-muted)', color: 'var(--n-primary)' }}>
                        {report.target_progress}% objetivo
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      <div className="n-card p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold" style={{ color: 'var(--n-fg)' }}>
              Biblioteca de reportes IA
            </h2>
            <p className="text-sm" style={{ color: 'var(--n-fg-muted)' }}>
              Histórico de reportes almacenados en `ai_reports`
            </p>
          </div>
          <span className="n-chip">Supabase</span>
        </div>

        {aiReports.length ? (
          <div className="space-y-3">
            {aiReports.map((report) => (
              <div key={report.id} className="n-card n-card-hover cursor-pointer p-4 transition-all">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ background: 'var(--n-primary-muted)' }}>
                    <FileText size={18} style={{ color: 'var(--n-primary)' }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="font-semibold" style={{ color: 'var(--n-fg)' }}>
                          {report.title}
                        </h3>
                        <p className="mt-1 text-xs" style={{ color: 'var(--n-fg-muted)' }}>
                          {report.summary || 'Sin resumen disponible'}
                        </p>
                      </div>
                      <span className="n-chip w-fit">{report.report_type}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--n-fg-subtle)' }}>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(report.period_date || report.created_at)}
                      </span>
                      <span>•</span>
                      <span>ID {report.id.slice(0, 8)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm" style={{ color: 'var(--n-fg-muted)' }}>
            Todavía no hay reportes guardados en `ai_reports`.
          </div>
        )}
      </div>
    </div>
  )
}
