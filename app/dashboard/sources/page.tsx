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
        return <Check size={16} style={{ color: 'var(--n-success)' }} />
      case 'syncing':
        return <Clock size={16} style={{ color: 'var(--n-warning)', animation: 'spin 2s linear infinite' }} />
      case 'error':
        return <AlertCircle size={16} style={{ color: 'var(--n-danger)' }} />
      default:
        return <Database size={16} style={{ color: 'var(--n-fg-subtle)' }} />
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
        <h1 className="text-3xl font-bold" style={{ color: 'var(--n-fg)' }}>
          Fuentes de Datos
        </h1>
        <p style={{ color: 'var(--n-fg-muted)' }} className="text-sm mt-1">
          Pipeline de inteligencia con 7 fuentes integradas
        </p>
      </div>

      {/* Pipeline Overview */}
      <div className="n-card p-6">
        <h2 style={{ color: 'var(--n-fg)' }} className="font-semibold mb-4">
          Pipeline de Datos
        </h2>

        {!loading && (
          <div className="space-y-2">
            {sources.map((source, idx) => (
              <div key={source.id}>
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--n-surface-2)' }}>
                  <div className="flex items-center justify-center w-6 h-6 rounded-full font-semibold text-xs" style={{ background: 'var(--n-primary)', color: 'white' }}>
                    {source.pipeline_order}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ color: 'var(--n-fg)' }} className="font-semibold text-sm">
                        {source.name}
                      </span>
                      {getStatusIcon(source.status)}
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded capitalize"
                        style={{
                          background:
                            source.status === 'active'
                              ? 'var(--n-success-muted)'
                              : source.status === 'syncing'
                                ? 'var(--n-warning-muted)'
                                : 'var(--n-danger-muted)',
                          color:
                            source.status === 'active'
                              ? 'var(--n-success)'
                              : source.status === 'syncing'
                                ? 'var(--n-warning)'
                                : 'var(--n-danger)',
                        }}
                      >
                        {getStatusLabel(source.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--n-fg-muted)' }}>
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
                      <p className="text-xs mt-1" style={{ color: 'var(--n-danger)' }}>
                        {source.error_message}
                      </p>
                    )}
                  </div>
                </div>
                {idx < sources.length - 1 && (
                  <div className="flex justify-center py-1">
                    <div className="w-0.5 h-4" style={{ background: 'var(--n-border)' }} />
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
          <div className="n-card p-4">
            <p style={{ color: 'var(--n-fg-subtle)' }} className="text-xs font-medium mb-2">
              FUENTES ACTIVAS
            </p>
            <p className="text-2xl font-bold" style={{ color: 'var(--n-success)' }}>
              {sources.filter((s) => s.status === 'active').length}
            </p>
          </div>
          <div className="n-card p-4">
            <p style={{ color: 'var(--n-fg-subtle)' }} className="text-xs font-medium mb-2">
              REGISTROS TOTALES
            </p>
            <p className="text-2xl font-bold" style={{ color: 'var(--n-primary)' }}>
              {sources.reduce((sum, s) => sum + s.records_count, 0).toLocaleString()}
            </p>
          </div>
          <div className="n-card p-4">
            <p style={{ color: 'var(--n-fg-subtle)' }} className="text-xs font-medium mb-2">
              ÚLTIMA SINCRONIZACIÓN
            </p>
            <p className="text-sm" style={{ color: 'var(--n-fg)' }}>
              {sources[0]?.last_sync ? new Date(sources[0].last_sync).toLocaleString('es-CL') : 'N/A'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
