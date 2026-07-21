'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, FunnelChart, Funnel, Cell } from 'recharts'
import { Target } from 'lucide-react'
import { buildOperationalSeries, getOperationalSummary } from '@/lib/crm-snapshot'
import { getBranchTargetPerformance, getTargetSource } from '@/lib/targets-2026'

interface KPISnapshot {
  period_date: string
  ventas_count: number
  monthly_target: number
  velocidad_venta: number
  conversion_rate: number
}

interface AiReport {
  report_type: string
  title: string
  created_at: string
}

interface WeeklyReport {
  report_scope: string
  generated_at: string
}

const COLORS = ['var(--n3-teal)', '#6b7280', 'var(--n3-teal)', '#f59e0b']

export default function ControlPage() {
  const [kpis, setKpis] = useState<KPISnapshot[]>([])
  const [aiReports, setAiReports] = useState<AiReport[]>([])
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([])
  const [loading, setLoading] = useState(true)

  const reportFreshness = useMemo(() => {
    const pickLatest = (types: string[]) => {
      const latest = aiReports
        .filter((report) => types.includes(report.report_type))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

      if (!latest) return { title: 'Sin reporte', ageHours: null as number | null, source: 'n/d' }

      const ageHours = (Date.now() - new Date(latest.created_at).getTime()) / 3600000
      return { title: latest.title, ageHours, source: 'AI' }
    }

    const latestWeekly = weeklyReports
      .slice()
      .sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime())[0]

    const weeklyAgeHours = latestWeekly ? (Date.now() - new Date(latestWeekly.generated_at).getTime()) / 3600000 : null

    return {
      ceo: pickLatest(['ceo_brief', 'monthly_ceo']),
      director: pickLatest(['director_accounts', 'weekly_directors']),
      seller: pickLatest(['seller_playbook', 'captation_alert']),
      weekly: {
        title: latestWeekly?.report_scope || 'Sin weekly',
        ageHours: weeklyAgeHours,
      },
    }
  }, [aiReports, weeklyReports])

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        const supabase = createClient()
        const [kpiRes, aiRes, weeklyRes] = await Promise.all([
          supabase.from('kpi_snapshots').select('*').order('period_date', { ascending: false }).limit(12),
          supabase
            .from('ai_reports')
            .select('report_type,title,created_at')
            .order('created_at', { ascending: false })
            .limit(20),
          supabase
            .from('weekly_reports')
            .select('report_scope,generated_at')
            .order('generated_at', { ascending: false })
            .limit(12),
        ])

        setKpis((kpiRes.data || []).reverse())
        setAiReports((aiRes.data || []) as AiReport[])
        setWeeklyReports((weeklyRes.data || []) as WeeklyReport[])
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchKPIs()
  }, [])

  const operational = getOperationalSummary()
  const targets = getTargetSource()
  const fallbackKpis = buildOperationalSeries(6).map((month) => ({
    period_date: month.period_date,
    ventas_count: month.ventas,
    monthly_target: targets.companyMonthlyTargets.sales_count[month.period_date.slice(0, 7) as keyof typeof targets.companyMonthlyTargets.sales_count] ?? 0,
    velocidad_venta: 0,
    conversion_rate: month.conversion,
  }))
  const chartKpis = kpis.length > 0 ? kpis : fallbackKpis
  const branchPerformance = getBranchTargetPerformance('2026-06').map((branch) => {
    const sales = branch.metrics.find((metric) => metric.metric === 'sales_count')!
    return { name: branch.branch, target: sales.target, actual: sales.actual, compliance: sales.compliance }
  })
  const activityData = [
    { name: 'Leads nuevos', value: operational.leads },
    { name: 'Requerimientos', value: operational.requirements },
    { name: 'Visitas agendadas', value: operational.visits ?? 0 },
    { name: 'Cierres', value: operational.sales },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando datos...</p>
        </div>
      </div>
    )
  }

  const measuredPerformance = chartKpis.filter((item) => item.monthly_target > 0)
  const avgPerformance = measuredPerformance.length ? (measuredPerformance.reduce((sum, item) => sum + item.ventas_count / item.monthly_target, 0) / measuredPerformance.length * 100).toFixed(0) : 'n/d'
  const measuredVelocity = kpis.filter((item) => item.velocidad_venta > 0)
  const avgVelocity = measuredVelocity.length ? (measuredVelocity.reduce((sum, item) => sum + item.velocidad_venta, 0) / measuredVelocity.length).toFixed(1) : 'n/d'

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900">Control de Gestión</h1>
        <p className="text-sm text-gray-600 mt-2">Monitoreo de objetivos por sucursal y actividad comercial real</p>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4" style={{ border: '1px solid #e5e7eb' }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Desempeno promedio</p>
          <p className="text-3xl font-bold mt-3" style={{ color: 'var(--n3-teal)' }}>{avgPerformance}%</p>
          <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Cumplimiento vs objetivo</p>
        </div>
        <div className="bg-white rounded-lg p-4" style={{ border: '1px solid #e5e7eb' }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Velocidad Promedio</p>
          <p className="text-3xl font-bold mt-3" style={{ color: '#6b7280' }}>{avgVelocity}</p>
          <p className="text-xs mt-1" style={{ color: '#6b7280' }}>dias promedio de venta</p>
        </div>
        <div className="bg-white rounded-lg p-4" style={{ border: '1px solid #e5e7eb' }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Sucursales</p>
          <p className="text-3xl font-bold mt-3" style={{ color: 'var(--n3-teal)' }}>{branchPerformance.length}</p>
          <p className="text-xs mt-1" style={{ color: '#6b7280' }}>sucursales con metas fuente</p>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm" style={{ borderColor: '#e5e7eb' }}>
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>Frescura de reportes</p>
            <h2 className="mt-1 text-lg font-semibold text-gray-900">CEO, director y vendedor</h2>
          </div>
          <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: '#f9fafb', color: '#111111', border: '1px solid #e5e7eb' }}>
            {weeklyReports.length} weekly snapshots
          </span>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {([
            ['ceo', 'CEO', reportFreshness.ceo],
            ['director', 'Director', reportFreshness.director],
            ['seller', 'Vendedor', reportFreshness.seller],
          ] as const).map(([key, label, report]) => (
            <div key={key} className="rounded-xl border p-4" style={{ borderColor: '#e5e7eb', background: '#f9fafb' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>{label}</p>
              <p className="mt-2 text-lg font-semibold text-gray-900">{report.title}</p>
              <p className="mt-2 text-sm" style={{ color: '#6b7280' }}>
                {report.ageHours === null ? 'Sin reporte registrado' : report.ageHours < 24 ? 'Actualizado hoy' : `${Math.round(report.ageHours / 24)} dias de antiguedad`}
              </p>
            </div>
          ))}
          <div className="rounded-xl border p-4" style={{ borderColor: '#e5e7eb', background: '#f9fafb' }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>Weekly base</p>
            <p className="mt-2 text-lg font-semibold text-gray-900">{reportFreshness.weekly.title}</p>
            <p className="mt-2 text-sm" style={{ color: '#6b7280' }}>
              {reportFreshness.weekly.ageHours === null ? 'Sin weekly persistido' : `${Math.round(reportFreshness.weekly.ageHours)} horas desde la ultima corrida`}
            </p>
          </div>
        </div>
      </div>

      {/* Branch performance from CRM and target workbooks */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Cumplimiento de cierres por sucursal · Junio</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {branchPerformance.map(branch => {
            const achievement = branch.compliance
            const onTrack = achievement !== null && achievement >= 100
            return (
              <div key={branch.name} className="bg-white rounded-lg p-5" style={{ border: '1px solid #e5e7eb' }}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold text-gray-900">{branch.name}</p>
                    <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Sucursal · CRM vs libro de metas</p>
                  </div>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: onTrack ? '#f9fafb' : '#fef3f2' }}>
                    <Target className="w-4 h-4" style={{ color: onTrack ? 'var(--n3-teal)' : '#d97706' }} />
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs uppercase font-semibold mb-1" style={{ color: '#374151' }}>Ventas Mes</p>
                    <p className="text-2xl font-bold text-gray-900">{branch.actual ?? 'n/d'}/{branch.target ?? 'n/d'}</p>
                    <div className="w-full rounded-full h-1.5 mt-2" style={{ background: '#e5e7eb' }}>
                      <div className="h-1.5 rounded-full" style={{ background: onTrack ? 'var(--n3-teal)' : '#f59e0b', width: `${Math.min(achievement ?? 0, 100)}%` }}></div>
                    </div>
                    <p className="text-xs mt-1" style={{ color: '#6b7280' }}>{achievement === null ? 'Atribución CRM no disponible' : `${achievement}% del target`}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #e5e7eb' }}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ventas vs Objetivo (12 meses)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartKpis}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="period_date" stroke="#6b7280" tick={{ fontSize: 12 }} />
              <YAxis stroke="#6b7280" />
              <Tooltip contentStyle={{ background: '#fbfbfa', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Legend />
              <Bar dataKey="ventas_count" fill="var(--n3-teal)" name="Ventas Reales" />
              <Bar dataKey="monthly_target" fill="#e5e7eb" name="Objetivo" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #e5e7eb' }}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversión (Tendencia)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartKpis}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="period_date" stroke="#6b7280" tick={{ fontSize: 12 }} />
              <YAxis stroke="#6b7280" />
              <Tooltip contentStyle={{ background: '#fbfbfa', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="conversion_rate" stroke="#6b7280" strokeWidth={2} name="Conversión %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Operational activity. These stages are not presented as a causal cohort funnel. */}
      <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #e5e7eb' }}>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Actividad operacional del último corte</h3>
        <p className="mb-4 text-xs text-gray-500">Conteos independientes; no representan conversión de cohorte.</p>
        <ResponsiveContainer width="100%" height={250}>
          <FunnelChart>
            <Tooltip contentStyle={{ background: '#fbfbfa', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
            <Funnel dataKey="value" data={activityData} fill="var(--n3-teal)">
              {activityData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}



