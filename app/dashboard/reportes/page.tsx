'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Calendar, FileText, RefreshCw, Sparkles, TriangleAlert, Users } from 'lucide-react'
import { useRealtimeQuery } from '@/lib/hooks/use-realtime-query'
import type { AiReport, Profile } from '@/lib/types'
import { buildWhatsAppWebUrl } from '@/lib/whatsapp-web'
import { PP_AGENTS, PP_AUDIENCES, PP_NAME, PP_STEPS } from '@/lib/pp-agent'

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
  history?: Array<{
    id: number
    report_scope: string
    week_start: string
    week_end: string
    director_id: string | null
    status: string
    generated_at: string
  }>
  generatedAt: string
}

type ReportTypeChoice =
  | 'ceo_brief'
  | 'director_accounts'
  | 'seller_playbook'
  | 'weekly_directors'
  | 'monthly_ceo'
  | 'market_brief'
  | 'captation_alert'

type ReportChoice = {
  id: ReportTypeChoice
  label: string
  description: string
}

type ReportTypeKey = ReportTypeChoice | 'weekly_executive' | 'monthly_executive' | 'market'

type ReportGenerateContext = {
  director_id?: string | null
  team?: string | null
  seller_id?: string | null
}

const PRO_REPORT_CHOICES: ReportChoice[] = [
  {
    id: 'ceo_brief',
    label: 'CEO',
    description: 'Sintesis ejecutiva para decisiones, riesgos y crecimiento.',
  },
  {
    id: 'director_accounts',
    label: 'Directores de venta',
    description: 'Cartera, metas, conversion y acciones de seguimiento.',
  },
  {
    id: 'seller_playbook',
    label: 'Ejecutivos de venta',
    description: 'Playbook diario para priorizar cierres y seguimiento.',
  },
]

const SUPPORT_REPORT_CHOICES: ReportChoice[] = [
  {
    id: 'market_brief',
    label: 'Lectura de mercado',
    description: 'Barrios, absorcion e inventario con lectura comercial.',
  },
  {
    id: 'captation_alert',
    label: 'Alerta de captacion',
    description: 'Casas con oportunidad inmediata para activar.',
  },
]

const REPORT_TYPE_LABELS: Record<ReportTypeKey, string> = {
  ceo_brief: 'CEO',
  director_accounts: 'Directores de venta',
  seller_playbook: 'Ejecutivos de venta',
  weekly_directors: 'Semanal directores',
  monthly_ceo: 'Mensual CEO',
  market_brief: 'Lectura de mercado',
  captation_alert: 'Alerta de captacion',
  weekly_executive: 'Ejecutivo semanal',
  monthly_executive: 'Ejecutivo mensual',
  market: 'Mercado',
}

type AudienceGroupKey = 'ceo' | 'director' | 'seller'

type AudienceGroup = {
  key: AudienceGroupKey
  title: string
  description: string
  reportTypes: ReportTypeChoice[]
  accent: string
}

const AUDIENCE_GROUPS: AudienceGroup[] = [
  {
    key: 'ceo',
    title: 'CEO',
    description: 'Ve negocio total, ranking de directores, brechas y foco por barrio.',
    reportTypes: ['ceo_brief', 'monthly_ceo'],
    accent: 'var(--n-primary)',
  },
  {
    key: 'director',
    title: 'Directores de venta',
    description: 'Ve el desempeno del equipo, la cartera y el foco de gestion comercial.',
    reportTypes: ['director_accounts', 'weekly_directors'],
    accent: 'var(--n-success)',
  },
  {
    key: 'seller',
    title: 'Ejecutivos de venta',
    description: 'Ve prioridades diarias, propiedades activas y seguimiento comercial.',
    reportTypes: ['seller_playbook', 'captation_alert'],
    accent: 'var(--n-warning)',
  },
]
type ExportDataset = 'ai_reports' | 'weekly_reports' | 'profiles'

type ScrapeHealthIssue = {
  severity: 'info' | 'warning' | 'critical'
  title: string
  detail: string
}

type OperationalAnomaly = ScrapeHealthIssue & {
  area: 'kpi' | 'market' | 'health'
}

type ScrapeHealthSnapshot = {
  status: 'healthy' | 'warning' | 'critical' | 'unknown'
  summary: {
    recentRuns: number
    averageScraped: number
    averageInserted: number
    activeSources: number
    criticalCount: number
    warningCount: number
    successRate: number
    staleSourceCount: number
  }
}

type ScrapeHealthResponse = {
  status: ScrapeHealthSnapshot['status']
  summary: ScrapeHealthSnapshot['summary']
  anomalies: OperationalAnomaly[]
}

function formatDate(value: string | null) {
  if (!value) return 'Sin fecha'
  return new Date(value).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatReportTypeLabel(reportType: string) {
  return REPORT_TYPE_LABELS[reportType as ReportTypeChoice] || reportType
}

function statusTone(status: WeeklyReport['status']) {
  if (status === 'on_track') return { bg: 'var(--n-success-muted)', fg: 'var(--n-success)' }
  if (status === 'warning') return { bg: 'var(--n-warning-muted)', fg: 'var(--n-warning)' }
  return { bg: 'var(--n-danger-muted)', fg: 'var(--n-danger)' }
}

function getAudienceLabel(report: AiReport | null) {
  if (!report) return 'Reporte'
  const content = report.content as Record<string, unknown> | null
  const audience = content && typeof content.audience === 'string' ? content.audience : ''
  return audience || formatReportTypeLabel(report.report_type)
}

function getAudienceKey(report: AiReport | null): AudienceGroupKey {
  if (!report) return 'director'
  const content = report.content as Record<string, unknown> | null
  const requested = content && typeof content.requested_report_type === 'string' ? content.requested_report_type : ''
  const audience = content && typeof content.audience === 'string' ? content.audience : ''
  const hint = `${requested} ${audience} ${report.report_type}`.toLowerCase()

  if (hint.includes('ceo')) return 'ceo'
  if (hint.includes('seller') || hint.includes('vendedor') || hint.includes('ejecutivo')) return 'seller'
  if (hint.includes('market') || hint.includes('captation') || hint.includes('captacion')) return 'seller'
  return 'director'
}

export default function ReportesPage() {
  const [weekly, setWeekly] = useState<WeeklyReportResponse | null>(null)
  const [weeklyLoading, setWeeklyLoading] = useState(true)
  const [weeklyRefreshing, setWeeklyRefreshing] = useState(false)
  const [weeklyError, setWeeklyError] = useState<string | null>(null)
  const [generateLoading, setGenerateLoading] = useState<ReportTypeChoice | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [generatedReport, setGeneratedReport] = useState<AiReport | null>(null)
  const [reportFilter, setReportFilter] = useState<string>('')
  const [exportDataset, setExportDataset] = useState<ExportDataset>('ai_reports')
  const [exportWeekStart, setExportWeekStart] = useState('')
  const [exportDirectorId, setExportDirectorId] = useState('')
  const [exportWeeklyType, setExportWeeklyType] = useState('')
  const [exportProfileRole, setExportProfileRole] = useState('seller')
  const [exportProfileTeam, setExportProfileTeam] = useState('')
  const [exportFromDate, setExportFromDate] = useState('')
  const [exportToDate, setExportToDate] = useState('')
  const [reportDirectorId, setReportDirectorId] = useState('')
  const [reportSellerId, setReportSellerId] = useState('')
  const [reportTeam, setReportTeam] = useState('')
  const [health, setHealth] = useState<ScrapeHealthSnapshot | null>(null)
  const [healthAnomalies, setHealthAnomalies] = useState<OperationalAnomaly[]>([])
  const [healthLoading, setHealthLoading] = useState(true)
  const [healthRefreshing, setHealthRefreshing] = useState(false)
  const [healthError, setHealthError] = useState<string | null>(null)
  const whatsappPhone = process.env.NEXT_PUBLIC_REPORT_WHATSAPP_PHONE || ''

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

  const {
    data: profiles,
    loading: profilesLoading,
    error: profilesError,
  } = useRealtimeQuery<Profile>(
    async (supabase) => {
      const { data, error: queryError } = await supabase
        .from('profiles')
        .select('id, full_name, role, team, avatar_url, created_at')
        .order('full_name', { ascending: true })
        .limit(200)

      if (queryError) throw queryError
      return data || []
    },
    { table: 'profiles', refreshIntervalMs: 10 * 60 * 1000 },
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

  const refreshWeekly = async () => {
    try {
      setWeeklyRefreshing(true)
      setWeeklyError(null)
      const response = await fetch('/api/reports/weekly', { cache: 'no-store' })
      if (!response.ok) throw new Error('No pudimos generar los reportes semanales.')
      const data = (await response.json()) as WeeklyReportResponse
      setWeekly(data)
    } catch (err) {
      setWeeklyError(err instanceof Error ? err.message : 'No pudimos generar los reportes semanales.')
    } finally {
      setWeeklyRefreshing(false)
    }
  }

  useEffect(() => {
    let active = true

    const loadHealth = async () => {
      try {
        setHealthLoading(true)
        const response = await fetch('/api/scrape/health', { cache: 'no-store' })
        if (!response.ok) throw new Error('No pudimos cargar la salud del scraper.')
        const data = (await response.json()) as ScrapeHealthResponse
        if (!active) return
        setHealth(data)
        setHealthAnomalies(data.anomalies || [])
        setHealthError(null)
      } catch (err) {
        if (active) {
          setHealthError(err instanceof Error ? err.message : 'No pudimos cargar la salud del scraper.')
        }
      } finally {
        if (active) setHealthLoading(false)
      }
    }

    void loadHealth()

    return () => {
      active = false
    }
  }, [])

  const refreshHealth = async () => {
    try {
      setHealthRefreshing(true)
      setHealthError(null)
      const response = await fetch('/api/scrape/health', { cache: 'no-store' })
      if (!response.ok) throw new Error('No pudimos cargar la salud del scraper.')
      const data = (await response.json()) as ScrapeHealthResponse
      setHealth(data)
      setHealthAnomalies(data.anomalies || [])
    } catch (err) {
      setHealthError(err instanceof Error ? err.message : 'No pudimos cargar la salud del scraper.')
    } finally {
      setHealthRefreshing(false)
    }
  }

  useEffect(() => {
    if (!reportDirectorId) {
      const defaultDirector = profiles.find((profile) => profile.role === 'director')
      if (defaultDirector) setReportDirectorId(defaultDirector.id)
    }
    if (!reportSellerId) {
      const defaultSeller = profiles.find((profile) => profile.role === 'seller')
      if (defaultSeller) setReportSellerId(defaultSeller.id)
    }
    if (!reportTeam) {
      const defaultTeam = profiles.find((profile) => profile.team)?.team || ''
      if (defaultTeam) setReportTeam(defaultTeam)
    }
  }, [profiles, reportDirectorId, reportSellerId, reportTeam])

  const directorProfiles = useMemo(() => profiles.filter((profile) => profile.role === 'director'), [profiles])
  const sellerProfiles = useMemo(() => profiles.filter((profile) => profile.role === 'seller'), [profiles])
  const teamOptions = useMemo(
    () =>
      [...new Set(profiles.map((profile) => profile.team).filter((team): team is string => Boolean(team && team.trim())))]
        .sort((a, b) => a.localeCompare(b)),
    [profiles],
  )

  const resolveGenerateContext = (reportType: ReportTypeChoice): ReportGenerateContext => {
    const selectedDirector = directorProfiles.find((profile) => profile.id === reportDirectorId) || null
    const selectedSeller = sellerProfiles.find((profile) => profile.id === reportSellerId) || null

    if (reportType === 'ceo_brief') {
      return {
        director_id: selectedDirector?.id || directorProfiles[0]?.id || null,
        team: reportTeam || selectedDirector?.team || null,
      }
    }

    if (reportType === 'director_accounts' || reportType === 'weekly_directors' || reportType === 'monthly_ceo') {
      return {
        director_id: selectedDirector?.id || directorProfiles[0]?.id || null,
        team: reportTeam || selectedDirector?.team || null,
      }
    }

    if (reportType === 'seller_playbook') {
      return {
        seller_id: selectedSeller?.id || sellerProfiles[0]?.id || null,
        team: reportTeam || selectedSeller?.team || selectedDirector?.team || null,
      }
    }

    return {
      team: reportTeam || selectedDirector?.team || selectedSeller?.team || null,
    }
  }

  const handleGenerateReport = async (reportType: ReportTypeChoice) => {
    try {
      setGenerateLoading(reportType)
      setGenerateError(null)
      const context = resolveGenerateContext(reportType)
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_type: reportType, ...context }),
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

  const isInitialLoading = weeklyLoading && aiLoading && healthLoading
  const isAnyBusy = weeklyLoading || aiLoading || healthLoading || weeklyRefreshing || healthRefreshing || Boolean(generateLoading)

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

  const filteredAiReports = useMemo(() => {
    if (!reportFilter) return aiReports
    return aiReports.filter((report) => {
      if (report.report_type === reportFilter) return true
      const content = report.content as Record<string, unknown> | null
      return content?.requested_report_type === reportFilter
    })
  }, [aiReports, reportFilter])

  const reportsByAudience = useMemo(() => {
    return AUDIENCE_GROUPS.reduce<Record<AudienceGroupKey, AiReport[]>>(
      (acc, group) => {
        acc[group.key] = aiReports.filter((report) => getAudienceKey(report) === group.key)
        return acc
      },
      { ceo: [], director: [], seller: [] },
    )
  }, [aiReports])

  const exportBaseUrl = useMemo(() => {
    const params = new URLSearchParams()
    params.set('dataset', exportDataset)

    if (exportDataset === 'ai_reports' && reportFilter) {
      params.set('type', reportFilter)
    }

    if (exportDataset === 'ai_reports' || exportDataset === 'weekly_reports') {
      if (exportFromDate) params.set('from', exportFromDate)
      if (exportToDate) params.set('to', exportToDate)
    }

    if (exportDataset === 'weekly_reports') {
      if (exportWeekStart) params.set('week_start', exportWeekStart)
      if (exportDirectorId) params.set('director_id', exportDirectorId)
      if (exportWeeklyType) params.set('report_scope', exportWeeklyType)
      if (!exportWeeklyType) params.set('report_scope', exportDirectorId ? 'director' : 'weekly_summary')
    }

    if (exportDataset === 'profiles') {
      if (exportProfileRole) params.set('role', exportProfileRole)
      if (exportProfileTeam) params.set('team', exportProfileTeam)
    }

    return `/api/reports/export${params.toString() ? `?${params.toString()}` : ''}`
  }, [exportDataset, exportDirectorId, exportFromDate, exportProfileRole, exportProfileTeam, exportToDate, exportWeeklyType, exportWeekStart, reportFilter])

  const generatedWhatsappUrl =
    whatsappPhone && generatedReport
      ? buildWhatsAppWebUrl(
          whatsappPhone,
          `${generatedReport.title}\n\n${generatedReport.summary || 'Sin resumen disponible'}`,
        )
      : null

  if (isInitialLoading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="space-y-2 animate-pulse">
          <div className="h-8 w-56 max-w-full rounded-xl bg-white/8" />
          <div className="h-4 w-96 max-w-full rounded-xl bg-white/6" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="n-card p-4 animate-pulse">
              <div className="h-3 w-24 rounded-full bg-white/8" />
              <div className="mt-4 h-8 w-20 rounded-xl bg-white/8" />
            </div>
          ))}
        </div>
        <div className="n-card p-6 animate-pulse">
          <div className="h-5 w-48 rounded-full bg-white/8" />
          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 rounded-2xl bg-white/6" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6" aria-busy={isAnyBusy}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="n-chip">
            <FileText size={14} />
            Centro de reportes PP
          </span>
          {weekly?.generatedAt && (
            <span className="n-chip" style={{ background: 'var(--n-success-muted)', color: 'var(--n-success)' }}>
              Generado {new Date(weekly.generatedAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {lastUpdated && (
            <span className="n-chip">
              Sincronizacion AI {lastUpdated.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl" style={{ color: 'var(--n-fg)' }}>
              {PP_NAME} report center
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 md:text-[15px]" style={{ color: 'var(--n-fg-muted)' }}>
              Reportes comerciales para Vitacura: una lectura distinta para CEO, directores y ejecutivos, con insumos reales, fuente operativa y salida accionable.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void refreshAiReports()}
              className="n-button border w-full md:w-auto"
              style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface-2)', color: 'var(--n-fg-muted)' }}
              disabled={Boolean(generateLoading) || aiLoading}
              aria-disabled={Boolean(generateLoading) || aiLoading}
            >
              <RefreshCw size={14} className={aiLoading ? 'animate-spin' : ''} />
              {aiLoading ? 'Actualizando IA' : 'Refrescar IA'}
            </button>
            <button
              onClick={() => void refreshWeekly()}
              className="n-button border w-full md:w-auto"
              style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface-2)', color: 'var(--n-fg-muted)' }}
              disabled={weeklyRefreshing || weeklyLoading}
              aria-disabled={weeklyRefreshing || weeklyLoading}
            >
              <RefreshCw size={14} className={weeklyRefreshing ? 'animate-spin' : ''} />
              {weeklyRefreshing ? 'Refrescando semanal' : 'Refrescar semanal'}
            </button>
          </div>
        </div>
      </div>

      <div className="n-card p-6">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-semibold" style={{ color: 'var(--n-fg)' }}>
              Metodologia PP
            </h2>
            <p className="text-sm" style={{ color: 'var(--n-fg-muted)' }}>
              El sistema captura, limpia, deduplica, reporta y refresca datos para mantener una lectura viva del mercado.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {PP_STEPS.map((step) => (
            <div key={step.id} className="rounded-2xl border p-4" style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface-2)' }}>
              <p className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--n-fg-subtle)' }}>
                {step.title}
              </p>
              <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--n-fg)' }}>
                {step.output}
              </p>
              <p className="mt-2 text-sm leading-6" style={{ color: 'var(--n-fg-muted)' }}>
                {step.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--n-fg-subtle)' }}>
                Agentes PP
              </p>
              <p className="mt-1 text-sm" style={{ color: 'var(--n-fg-muted)' }}>
                Cada agente tiene una decision clara, señales propias y salidas distintas para no mezclar captura, dedupe, reportes y monitoreo.
              </p>
            </div>
            <span className="n-chip">5 agentes</span>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {PP_AGENTS.map((agent) => (
              <div key={agent.key} className="rounded-2xl border p-4" style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface-2)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--n-fg)' }}>
                  {agent.title}
                </p>
                <p className="mt-2 text-sm leading-6" style={{ color: 'var(--n-fg-muted)' }}>
                  {agent.mission}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="n-chip">Entradas {agent.inputs.length}</span>
                  <span className="n-chip">Senales {agent.signals.length}</span>
                  <span className="n-chip">Salidas {agent.outputs.length}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {agent.weights.slice(0, 2).map((weight) => (
                    <div key={weight.label} className="rounded-xl border bg-white p-2" style={{ borderColor: 'var(--n-border)' }}>
                      <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--n-fg-subtle)' }}>
                        {weight.label}
                      </p>
                      <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--n-fg)' }}>
                        {weight.value}%
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--n-fg-subtle)' }}>
                  Guardrails
                </p>
                <ul className="mt-2 space-y-1 text-sm leading-6" style={{ color: 'var(--n-fg-muted)' }}>
                  {agent.guardrails.map((guardrail) => (
                    <li key={guardrail}>- {guardrail}</li>
                  ))}
                </ul>
                <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--n-fg-subtle)' }}>
                  Respaldo / escalacion
                </p>
                <p className="mt-2 text-sm leading-6" style={{ color: 'var(--n-fg-muted)' }}>
                  {agent.fallbacks[0]}
                </p>
                <p className="mt-2 text-sm leading-6" style={{ color: 'var(--n-fg-muted)' }}>
                  {agent.escalations[0]?.trigger}
                </p>
                <p className="mt-1 text-sm leading-6" style={{ color: 'var(--n-fg-muted)' }}>
                  {agent.escalations[0]?.response}
                </p>
                <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--n-fg-subtle)' }}>
                  Foco por barrio
                </p>
                <p className="mt-2 text-sm leading-6" style={{ color: 'var(--n-fg-muted)' }}>
                  {agent.neighborhoodFocus.join(', ')}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          {PP_AUDIENCES.map((audience) => (
            <div key={audience.key} className="rounded-2xl border p-4" style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface)' }}>
              <p className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--n-fg-subtle)' }}>
                {audience.title}
              </p>
              <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--n-fg)' }}>
                {audience.decision}
              </p>
              <p className="mt-2 text-sm leading-6" style={{ color: 'var(--n-fg-muted)' }}>
                {audience.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mb-5 rounded-2xl border p-4" style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface-2)' }}>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--n-fg-subtle)' }}>
                Contexto comercial
              </p>
              <p className="mt-2 text-sm" style={{ color: 'var(--n-fg-muted)' }}>
                Define director, equipo y vendedor antes de generar. El reporte usa esa base para construir salidas distintas para cada audiencia.
              </p>
            </div>
            <span className="n-chip">
              {profilesLoading ? 'Cargando perfiles' : `${profiles.length} perfiles`}
            </span>
          </div>

          {profilesError ? (
            <p className="mt-3 text-sm" style={{ color: 'var(--n-warning)' }}>
              {profilesError}
            </p>
          ) : null}

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <select
              value={reportDirectorId}
              onChange={(e) => setReportDirectorId(e.target.value)}
              className="rounded-2xl border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface)', color: 'var(--n-fg)' }}
              disabled={profilesLoading || !directorProfiles.length}
            >
              <option value="">Director base</option>
              {directorProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.full_name || profile.id}
                  {profile.team ? ` - ${profile.team}` : ''}
                </option>
              ))}
            </select>

            <select
              value={reportTeam}
              onChange={(e) => setReportTeam(e.target.value)}
              className="rounded-2xl border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface)', color: 'var(--n-fg)' }}
              disabled={profilesLoading || !teamOptions.length}
            >
              <option value="">Equipo / zona</option>
              {teamOptions.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>

            <select
              value={reportSellerId}
              onChange={(e) => setReportSellerId(e.target.value)}
              className="rounded-2xl border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface)', color: 'var(--n-fg)' }}
              disabled={profilesLoading || !sellerProfiles.length}
            >
              <option value="">Vendedor base</option>
              {sellerProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.full_name || profile.id}
                  {profile.team ? ` - ${profile.team}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {AUDIENCE_GROUPS.map((group) => {
            const latestAudienceReport = reportsByAudience[group.key][0] || null

            return (
              <div key={group.key} className="rounded-3xl border p-4" style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface-2)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--n-fg-subtle)' }}>
                      Audiencia
                    </p>
                    <h3 className="mt-2 text-lg font-semibold" style={{ color: 'var(--n-fg)' }}>
                      {group.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6" style={{ color: 'var(--n-fg-muted)' }}>
                      {group.description}
                    </p>
                  </div>
                  <span className="n-chip" style={{ background: 'var(--n-surface)', color: group.accent }}>
                    {reportsByAudience[group.key].length}
                  </span>
                </div>

                <div className="mt-4 rounded-2xl border p-3" style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface)' }}>
                  <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--n-fg-subtle)' }}>
                    Ultimo reporte
                  </p>
                  {latestAudienceReport ? (
                    <>
                      <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--n-fg)' }}>
                        {latestAudienceReport.title}
                      </p>
                      <p className="mt-1 text-sm leading-6" style={{ color: 'var(--n-fg-muted)' }}>
                        {latestAudienceReport.summary || 'Sin resumen disponible'}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm" style={{ color: 'var(--n-fg-muted)' }}>
                      Todavia no hay reportes para esta audiencia.
                    </p>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  {group.reportTypes.map((reportType) => (
                    <button
                      key={reportType}
                      onClick={() => void handleGenerateReport(reportType)}
                      className="flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all hover:translate-y-[-1px]"
                      style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface)', color: 'var(--n-fg)' }}
                      disabled={Boolean(generateLoading)}
                      aria-busy={generateLoading === reportType}
                      aria-disabled={Boolean(generateLoading)}
                    >
                      <div>
                        <p className="text-sm font-semibold">{formatReportTypeLabel(reportType)}</p>
                        <p className="mt-1 text-xs leading-5" style={{ color: 'var(--n-fg-muted)' }}>
                          {REPORT_TYPE_LABELS[reportType] === 'CEO'
                            ? 'Sintesis ejecutiva con jerarquia y brechas.'
                            : REPORT_TYPE_LABELS[reportType] === 'Directores de venta'
                              ? 'Desempeno del equipo, foco y cartera.'
                              : 'Playbook comercial con priorizacion diaria.'}
                        </p>
                      </div>
                      {generateLoading === reportType ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <Sparkles size={14} style={{ color: group.accent }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--n-fg-subtle)' }}>
            Vistas complementarias
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {SUPPORT_REPORT_CHOICES.map((item) => (
              <button
                key={item.id}
                onClick={() => void handleGenerateReport(item.id)}
                className="rounded-2xl border p-4 text-left transition-all hover:translate-y-[-1px]"
                style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface)', color: 'var(--n-fg)' }}
                disabled={Boolean(generateLoading)}
                aria-busy={generateLoading === item.id}
                aria-disabled={Boolean(generateLoading)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--n-fg-subtle)' }}>
                      Generar
                    </p>
                    <p className="mt-2 text-sm font-semibold">{item.label}</p>
                    <p className="mt-1 text-xs leading-5" style={{ color: 'var(--n-fg-muted)' }}>
                      {item.description}
                    </p>
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
        </div>

        {weekly?.history?.length ? (
          <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface-2)' }}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--n-fg-subtle)' }}>
                  Historial persistido
                </p>
                <h3 className="mt-2 text-sm font-semibold" style={{ color: 'var(--n-fg)' }}>
                  Reportes semanales guardados en `weekly_reports`
                </h3>
              </div>
              <span className="n-chip">{weekly.history.length} instantaneas</span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
              {weekly.history.slice(0, 3).map((item) => (
                <div key={item.id} className="rounded-2xl border p-3" style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface)' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--n-fg)' }}>
                    {item.report_scope}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--n-fg-muted)' }}>
                    {formatDate(item.week_start)} - {formatDate(item.week_end)}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--n-fg-subtle)' }}>
                    {item.director_id || 'all'} · {item.status} · {new Date(item.generated_at).toLocaleDateString('es-CL')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {generateError && (
          <div className="mt-4 rounded-2xl border-l-4 p-4" style={{ borderLeftColor: 'var(--n-warning)', background: 'var(--n-surface-2)' }} aria-live="polite">
            <p className="text-sm" style={{ color: 'var(--n-fg)' }}>
              {generateError}
            </p>
          </div>
        )}
        {generatedReport && (
          <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface-2)' }} aria-live="polite">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--n-fg-subtle)' }}>
                  Ultimo reporte generado
                </p>
                <h3 className="mt-2 text-lg font-semibold" style={{ color: 'var(--n-fg)' }}>
                  {generatedReport.title}
                </h3>
                <p className="mt-1 text-sm" style={{ color: 'var(--n-fg-muted)' }}>
                  Perfil: {getAudienceLabel(generatedReport)}
                </p>
              </div>
              <span className="n-chip">{formatReportTypeLabel(generatedReport.report_type)}</span>
            </div>
            <p className="mt-3 text-sm leading-6" style={{ color: 'var(--n-fg-muted)' }}>
              {generatedReport.summary || 'Sin resumen disponible'}
            </p>
            {generatedWhatsappUrl && (
              <div className="mt-4">
                <a
                  href={generatedWhatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="n-button border w-full md:w-auto"
                  style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface)', color: 'var(--n-fg)' }}
                >
                  Abrir en WhatsApp Web
                </a>
              </div>
            )}
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
                  Mostramos la biblioteca historica mientras vuelve la fuente calculada.
                </p>
              </div>
            </div>
            <button onClick={() => void refreshWeekly()} className="n-button n-button-primary w-full md:w-auto">
              <RefreshCw size={14} className={weeklyRefreshing ? 'animate-spin' : ''} />
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
                  Conservamos el ultimo estado visible.
                </p>
              </div>
            </div>
            <button onClick={() => void refreshAiReports()} className="n-button n-button-primary w-full md:w-auto">
              <RefreshCw size={14} className={aiLoading ? 'animate-spin' : ''} />
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
            Directores activos
          </p>
          <p className="mt-3 text-3xl font-semibold" style={{ color: 'var(--n-success)' }}>
            {stats.directorCount}
          </p>
        </div>
        <div className="n-card p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--n-fg-subtle)' }}>
            Biblioteca de reportes
          </p>
          <p className="mt-3 text-3xl font-semibold" style={{ color: 'var(--n-accent)' }}>
            {stats.aiCount}
          </p>
        </div>
        <div className="n-card p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--n-fg-subtle)' }}>
            Ultima semana
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
              Ventas de la ultima semana
            </p>
            <p className="mt-3 text-3xl font-semibold" style={{ color: 'var(--n-primary)' }}>
              {stats.latestWeek.sales_count}
            </p>
          </div>
          <div className="n-card p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--n-fg-subtle)' }}>
              conversion promedio
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

      <div className="n-card p-6">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-semibold" style={{ color: 'var(--n-fg)' }}>
              Salud operativa de fuentes
            </h2>
            <p className="text-sm" style={{ color: 'var(--n-fg-muted)' }}>
              Cruza ejecuciones recientes, fuentes activas y anomalias detectadas para mantener vivo el ciclo PP.
            </p>
          </div>
          <span className="n-chip">{health?.status || 'desconocido'}</span>
        </div>

        {healthLoading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-16 rounded-2xl bg-white/6 animate-pulse" />
            ))}
          </div>
        ) : healthError ? (
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm" style={{ color: 'var(--n-warning)' }}>
              {healthError}
            </p>
            <button
              onClick={() => void refreshHealth()}
              className="n-button border w-full md:w-auto"
              style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface-2)', color: 'var(--n-fg-muted)' }}
              disabled={healthRefreshing}
              aria-disabled={healthRefreshing}
            >
              <RefreshCw size={14} className={healthRefreshing ? 'animate-spin' : ''} />
              Reintentar salud
            </button>
          </div>
        ) : health ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-4">
              {[
                ['Fuentes activas', health.summary.activeSources],
                ['Tasa de exito', `${health.summary.successRate}%`],
                ['Alertas criticas', health.summary.criticalCount],
                ['Alertas warning', health.summary.warningCount],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-2xl border p-3" style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface-2)' }}>
                  <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--n-fg-subtle)' }}>
                    {label}
                  </p>
                  <p className="mt-2 text-lg font-semibold" style={{ color: 'var(--n-fg)' }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {healthAnomalies.slice(0, 4).map((anomaly, index) => (
                <div key={`${anomaly.title}-${index}`} className="rounded-2xl border p-4" style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface-2)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--n-fg-subtle)' }}>
                        {anomaly.area}
                      </p>
                      <h3 className="mt-1 text-sm font-semibold" style={{ color: 'var(--n-fg)' }}>
                        {anomaly.title}
                      </h3>
                    </div>
                    <span className="n-chip">{anomaly.severity}</span>
                  </div>
                  <p className="mt-3 text-sm" style={{ color: 'var(--n-fg-muted)' }}>
                    {anomaly.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {weekly?.directors?.length ? (
        <div className="n-card p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold" style={{ color: 'var(--n-fg)' }}>
                Reportes por director
              </h2>
              <p className="text-sm" style={{ color: 'var(--n-fg-muted)' }}>
                Consolidado automatico por `director_id` usando los KPIs cargados
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
                        {report.sales_count} ventas, {report.conversion_rate.toFixed(1)}% conversion, +{report.velocity_change.toFixed(1)} velocidad
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: tone.bg, color: tone.fg }}>
                        {report.status === 'on_track' ? 'En linea' : report.status === 'warning' ? 'En observacion' : 'Bajo objetivo'}
                      </span>
                      <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: 'var(--n-primary-muted)', color: 'var(--n-primary)' }}>
                        {report.target_progress}% objetivo
                      </span>
                      {report.director_id && (
                        <Link
                          href={`/dashboard/reportes/${encodeURIComponent(report.director_id)}`}
                          className="rounded-full border px-3 py-1 text-xs font-medium"
                          style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface)', color: 'var(--n-fg-muted)' }}
                        >
                          Ver detalle
                        </Link>
                      )}
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
              Biblioteca PP
            </h2>
                <p className="text-sm" style={{ color: 'var(--n-fg-muted)' }}>
              Historial de reportes almacenados en `ai_reports` y listos para reutilizarse en nuevas entregas.
            </p>
          </div>
          <span className="n-chip">Supabase</span>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <select
            value={reportFilter}
            onChange={(e) => setReportFilter(e.target.value)}
            className="rounded-2xl border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface-2)', color: 'var(--n-fg)' }}
          >
            <option value="">Todos los reportes</option>
            <option value="ceo_brief">CEO</option>
            <option value="director_accounts">Directores de venta</option>
            <option value="seller_playbook">Ejecutivos de venta</option>
            <option value="weekly_directors">Semanal directores</option>
            <option value="monthly_ceo">Mensual CEO</option>
            <option value="market_brief">Lectura de mercado</option>
            <option value="captation_alert">Alerta de captacion</option>
          </select>
          {reportFilter && (
            <button
              type="button"
              onClick={() => setReportFilter('')}
              className="n-button border"
              style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface-2)', color: 'var(--n-fg-muted)' }}
            >
              Limpiar filtro
            </button>
          )}
        </div>

        <div className="mb-4 rounded-2xl border p-4" style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface-2)' }}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--n-fg-subtle)' }}>
                Exportaciones
              </p>
              <h3 className="mt-2 text-sm font-semibold" style={{ color: 'var(--n-fg)' }}>
                Variantes por biblioteca, reporte semanal y perfiles comerciales de PP
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
              <select
                value={exportDataset}
                onChange={(e) => setExportDataset(e.target.value as ExportDataset)}
                className="rounded-2xl border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface)', color: 'var(--n-fg)' }}
              >
                <option value="ai_reports">Biblioteca de reportes</option>
                <option value="weekly_reports">Reportes semanales</option>
                <option value="profiles">Perfiles comerciales</option>
              </select>

              {exportDataset === 'weekly_reports' && (
                <>
                  <select
                    value={exportWeekStart}
                    onChange={(e) => setExportWeekStart(e.target.value)}
                    className="rounded-2xl border px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface)', color: 'var(--n-fg)' }}
                  >
                    <option value="">Todas las semanas</option>
                    {weekly?.reports?.map((report) => (
                      <option key={report.week_start} value={report.week_start}>
                        {formatDate(report.week_start)} - {formatDate(report.week_end)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={exportDirectorId}
                    onChange={(e) => setExportDirectorId(e.target.value)}
                    className="rounded-2xl border px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface)', color: 'var(--n-fg)' }}
                  >
                    <option value="">Resumen general</option>
                    {weekly?.directors?.map((report) => (
                      <option key={report.director_id || 'all'} value={report.director_id || ''}>
                        {report.director_id || 'Sin director'}
                      </option>
                    ))}
                  </select>
                  <select
                    value={exportWeeklyType}
                    onChange={(e) => setExportWeeklyType(e.target.value)}
                    className="rounded-2xl border px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface)', color: 'var(--n-fg)' }}
                  >
                    <option value="">Todos los resumenes</option>
                    <option value="weekly_summary">Resumen semanal</option>
                    <option value="director">Resumen por director</option>
                  </select>
                </>
              )}

              {(exportDataset === 'ai_reports' || exportDataset === 'weekly_reports') && (
                <>
                  <input
                    type="date"
                    value={exportFromDate}
                    onChange={(e) => setExportFromDate(e.target.value)}
                    aria-label="Fecha inicial de exportacion"
                    className="rounded-2xl border px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface)', color: 'var(--n-fg)' }}
                  />
                  <input
                    type="date"
                    value={exportToDate}
                    onChange={(e) => setExportToDate(e.target.value)}
                    aria-label="Fecha final de exportacion"
                    className="rounded-2xl border px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface)', color: 'var(--n-fg)' }}
                  />
                </>
              )}

              {exportDataset === 'profiles' && (
                <>
                  <select
                    value={exportProfileRole}
                    onChange={(e) => setExportProfileRole(e.target.value)}
                    className="rounded-2xl border px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface)', color: 'var(--n-fg)' }}
                  >
                    <option value="">Todos los roles</option>
                    <option value="seller">Ejecutivo de venta</option>
                    <option value="director">Director de venta</option>
                    <option value="admin">Admin</option>
                    <option value="ceo">CEO</option>
                  </select>
                  <input
                    value={exportProfileTeam}
                    onChange={(e) => setExportProfileTeam(e.target.value)}
                    placeholder="Filtrar por equipo"
                    className="rounded-2xl border px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface)', color: 'var(--n-fg)' }}
                  />
                </>
              )}

              <a
                href={`${exportBaseUrl}${exportBaseUrl.includes('?') ? '&' : '?'}format=csv`}
                className="n-button border"
                style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface-2)', color: 'var(--n-fg-muted)' }}
              >
                Exportar CSV
              </a>
              <a
                href={`${exportBaseUrl}${exportBaseUrl.includes('?') ? '&' : '?'}format=json`}
                className="n-button border"
                style={{ borderColor: 'var(--n-border)', background: 'var(--n-surface-2)', color: 'var(--n-fg-muted)' }}
              >
                Exportar JSON
              </a>
            </div>
          </div>
        </div>

        {filteredAiReports.length ? (
          <div className="space-y-3">
            {filteredAiReports.map((report) => (
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
                      <span className="n-chip w-fit">{getAudienceLabel(report)}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--n-fg-subtle)' }}>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(report.period_date || report.created_at)}
                      </span>
                      <span>·</span>
                      <span>ID {report.id.slice(0, 8)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm" style={{ color: 'var(--n-fg-muted)' }}>
            Todavia no hay reportes guardados en `ai_reports`.
          </div>
        )}
      </div>
    </div>
  )
}




