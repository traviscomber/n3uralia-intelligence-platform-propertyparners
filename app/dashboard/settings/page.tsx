import { createClient } from '@/lib/supabase/server'
import ReportDeliveryTargetsManager from '@/components/settings/ReportDeliveryTargetsManager'
import ProfileEditor from '@/components/settings/ProfileEditor'
import DeliveryTelemetryPanel from '@/components/settings/DeliveryTelemetryPanel'
import ProfileDirectory from '@/components/settings/ProfileDirectory'

const systemRows = [
  { label: 'Version', value: 'v1.0.0 - Produccion' },
  { label: 'Motor IA', value: 'Property Partners Intelligence v2' },
  { label: 'Actualizacion de datos', value: 'Cada 2 horas' },
  { label: 'Zona horaria', value: 'America/Santiago (UTC-4)' },
  { label: 'Idioma', value: 'Espanol (Chile)' },
]

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).maybeSingle()

  return (
    <div className="space-y-6 pb-8">
      <div className="rounded-3xl border p-6" style={{ borderColor: '#e5e7eb', background: 'linear-gradient(135deg, #f7fbfa 0%, #ffffff 100%)' }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: '#6b7280' }}>
              Centro de control
            </p>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">Configuración ejecutiva</h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Gestión de perfil, destinatarios, telemetría y parametrización operativa en una sola vista para trabajo directo con dirección.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border px-3 py-2" style={{ borderColor: '#e5e7eb', background: '#fff' }}>
              <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: '#6b7280' }}>
                Perfil
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">{profile?.full_name || user?.email || 'Activo'}</p>
            </div>
            <div className="rounded-2xl border px-3 py-2" style={{ borderColor: '#e5e7eb', background: '#fff' }}>
              <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: '#6b7280' }}>
                Cobertura
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">Reportes y entregas</p>
            </div>
            <div className="rounded-2xl border px-3 py-2" style={{ borderColor: '#e5e7eb', background: '#fff' }}>
              <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: '#6b7280' }}>
                Flujo
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">Correo + WhatsApp Web</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border bg-white p-6" style={{ borderColor: '#e5e7eb' }}>
          <h3 className="text-lg font-semibold text-gray-900">Perfil ejecutivo</h3>
          <p className="mt-2 text-sm text-gray-600">
            Mantiene la identidad del usuario y la información base para operar la plataforma.
          </p>
          <div className="mt-4">
            <ProfileEditor profile={profile} email={user?.email} />
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6" style={{ borderColor: '#e5e7eb' }}>
          <h3 className="text-lg font-semibold text-gray-900">Resumen del sistema</h3>
          <p className="mt-2 text-sm text-gray-600">
            Estado operativo y parámetros estándar de la plataforma.
          </p>
          <div className="mt-4 divide-y divide-gray-200 rounded-2xl border" style={{ borderColor: '#e5e7eb' }}>
            {systemRows.map((item) => (
              <div key={item.label} className="flex items-center justify-between px-4 py-3 first:rounded-t-2xl last:rounded-b-2xl">
                <span className="text-sm text-gray-600">{item.label}</span>
                <span className="text-sm font-medium text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border bg-white p-6" style={{ borderColor: '#e5e7eb' }}>
          <h3 className="text-lg font-semibold text-gray-900">Directorio de perfiles</h3>
          <p className="mt-2 text-sm text-gray-600">
            Busca sellers, directores y equipos, y exporta la base completa con filtros.
          </p>
          <div className="mt-4">
            <ProfileDirectory />
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6" style={{ borderColor: '#e5e7eb' }}>
          <h3 className="text-lg font-semibold text-gray-900">Destinatarios de reportes</h3>
          <p className="mt-2 text-sm text-gray-600">
            Define quiénes reciben los reportes semanales por email, WhatsApp Web o webhook.
          </p>
          <div className="mt-4">
            <ReportDeliveryTargetsManager />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border bg-white p-6" style={{ borderColor: '#e5e7eb' }}>
          <h3 className="text-lg font-semibold text-gray-900">Telemetria de entregas</h3>
          <p className="mt-2 text-sm text-gray-600">
            Revisa resultados reales de email, WhatsApp Web y webhooks con lectura ejecutiva.
          </p>
          <div className="mt-4">
            <DeliveryTelemetryPanel />
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6" style={{ borderColor: '#e5e7eb' }}>
          <h3 className="text-lg font-semibold text-gray-900">Paleta de marca</h3>
          <p className="mt-2 text-sm text-gray-600">
            Sistema visual base para mantener consistencia en reportes, vistas y piezas comerciales.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: 'Principal', color: 'var(--n3-teal)' },
              { label: 'Acento', color: '#6b7280' },
              { label: 'Exito', color: 'var(--n3-teal)' },
              { label: 'Aviso', color: '#f59e0b' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border p-3" style={{ borderColor: '#e5e7eb', background: '#f9fafb' }}>
                <div className="h-12 rounded-xl" style={{ background: item.color }} />
                <p className="mt-2 text-xs font-medium text-gray-700">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}


