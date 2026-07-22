'use client'

import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { buildOperationalSeries, getDataQuality, getOperationalSummary, getYtdSummary } from '@/lib/crm-snapshot'
import { getBranchSalesYtdPerformance, getCompanySalesCompliance } from '@/lib/targets-2026'

function fmt(n: number) {
  return n.toLocaleString('es-CL')
}

function KpiCard({ label, value, sub, border }: { label: string; value: string; sub?: string; border: string }) {
  return (
    <div className="bg-white rounded-lg p-5 flex flex-col gap-1" style={{ border: '1px solid #e8f0ed', borderLeft: `3px solid ${border}` }}>
      <span className="text-[11px] uppercase tracking-wider font-medium" style={{ color: '#6b7280' }}>{label}</span>
      <span className="text-2xl font-bold tracking-tight" style={{ color: '#111111' }}>{value}</span>
      {sub && <span className="text-xs" style={{ color: '#6b7280' }}>{sub}</span>}
    </div>
  )
}

export default function CeoDashboard() {
  const fallbackSummary = getOperationalSummary()
  const fallbackSeries = buildOperationalSeries(6).map(({ mes, ventas, captaciones, leads }) => ({ mes, ventas, captaciones, leads }))
  const branches = getBranchSalesYtdPerformance('2026-06')
  const attributedBranchSales = branches.reduce((sum, branch) => sum + branch.actualSales, 0)
  const attributedBranchUf = branches.reduce((sum, branch) => sum + branch.actualUf, 0)
  const chartData = fallbackSeries
  const ytd = getYtdSummary()
  const dataQuality = getDataQuality()
  const salesCompliance = getCompanySalesCompliance('2026-06')
  const januaryStock = fallbackSummary.stock - ytd.stockChange
  const stockRetention = januaryStock > 0 ? Number(((fallbackSummary.stock / januaryStock) * 100).toFixed(1)) : null
  const totals = {
    ventas: ytd.salesCount,
    uf: ytd.salesUf,
    conversion: fallbackSummary.leadToSaleProxy,
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8" style={{ background: '#fbfbfa' }}>
      {/* Header */}
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-widest px-2 py-0.5 rounded" style={{ background: '#111111', color: 'var(--n3-teal)' }}>CEO</span>
            <span className="text-xs" style={{ color: '#6b7280' }}>Resumen ejecutivo</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#111111' }}>Panel de gestión</h1>
            <p className="text-sm mt-1" style={{ color: '#6b7280' }}>Resumen global del negocio · corte auditado enero–junio 2026</p>
        </div>
        <div className="text-right">
          <div className="text-xs" style={{ color: '#6b7280' }}>Corte de datos</div>
          <div className="text-sm font-semibold" style={{ color: '#111111' }}>Junio 2026</div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Ventas totales"     value={fmt(totals.ventas)}           sub="propiedades cerradas (6m)"  border="var(--n3-teal)" />
        <KpiCard
          label="UF vendidas"
          value={totals.uf > 0 ? `${(totals.uf / 1000).toFixed(0)}K UF` : 'n/d'}
          sub={totals.uf > 0 ? 'volumen validado enero-junio' : 'UF no disponible en el corte'}
          border="#6b7280"
        />
        <KpiCard label="Cobertura de fuentes" value={`${dataQuality.sourceCoverage}%`} sub="datasets mensuales presentes / esperados" border="var(--n3-teal)" />
        <KpiCard label="Cierres / leads Jun" value={`${totals.conversion}%`} sub="proxy mensual, no cohorte" border="#111111" />
      </div>

      {/* Source-backed controls */}
      <div className="mb-8 grid grid-cols-1 gap-5 xl:grid-cols-5">
        <div className="rounded-lg bg-white p-5 xl:col-span-4" style={{ border: '1px solid #e8f0ed' }}>
          <div className="mb-4"><h2 className="text-sm font-semibold" style={{ color: '#111111' }}>Indicadores de control</h2><p className="mt-0.5 text-xs" style={{ color: '#6b7280' }}>Valores derivados directamente de CRM y Metas 2026; no forman un índice agregado.</p></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg p-3" style={{ background: '#f8fbfa', border: '1px solid #edf4f1' }}><div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Cobertura de fuentes</div><div className="mt-1 text-lg font-bold" style={{ color: '#111111' }}>{dataQuality.sourceCoverage}%</div><div className="mt-1 text-[11px] leading-snug" style={{ color: '#6b7280' }}>Datasets mensuales presentes / esperados.</div></div>
            <div className="rounded-lg p-3" style={{ background: '#f8fbfa', border: '1px solid #edf4f1' }}><div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Cartera junio / enero</div><div className="mt-1 text-lg font-bold" style={{ color: '#111111' }}>{stockRetention === null ? 'n/d' : `${stockRetention}%`}</div><div className="mt-1 text-[11px] leading-snug" style={{ color: '#6b7280' }}>Stock de junio dividido por stock de enero.</div></div>
            <div className="rounded-lg p-3" style={{ background: '#f8fbfa', border: '1px solid #edf4f1' }}><div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Cumplimiento de cierres</div><div className="mt-1 text-lg font-bold" style={{ color: '#111111' }}>{salesCompliance.compliance}%</div><div className="mt-1 text-[11px] leading-snug" style={{ color: '#6b7280' }}>Cierres CRM / meta acumulada compatible.</div></div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-5" style={{ border: '1px solid #e8f0ed' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: '#111111' }}>Reportes auditados</h2>
              <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Acceso por audiencia</p>
            </div>
          </div>
          <div className="space-y-3">
            <Link href="/dashboard/reportes/autonomos" className="block rounded-lg p-3 text-xs font-semibold" style={{ background: '#f8fbfa', border: '1px solid #edf4f1', color: '#111111' }}>Reportes programados</Link>
            <Link href="/dashboard/reportes/directorio" className="block rounded-lg p-3 text-xs font-semibold" style={{ background: '#f8fbfa', border: '1px solid #edf4f1', color: '#111111' }}>Reporte de directorio</Link>
          </div>
        </div>
      </div>

      {/* Director Ranking + Sales Chart */}
      <div className="mb-8 grid grid-cols-1 gap-5 xl:grid-cols-5">
        {/* Ranking table */}
        <div className="overflow-hidden rounded-lg bg-white xl:col-span-3" style={{ border: '1px solid #e8f0ed' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #f0f5f3' }}>
            <h2 className="text-sm font-semibold" style={{ color: '#111111' }}>Ventas por sucursal</h2>
            <span className="text-xs text-right" style={{ color: '#6b7280' }}>6 meses · {attributedBranchSales}/{ytd.salesCount} cierres y UF {attributedBranchUf.toLocaleString('es-CL')}/{ytd.salesUf.toLocaleString('es-CL')} atribuibles a sucursal</span>
          </div>
          <div className="overflow-x-auto"><table className="min-w-[720px] w-full text-sm">
            <thead>
              <tr style={{ background: '#f8fbfa' }}>
                <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>#</th>
                <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Sucursal</th>
                <th className="text-right px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Ventas</th>
                <th className="text-right px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>UF</th>
                <th className="text-right px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Meta</th>
                <th className="text-right px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Comisión</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((branch, i) => {
                const medals = ['#f59e0b', '#6b7280', '#6b7280']
                return (
                  <tr key={branch.id} style={{ borderTop: '1px solid #f0f5f3' }}>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-bold" style={{ color: medals[i] || '#6b7280' }}>{i + 1}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0" style={{ background: '#f9fafb', color: 'var(--n3-teal)' }}>
                          {branch.branch.charAt(0)}
                        </div>
                        <div>
                          <div className="text-[13px] font-medium" style={{ color: '#111111' }}>{branch.branch}</div>
                          <div className="text-[11px]" style={{ color: '#6b7280' }}>{branch.compliance}% de meta atribuida</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-[13px] font-semibold" style={{ color: '#111111' }}>{branch.actualSales}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-[13px]" style={{ color: '#374151' }}>{`${(branch.actualUf / 1000).toFixed(1)}K`}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-[12px] font-semibold" style={{ color: '#6b7280' }}>{branch.targetSales.toLocaleString('es-CL', { maximumFractionDigits: 1 })}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-[13px]" style={{ color: '#374151' }}>n/d</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table></div>
        </div>

        {/* Sales trend */}
        <div className="rounded-lg bg-white xl:col-span-2" style={{ border: '1px solid #e8f0ed' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid #f0f5f3' }}>
            <h2 className="text-sm font-semibold" style={{ color: '#111111' }}>Tendencia operativa</h2>
            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Últimos 6 meses</p>
          </div>
          <div className="px-4 pt-4 pb-2">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--n3-teal)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--n3-teal)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gCaptaciones" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6b7280" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6b7280" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#111111" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#111111" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f5f3" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e8f0ed', borderRadius: 6, fontSize: 12 }} />
                <Bar dataKey="ventas" fill="url(#gVentas)" radius={[4, 4, 0, 0]} name="Ventas" />
                <Bar dataKey="captaciones" fill="url(#gCaptaciones)" radius={[4, 4, 0, 0]} name="Captaciones" />
                <Bar dataKey="leads" fill="url(#gLeads)" radius={[4, 4, 0, 0]} name="Leads" />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 justify-center">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--n3-teal)' }} /><span className="text-[11px]" style={{ color: '#6b7280' }}>Ventas</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ background: '#6b7280' }} /><span className="text-[11px]" style={{ color: '#6b7280' }}>Captaciones</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ background: '#111111' }} /><span className="text-[11px]" style={{ color: '#6b7280' }}>Leads</span></div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
