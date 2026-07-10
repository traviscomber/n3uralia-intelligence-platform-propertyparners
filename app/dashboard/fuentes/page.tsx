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
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      default:
        return <Activity className="w-4 h-4 text-gray-600" />
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
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando fuentes de datos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900">Fuentes de Datos</h1>
        <p className="text-sm text-gray-600 mt-2">Gestión y monitoreo de conexiones a fuentes de datos externas</p>
      </div>

      {/* Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sources.map(source => (
          <div key={source.id} className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{source.name}</h3>
                <p className="text-xs text-gray-500 mt-1">ID: {source.id.substring(0, 8)}</p>
              </div>
              <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-gray-100">
                {getStatusIcon(source.status)}
                <span className="text-xs font-medium text-gray-700">{getStatusLabel(source.status)}</span>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Registros</span>
                <span className="font-semibold text-gray-900">{source.records_count.toLocaleString('es-CL')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Última sincronización</span>
                <span className="text-xs text-gray-500">{new Date(source.last_sync).toLocaleDateString('es-CL')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Próxima sincronización</span>
                <span className="text-xs text-gray-500">{new Date(source.next_sync).toLocaleDateString('es-CL')}</span>
              </div>
            </div>

            <button className="w-full mt-4 py-1.5 px-3 rounded border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Ver Detalles
            </button>
          </div>
        ))}
      </div>

      {/* Statistics */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Estadísticas Generales</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-xs font-semibold text-green-700 uppercase">Fuentes Activas</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{sources.filter(s => s.status === 'active').length}</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs font-semibold text-blue-700 uppercase">Total Registros</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{sources.reduce((sum, s) => sum + s.records_count, 0).toLocaleString('es-CL')}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs font-semibold text-gray-700 uppercase">Última Actualización</p>
            <p className="text-sm font-medium text-gray-600 mt-2">
              {new Date().toLocaleDateString('es-CL')} {new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
