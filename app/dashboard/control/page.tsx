'use client'

import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, FunnelChart, Funnel, Cell } from 'recharts'
import { Target } from 'lucide-react'
import { buildOperationalSeries, CRM_INTELLIGENCE, getOperationalSummary } from '@/lib/crm-snapshot'
import { getBranchTargetPerformance, getTargetSource } from '@/lib/targets-2026'
import presentationsSummary from '@/data/presentations-2026-summary.json'

const COLORS = ['var(--n3-teal)', '#6b7280', 'var(--n3-teal)', '#f59e0b']

export default function ControlPage() {

  const operational = getOperationalSummary()
  const targets = getTargetSource()
  const chartKpis = buildOperationalSeries(6).map((month) => ({
    period_date: month.period_date,
    ventas_count: month.ventas,
    monthly_target: targets.companyMonthlyTargets.sales_count[month.period_date.slice(0, 7) as keyof typeof targets.companyMonthlyTargets.sales_count] ?? 0,
    velocidad_venta: 0,
    conversion_rate: month.conversion,
  }))
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

  const measuredPerformance = chartKpis.filter((item) => item.monthly_target > 0)
  const avgPerformance = measuredPerformance.length ? (measuredPerformance.reduce((sum, item) => sum + item.ventas_count / item.monthly_target, 0) / measuredPerformance.length * 100).toFixed(0) : 'n/d'
  const avgVelocity = 'n/d'

  return (
    <div className="space-y-6">
      <header className="overflow-hidden border border-white/10 bg-black text-white">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#e23b31]">Property Partners Vitacura</p><h1 className="mt-2 text-3xl font-semibold">Control de gestión</h1><p className="mt-2 text-sm text-[#aaa]">Una sola lectura trazable entre operación CRM, metas 2026 y presentaciones reales.</p></div>
          <Link href="/dashboard/presentaciones" className="border border-[#d7332b] px-4 py-2 text-xs font-semibold text-white hover:bg-[#d7332b]">Abrir conciliación de 304 láminas</Link>
        </div>
        <div className="h-1 bg-[#d7332b]" />
      </header>

      <section className="grid gap-px bg-[#cfcfcf] md:grid-cols-3">
        <Link href="/dashboard/datos-crm" className="bg-[#f0f0f0] p-5 text-[#222] hover:bg-white"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#777]">01 · Hechos</p><h2 className="mt-2 text-lg font-semibold">Datos CRM</h2><p className="mt-2 text-xs text-[#666]">{CRM_INTELLIGENCE.sourceInventory.workbookCount} libros · {CRM_INTELLIGENCE.sourceInventory.cellCoverage.populatedCells.toLocaleString('es-CL')} celdas con contenido</p></Link>
        <Link href="/dashboard/metas" className="bg-[#f0f0f0] p-5 text-[#222] hover:bg-white"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#777]">02 · Contrato</p><h2 className="mt-2 text-lg font-semibold">Metas 2026</h2><p className="mt-2 text-xs text-[#666]">3 sucursales · 7 métricas · revisión 202607</p></Link>
        <Link href="/dashboard/presentaciones" className="bg-[#f0f0f0] p-5 text-[#222] hover:bg-white"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#d7332b]">03 · Interpretación</p><h2 className="mt-2 text-lg font-semibold">Presentaciones 2026</h2><p className="mt-2 text-xs text-[#666]">{presentationsSummary.source.slideCount} láminas · {presentationsSummary.reconciliation.counts.different} diferencias identificadas</p></Link>
      </section>

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


