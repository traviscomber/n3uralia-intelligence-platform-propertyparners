import { createClient } from '@/lib/supabase/server'
import ReportDeliveryTargetsManager from '@/components/settings/ReportDeliveryTargetsManager'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-600 mt-2">Gestiona tu perfil, preferencias y parámetros de la plataforma</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Perfil de Usuario</h3>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full #e8f3f0 flex items-center justify-center text-xl font-bold #8fb2aa">
            {(profile?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-gray-900">{profile?.full_name || 'Sin nombre'}</div>
            <div className="text-sm text-gray-600">{user?.email}</div>
            <span className="text-[10px] mt-1 capitalize px-2 py-0.5 rounded-full inline-block" style={{ background: "#e8f3f0", color: "#555a56" }}>
              {profile?.role || 'seller'}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Nombre completo', value: profile?.full_name || '—' },
            { label: 'Email', value: user?.email || '—' },
            { label: 'Rol', value: profile?.role || 'seller' },
            { label: 'Equipo', value: profile?.team || 'Sin asignar' },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
              <div className="px-3 py-2 rounded bg-gray-50 border border-gray-200 text-sm text-gray-900">{f.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sistema N3uralia</h3>
        <div className="divide-y divide-gray-200">
          {[
            { label: 'Versión', value: 'v1.0.0 — Production' },
            { label: 'Motor IA', value: 'N3uralia Intelligence v2' },
            { label: 'Actualización de datos', value: 'Cada 2 horas' },
            { label: 'Zona horaria', value: 'America/Santiago (UTC-4)' },
            { label: 'Idioma', value: 'Español (Chile)' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <span className="text-sm text-gray-600">{item.label}</span>
              <span className="text-sm font-medium text-gray-900">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Destinatarios de reportes</h3>
        <p className="text-sm text-gray-600 mb-4">
          Define quién recibe los reportes semanales por email o WhatsApp Web.
        </p>
        <ReportDeliveryTargetsManager />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Paleta de Colores</h3>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Primary', color: '#8fb2aa' },
            { label: 'Accent', color: '#b89a7e' },
            { label: 'Success', color: '#10b981' },
            { label: 'Warning', color: '#f59e0b' },
          ].map(c => (
            <div key={c.label} className="text-center">
              <div className="w-full h-12 rounded mb-2" style={{ background: c.color }} />
              <div className="text-xs font-medium text-gray-700">{c.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
