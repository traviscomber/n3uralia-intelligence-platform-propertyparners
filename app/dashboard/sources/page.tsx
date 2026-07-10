'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database, Clock, Check, AlertCircle } from 'lucide-react'

interface DataSource {
  id: string
  name: string
  source_type: string
  status: string
  records_count: number
  last_sync: string
  error_message?: string
  pipeline_order: number
}

export default function SourcesPage() {
  const [sources, setSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSources = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('data_sources')
          .select('*')
          .order('pipeline_order', { ascending: true })

        setSources(data || [])
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSources()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Check size={16} style={{ color: '#10b981' }} />
      case 'syncing':
        return <Clock size={16} style={{ color: '#f59e0b', animation: 'spin 2s linear infinite' }} />
      case 'error':
        return <AlertCircle size={16} style={{ color: '#d97706' }} />
      default:
        return <Database size={16} style={{ color: '#9ca9a3' }} />
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      active: 'Activa',
      syncing: 'Sincronizando',
      error: 'Error',
      inactive: 'Inactiva',
    }
    return labels[status] || status
  }

  const getSourceTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      external_api: 'API Externa',
      internal_db: 'Base Interna',
      geodata: 'Datos Geográficos',
      analytics_engine: 'Motor Analytics',
      vector_db: 'Base Vectorial',
      report_engine: 'Motor Reportes',
      ai_engine: 'Motor IA',
    }
    return labels[type] || type
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Fuentes de Datos
        </h1>
        <p className="text-sm mt-1" style={{ color: '#9ca9a3' }}>
          Pipeline de inteligencia con 7 fuentes integradas
        </p>
      </div>

      {/* Pipeline Overview */}
      <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #d8e5e2' }}>
        <h2 className="font-semibold mb-4 text-gray-900">
          Pipeline de Datos
        </h2>

        {!loading && (
          <div className="space-y-2">
            {sources.map((source, idx) => (
              <div key={source.id}>
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: '#f5f9f7' }}>
                  <div className="flex items-center justify-center w-6 h-6 rounded-full font-semibold text-xs text-white" style={{ background: '#8fb2aa' }}>
                    {source.pipeline_order}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-gray-900">
                        {source.name}
                      </span>
                      {getStatusIcon(source.status)}
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded capitalize"
                        style={{
                          background:
                            source.status === 'active'
                              ? '#e8f3f0'
                              : source.status === 'syncing'
                                ? '#fef3e2'
                                : '#fef3f2',
                          color:
                            source.status === 'active'
                              ? '#10b981'
                              : source.status === 'syncing'
                                ? '#f59e0b'
                                : '#d97706',
                        }}
                      >
                        {getStatusLabel(source.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs" style={{ color: '#9ca9a3' }}>
                      <span>{getSourceTypeLabel(source.source_type)}</span>
                      <span>•</span>
                      <span>{source.records_count.toLocaleString()} registros</span>
                      {source.last_sync && (
                        <>
                          <span>•</span>
                          <span>Última sync: {new Date(source.last_sync).toLocaleTimeString('es-CL')}</span>
                        </>
                      )}
                    </div>
                    {source.error_message && (
                      <p className="text-xs mt-1" style={{ color: '#d97706' }}>
                        {source.error_message}
                      </p>
                    )}
                  </div>
                </div>
                {idx < sources.length - 1 && (
                  <div className="flex justify-center py-1">
                    <div className="w-0.5 h-4" style={{ background: '#d8e5e2' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Statistics */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4" style={{ border: '1px solid #d8e5e2' }}>
            <p className="text-xs font-medium mb-2" style={{ color: '#555a56' }}>
              FUENTES ACTIVAS
            </p>
            <p className="text-2xl font-bold" style={{ color: '#10b981' }}>
              {sources.filter((s) => s.status === 'active').length}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4" style={{ border: '1px solid #d8e5e2' }}>
            <p className="text-xs font-medium mb-2" style={{ color: '#555a56' }}>
              REGISTROS TOTALES
            </p>
            <p className="text-2xl font-bold" style={{ color: '#8fb2aa' }}>
              {sources.reduce((sum, s) => sum + s.records_count, 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4" style={{ border: '1px solid #d8e5e2' }}>
            <p className="text-xs font-medium mb-2" style={{ color: '#555a56' }}>
              ÚLTIMA SINCRONIZACIÓN
            </p>
            <p className="text-sm text-gray-900">
              {sources[0]?.last_sync ? new Date(sources[0].last_sync).toLocaleString('es-CL') : 'N/A'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
