import { createClient } from '@/lib/supabase/server'
import ReportDeliveryTargetsManager from '@/components/settings/ReportDeliveryTargetsManager'
import ProfileEditor from '@/components/settings/ProfileEditor'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).maybeSingle()

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900">ConfiguraciÃ³n</h1>
        <p className="text-sm text-gray-600 mt-2">Gestiona tu perfil, preferencias y parÃ¡metros de la plataforma</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Perfil de Usuario</h3>
        <ProfileEditor profile={profile} email={user?.email} />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sistema N3uralia</h3>
        <div className="divide-y divide-gray-200">
          {[
            { label: 'VersiÃ³n', value: 'v1.0.0 â€” Production' },
            { label: 'Motor IA', value: 'N3uralia Intelligence v2' },
            { label: 'ActualizaciÃ³n de datos', value: 'Cada 2 horas' },
            { label: 'Zona horaria', value: 'America/Santiago (UTC-4)' },
            { label: 'Idioma', value: 'EspaÃ±ol (Chile)' },
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
          Define quiÃ©n recibe los reportes semanales por email o WhatsApp Web.
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
