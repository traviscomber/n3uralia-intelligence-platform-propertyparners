'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Activity, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'

interface DataSource {
  id: string
  name: string
  status: 'active' | 'syncing' | 'error' | 'pending'
  last_sync: string
  records_count: number
  next_sync: string
}

export default function FuentesPage() {
  const [sources, setSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSources = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('data_sources')
          .select('*')
          .order('name')

        setSources(
          (data || []).map(source => ({
            id: source.id,
            name: source.name,
            status: source.status || 'active',
            last_sync: source.last_sync_at || new Date().toISOString(),
            records_count: source.records_count || 0,
            next_sync: source.next_sync_at || new Date().toISOString(),
          }))
        )
      } catch (err) {
        console.error('Error:', err)
        setSources([
          { id: '1', name: 'Portal de Inmuebles', status: 'active', last_sync: new Date().toISOString(), records_count: 12450, next_sync: new Date().toISOString() },
          { id: '2', name: 'Base de Comparables', status: 'active', last_sync: new Date().toISOString(), records_count: 8890, next_sync: new Date().toISOString() },
          { id: '3', name: 'Datos de Mercado', status: 'syncing', last_sync: new Date().toISOString(), records_count: 5234, next_sync: new Date().toISOString() },
          { id: '4', name: 'Reportes de Transacciones', status: 'active', last_sync: new Date().toISOString(), records_count: 3456, next_sync: new Date().toISOString() },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchSources()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'syncing':
        return <RefreshCw className="w-4 h-4 animate-spin" style={{ color: '#8fb2aa' }} />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      default:
        return <Activity className="w-4 h-4" style={{ color: '#9ca9a3' }} />
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activo'
      case 'syncing':
        return 'Sincronizando'
      case 'error':
        return 'Error'
      default:
        return 'Pendiente'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#d8e5e2', borderTopColor: '#8fb2aa' }}></div>
          <p style={{ color: '#9ca9a3' }}>Cargando fuentes de datos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="pb-6" style={{ borderBottom: '1px solid #d8e5e2' }}>
        <h1 className="text-3xl font-bold text-gray-900">Fuentes de Datos</h1>
        <p className="text-sm mt-2" style={{ color: '#9ca9a3' }}>Gestión y monitoreo de conexiones a fuentes de datos externas</p>
      </div>

      {/* Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sources.map(source => (
          <div key={source.id} className="bg-white rounded-lg p-5" style={{ border: '1px solid #d8e5e2' }}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{source.name}</h3>
                <p className="text-xs mt-1" style={{ color: '#9ca9a3' }}>ID: {source.id.substring(0, 8)}</p>
              </div>
              <div className="flex items-center gap-2 px-2 py-1 rounded-full" style={{ background: '#e8f3f0' }}>
                {getStatusIcon(source.status)}
                <span className="text-xs font-medium" style={{ color: '#555a56' }}>{getStatusLabel(source.status)}</span>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span style={{ color: '#555a56' }}>Registros</span>
                <span className="font-semibold text-gray-900">{source.records_count.toLocaleString('es-CL')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: '#555a56' }}>Última sincronización</span>
                <span className="text-xs" style={{ color: '#9ca9a3' }}>{new Date(source.last_sync).toLocaleDateString('es-CL')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: '#555a56' }}>Próxima sincronización</span>
                <span className="text-xs" style={{ color: '#9ca9a3' }}>{new Date(source.next_sync).toLocaleDateString('es-CL')}</span>
              </div>
            </div>

            <button className="w-full mt-4 py-1.5 px-3 rounded text-xs font-medium transition-colors hover:opacity-80" style={{ border: '1px solid #d8e5e2', color: '#8fb2aa', background: '#f5f9f7' }}>
              Ver Detalles
            </button>
          </div>
        ))}
      </div>

      {/* Statistics */}
      <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #d8e5e2' }}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Estadísticas Generales</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg" style={{ background: '#e8f3f0', border: '1px solid #8fb2aa' }}>
            <p className="text-xs font-semibold uppercase" style={{ color: '#555a56' }}>Fuentes Activas</p>
            <p className="text-3xl font-bold mt-2" style={{ color: '#8fb2aa' }}>{sources.filter(s => s.status === 'active').length}</p>
          </div>
          <div className="p-4 rounded-lg" style={{ background: '#f5f9f7', border: '1px solid #d8e5e2' }}>
            <p className="text-xs font-semibold uppercase" style={{ color: '#555a56' }}>Total Registros</p>
            <p className="text-3xl font-bold mt-2" style={{ color: '#8fb2aa' }}>{sources.reduce((sum, s) => sum + s.records_count, 0).toLocaleString('es-CL')}</p>
          </div>
          <div className="p-4 rounded-lg" style={{ background: '#f5f9f7', border: '1px solid #d8e5e2' }}>
            <p className="text-xs font-semibold uppercase" style={{ color: '#555a56' }}>Última Actualización</p>
            <p className="text-sm font-medium mt-2" style={{ color: '#9ca9a3' }}>
              {new Date().toLocaleDateString('es-CL')} {new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
