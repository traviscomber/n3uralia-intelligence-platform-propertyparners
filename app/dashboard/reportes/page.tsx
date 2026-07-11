'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, Calendar, TrendingUp, BarChart2, MapPin, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'

interface Report {
  id: string
  title: string
  summary: string
  report_type: string
  period_date: string
  content: Record<string, unknown>
  created_at: string
}

interface KPI {
  period_date: string
  ventas_count: number
  ventas_uf: number
  captaciones_count: number
  conversion_rate: number
  comision_total: number
  velocidad_venta: number
  stock_count: number
}

interface MarketRow {
  neighborhood: string
  avg_price_m2_uf: number
  absorption_rate: number
  avg_days_on_market: number
  inventory_count: number
}

const REPORT_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  weekly_executive:  { label: 'Ejecutivo Semanal',  icon: <TrendingUp size={14} />, color: '#8fb2aa' },
  monthly_executive: { label: 'Ejecutivo Mensual',  icon: <BarChart2 size={14} />,  color: '#b89a7e' },
  market:            { label: 'Market Analysis',    icon: <MapPin size={14} />,     color: '#10b981' },
  neighborhood:      { label: 'Análisis Barrio',    icon: <MapPin size={14} />,     color: '#f59e0b' },
  director:          { label: 'Performance Director', icon: <TrendingUp size={14} />, color: '#0ea5e9' },
  seller:            { label: 'Performance Agente', icon: <FileText size={14} />,   color: '#8b5cf6' },
}

function generateWeeklyReport(kpi: KPI, market: MarketRow[]): Omit<Report, 'id' | 'created_at'> {
  const topBarrio = market.sort((a, b) => b.absorption_rate - a.absorption_rate)[0]
  const avgPrice = market.length ? (market.reduce((s, m) => s + m.avg_price_m2_uf, 0) / market.length).toFixed(1) : '—'

  return {
    report_type: 'weekly_executive',
    period_date: new Date().toISOString().split('T')[0],
    title: `Reporte Ejecutivo Semanal — ${new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    summary: `Semana con ${kpi.ventas_count} ventas (${kpi.ventas_uf.toLocaleString('es-CL')} UF) y tasa de conversión del ${kpi.conversion_rate.toFixed(1)}%. Mercado Vitacura con precio promedio ${avgPrice} UF/m². Barrio más activo: ${topBarrio?.neighborhood || '—'} (absorción ${(topBarrio?.absorption_rate * 100).toFixed(0)}%).`,
    content: {
      kpis: {
        ventas: kpi.ventas_count,
        ventas_uf: kpi.ventas_uf,
        captaciones: kpi.captaciones_count,
        conversion: kpi.conversion_rate,
        comision: kpi.comision_total,
        velocidad: kpi.velocidad_venta,
        stock: kpi.stock_count,
      },
      market_snapshot: market.slice(0, 5).map(m => ({
        barrio: m.neighborhood,
        uf_m2: m.avg_price_m2_uf,
        absorcion: m.absorption_rate,
        dias: m.avg_days_on_market,
      })),
      highlights: [
        `${kpi.ventas_count} transacciones completadas esta semana`,
        `Velocidad promedio de venta: ${kpi.velocidad_venta.toFixed(0)} días`,
        `Stock activo: ${kpi.stock_count} propiedades disponibles`,
        `Barrio con mayor absorción: ${topBarrio?.neighborhood || '—'} (${(topBarrio?.absorption_rate * 100).toFixed(0)}%)`,
      ],
      generated_at: new Date().toISOString(),
    },
  }
}

export default function ReportesPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [activeType, setActiveType] = useState<string>('all')

  const supabase = createClient()

  useEffect(() => {
    loadReports()
  }, [])

  async function loadReports() {
    setLoading(true)
    const { data } = await supabase
      .from('ai_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    setReports(data || [])
    setLoading(false)
  }

  async function generateReport() {
    setGenerating(true)
    const [kpiRes, marketRes] = await Promise.all([
      supabase.from('kpi_snapshots').select('*').order('period_date', { ascending: false }).limit(1).single(),
      supabase.from('market_data').select('neighborhood,avg_price_m2_uf,absorption_rate,avg_days_on_market,inventory_count').order('absorption_rate', { ascending: false }),
    ])

    if (!kpiRes.data) {
      setGenerating(false)
      return
    }

    const reportData = generateWeeklyReport(kpiRes.data, marketRes.data || [])
    const { data, error } = await supabase.from('ai_reports').insert(reportData).select().single()

    if (!error && data) {
      setReports(prev => [data, ...prev])
    }
    setGenerating(false)
  }

  const typeOptions = ['all', ...Object.keys(REPORT_TYPE_CONFIG)]
  const filtered = activeType === 'all' ? reports : reports.filter(r => r.report_type === activeType)

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between pb-5" style={{ borderBottom: '1px solid #d8e5e2' }}>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reportes IA</h1>
          <p className="text-sm mt-1" style={{ color: '#9ca9a3' }}>Reportes automáticos generados desde datos reales de Supabase</p>
        </div>
        <button
          onClick={generateReport}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: '#8fb2aa' }}
        >
          {generating ? <RefreshCw size={15} className="animate-spin" /> : <FileText size={15} />}
          {generating ? 'Generando...' : 'Generar Reporte Semanal'}
        </button>
      </div>

      {/* Type filter */}
      <div className="flex gap-1 flex-wrap p-1 rounded-lg w-fit" style={{ background: '#f5f9f7', border: '1px solid #d8e5e2' }}>
        {typeOptions.map(t => (
          <button key={t} onClick={() => setActiveType(t)}
            className="px-3 py-1.5 rounded text-xs font-medium transition-all"
            style={{
              background: activeType === t ? '#8fb2aa' : 'transparent',
              color: activeType === t ? '#fff' : '#9ca9a3',
            }}>
            {t === 'all' ? 'Todos' : REPORT_TYPE_CONFIG[t]?.label || t}
          </button>
        ))}
      </div>

      {/* Report list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: '#d8e5e2', borderTopColor: '#8fb2aa' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg p-12 text-center shadow-sm" style={{ border: '1px solid #d8e5e2' }}>
          <FileText size={36} className="mx-auto mb-3" style={{ color: '#d8e5e2' }} />
          <p className="text-sm font-medium text-gray-900">No hay reportes aún</p>
          <p className="text-xs mt-1" style={{ color: '#9ca9a3' }}>Usa el botón para generar el primer reporte semanal automático</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(report => {
            const config = REPORT_TYPE_CONFIG[report.report_type] || REPORT_TYPE_CONFIG.weekly_executive
            const isOpen = expanded === report.id
            const highlights = (report.content?.highlights as string[]) || []

            return (
              <div key={report.id} className="bg-white rounded-lg shadow-sm overflow-hidden" style={{ border: '1px solid #d8e5e2' }}>
                {/* Row */}
                <button
                  onClick={() => setExpanded(isOpen ? null : report.id)}
                  className="w-full flex items-start gap-4 p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${config.color}18`, color: config.color }}>
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ background: `${config.color}18`, color: config.color }}>
                        {config.label}
                      </span>
                      <span className="flex items-center gap-1 text-xs" style={{ color: '#9ca9a3' }}>
                        <Calendar size={11} />
                        {new Date(report.period_date).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    <h3 className="font-semibold text-sm text-gray-900 mt-1 truncate">{report.title}</h3>
                    <p className="text-xs mt-0.5 line-clamp-2" style={{ color: '#9ca9a3' }}>{report.summary}</p>
                  </div>
                  <div className="shrink-0 mt-1" style={{ color: '#9ca9a3' }}>
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div className="px-5 pb-5" style={{ borderTop: '1px solid #f5f5f5' }}>
                    {/* Full summary */}
                    <p className="text-sm mt-4 leading-relaxed" style={{ color: '#555a56' }}>{report.summary}</p>

                    {/* Highlights */}
                    {highlights.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#555a56' }}>Highlights</p>
                        <ul className="space-y-1.5">
                          {highlights.map((h, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#555a56' }}>
                              <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: '#8fb2aa' }} />
                              {h}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* KPI snippet */}
                    {report.content?.kpis && (
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        {[
                          { label: 'Ventas', value: (report.content.kpis as Record<string, number>).ventas },
                          { label: 'Conversión', value: `${((report.content.kpis as Record<string, number>).conversion || 0).toFixed(1)}%` },
                          { label: 'Stock', value: (report.content.kpis as Record<string, number>).stock },
                        ].map(stat => (
                          <div key={stat.label} className="rounded-lg p-3 text-center" style={{ background: '#f5f9f7', border: '1px solid #d8e5e2' }}>
                            <p className="text-xs" style={{ color: '#9ca9a3' }}>{stat.label}</p>
                            <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="text-xs mt-4" style={{ color: '#b9bfbc' }}>
                      Generado el {new Date(report.created_at).toLocaleString('es-CL')}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
