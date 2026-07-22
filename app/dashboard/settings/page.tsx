import { createClient } from '@/lib/supabase/server'
import ReportDeliveryTargetsManager from '@/components/settings/ReportDeliveryTargetsManager'
import ProfileEditor from '@/components/settings/ProfileEditor'
import DeliveryTelemetryPanel from '@/components/settings/DeliveryTelemetryPanel'
import ProfileDirectory from '@/components/settings/ProfileDirectory'
import ReportDirectoryManager from '@/components/settings/ReportDirectoryManager'

const systemRows = [
  { label: 'Version', value: 'v1.0.0 - Produccion' },
  { label: 'Motor IA', value: 'N3uralia Intelligence v3' },
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
      <div className="rounded-3xl border border-[var(--n3-line)] bg-[linear-gradient(135deg,rgba(10,17,16,0.96)_0%,rgba(6,10,10,1)_100%)] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--n3-text-muted)' }}>
              Centro de control
            </p>
            <h1 className="mt-2 text-3xl font-light uppercase tracking-[0.14em] text-[var(--n3-text-light)]">
              Configuracion ejecutiva
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--n3-text-muted)]">
              Gestion de perfil, destinatarios, telemetria y parametrizacion operativa en una sola vista para trabajo directo con direccion.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-[var(--n3-line)] bg-[var(--n3-dark-surface)] px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--n3-text-muted)' }}>
                Perfil
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--n3-text-light)]">{profile?.full_name || user?.email || 'Activo'}</p>
            </div>
            <div className="rounded-2xl border border-[var(--n3-line)] bg-[var(--n3-dark-surface)] px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--n3-text-muted)' }}>
                Cobertura
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--n3-text-light)]">Reportes y entregas</p>
            </div>
            <div className="rounded-2xl border border-[var(--n3-line)] bg-[var(--n3-dark-surface)] px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--n3-text-muted)' }}>
                Flujo
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--n3-text-light)]">Correo + WhatsApp Web</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-[var(--n3-line)] bg-[var(--n3-dark-surface)] p-6">
          <h3 className="text-lg font-semibold text-[var(--n3-text-light)]">Perfil ejecutivo</h3>
          <p className="mt-2 text-sm text-[var(--n3-text-muted)]">
            Mantiene la identidad del usuario y la informacion base para operar la plataforma.
          </p>
          <div className="mt-4">
            <ProfileEditor profile={profile} email={user?.email} />
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--n3-line)] bg-[var(--n3-dark-surface)] p-6">
          <h3 className="text-lg font-semibold text-[var(--n3-text-light)]">Resumen del sistema</h3>
          <p className="mt-2 text-sm text-[var(--n3-text-muted)]">
            Estado operativo y parametros estandar de la plataforma.
          </p>
          <div className="mt-4 divide-y divide-[var(--n3-line)] rounded-2xl border border-[var(--n3-line)] bg-[rgba(255,255,255,0.02)]">
            {systemRows.map((item) => (
              <div key={item.label} className="flex items-center justify-between px-4 py-3 first:rounded-t-2xl last:rounded-b-2xl">
                <span className="text-sm text-[var(--n3-text-muted)]">{item.label}</span>
                <span className="text-sm font-medium text-[var(--n3-text-light)]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border border-[var(--n3-line)] bg-[var(--n3-dark-surface)] p-6">
        <h3 className="text-lg font-semibold text-[var(--n3-text-light)]">Personas, equipos y reportes</h3>
        <p className="mt-2 text-sm text-[var(--n3-text-muted)]">
          Administra directores y ejecutivos, sus sucursales y la distribución de reportes sin modificar las fuentes auditadas.
        </p>
        <div className="mt-5">
          <ReportDirectoryManager />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-[var(--n3-line)] bg-[var(--n3-dark-surface)] p-6">
          <h3 className="text-lg font-semibold text-[var(--n3-text-light)]">Directorio de perfiles</h3>
          <p className="mt-2 text-sm text-[var(--n3-text-muted)]">
            Busca sellers, directores y equipos, y exporta la base completa con filtros.
          </p>
          <div className="mt-4">
            <ProfileDirectory />
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--n3-line)] bg-[var(--n3-dark-surface)] p-6">
          <h3 className="text-lg font-semibold text-[var(--n3-text-light)]">Destinatarios de reportes</h3>
          <p className="mt-2 text-sm text-[var(--n3-text-muted)]">
            Define quienes reciben los reportes semanales por email, WhatsApp Web o webhook.
          </p>
          <div className="mt-4">
            <ReportDeliveryTargetsManager />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-[var(--n3-line)] bg-[var(--n3-dark-surface)] p-6">
          <h3 className="text-lg font-semibold text-[var(--n3-text-light)]">Telemetria de entregas</h3>
          <p className="mt-2 text-sm text-[var(--n3-text-muted)]">
            Revisa resultados reales de email, WhatsApp Web y webhooks con lectura ejecutiva.
          </p>
          <div className="mt-4">
            <DeliveryTelemetryPanel />
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--n3-line)] bg-[var(--n3-dark-surface)] p-6">
          <h3 className="text-lg font-semibold text-[var(--n3-text-light)]">Paleta de marca</h3>
          <p className="mt-2 text-sm text-[var(--n3-text-muted)]">
            Sistema visual base para mantener consistencia en reportes, vistas y piezas comerciales.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: 'Principal', color: 'var(--n3-teal)' },
              { label: 'Acento', color: 'var(--n3-teal-soft)' },
              { label: 'Exito', color: '#7fb98f' },
              { label: 'Aviso', color: '#d1a24a' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-[var(--n3-line)] bg-[rgba(255,255,255,0.02)] p-3">
                <div className="h-12 rounded-xl" style={{ background: item.color }} />
                <p className="mt-2 text-xs font-medium text-[var(--n3-text-light)]">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

