'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, Calendar } from 'lucide-react'

interface Report {
  id: string
  title: string
  summary: string
  report_type: string
  period_date: string
  created_at: string
}

export default function ReportesPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('ai_reports')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10)

        setReports(data || [])
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchReports()
  }, [])

  const reportTypes: { [key: string]: string } = {
    weekly_executive: 'Ejecutivo Semanal',
    monthly_executive: 'Ejecutivo Mensual',
    market: 'Market Analysis',
    neighborhood: 'Análisis Barrio',
    director: 'Performance Director',
    seller: 'Performance Agente',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--n-fg)' }}>
          Reportes IA
        </h1>
        <p style={{ color: 'var(--n-fg-muted)' }} className="text-sm mt-1">
          Reportes automáticos generados por inteligencia artificial
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--n-fg-muted)' }}>
          Cargando reportes...
        </div>
      ) : reports.length === 0 ? (
        <div className="n-card p-12 text-center" style={{ color: 'var(--n-fg-muted)' }}>
          <FileText size={32} className="mx-auto mb-3 opacity-50" />
          <p>No hay reportes disponibles aún</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="n-card p-4 n-card-hover cursor-pointer transition-all">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--n-primary-muted)' }}>
                  <FileText size={18} style={{ color: 'var(--n-primary)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 style={{ color: 'var(--n-fg)' }} className="font-semibold text-sm">
                    {report.title}
                  </h3>
                  <p style={{ color: 'var(--n-fg-muted)' }} className="text-xs mt-1 line-clamp-2">
                    {report.summary}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{ background: 'var(--n-primary-muted)', color: 'var(--n-primary)' }}
                    >
                      {reportTypes[report.report_type] || report.report_type}
                    </span>
                    <span style={{ color: 'var(--n-fg-subtle)' }} className="text-xs flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(report.period_date).toLocaleDateString('es-CL')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
