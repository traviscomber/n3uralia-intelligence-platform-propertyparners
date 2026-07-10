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
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900">Reportes IA</h1>
        <p className="text-sm text-gray-600 mt-2">Reportes automáticos generados por inteligencia artificial</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando reportes...</div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <FileText size={32} className="mx-auto mb-3 text-gray-400" />
          <p className="text-gray-500">No hay reportes disponibles aún</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 cursor-pointer transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg #e8f3f0 flex items-center justify-center flex-shrink-0">
                  <FileText size={18} className="#8fb2aa" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-gray-900">{report.title}</h3>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{report.summary}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: "#e8f3f0", color: "#555a56" }}>
                      {reportTypes[report.report_type] || report.report_type}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
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
