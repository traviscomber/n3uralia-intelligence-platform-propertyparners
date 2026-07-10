import { createClient } from '@/lib/supabase/server'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--n-fg)' }}>Configuración</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--n-fg-muted)' }}>Gestiona tu perfil, preferencias y parámetros de la plataforma</p>
      </div>

      <div className="n-card p-5">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--n-fg)' }}>Perfil de Usuario</h3>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold" style={{ background: 'var(--n-primary-muted)', color: 'var(--n-primary)' }}>
            {(profile?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-medium" style={{ color: 'var(--n-fg)' }}>{profile?.full_name || 'Sin nombre'}</div>
            <div className="text-sm" style={{ color: 'var(--n-fg-muted)' }}>{user?.email}</div>
            <span className="text-[10px] mt-0.5 capitalize px-2 py-0.5 rounded-full inline-block" style={{ background: 'var(--n-primary-muted)', color: 'var(--n-primary)' }}>
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
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--n-fg-muted)' }}>{f.label}</label>
              <div className="px-3 py-2 rounded text-sm" style={{ background: 'var(--n-surface-2)', border: '1px solid var(--n-border)', color: 'var(--n-fg)' }}>{f.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="n-card p-5">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--n-fg)' }}>Plataforma N3uralia</h3>
        <div className="flex flex-col gap-0">
          {[
            { label: 'Versión', value: 'v1.0.0 — Production' },
            { label: 'Motor IA', value: 'N3uralia Intelligence v2' },
            { label: 'Actualización de datos', value: 'Cada 2 horas' },
            { label: 'Zona horaria', value: 'America/Santiago (UTC-4)' },
            { label: 'Idioma', value: 'Español (Chile)' },
          ].map((item, idx, arr) => (
            <div key={item.label} className="flex items-center justify-between py-2.5" style={{ borderBottom: idx < arr.length - 1 ? '1px solid var(--n-border)' : undefined }}>
              <span className="text-sm" style={{ color: 'var(--n-fg-muted)' }}>{item.label}</span>
              <span className="text-sm font-medium" style={{ color: 'var(--n-fg)' }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="n-card p-5">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--n-fg)' }}>Sistema de Diseño N3uralia</h3>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Primary', css: 'var(--n-primary)' },
            { label: 'Accent', css: 'var(--n-accent)' },
            { label: 'Success', css: 'var(--n-success)' },
            { label: 'Warning', css: 'var(--n-warning)' },
          ].map(c => (
            <div key={c.label} className="text-center">
              <div className="w-full h-8 rounded mb-1.5" style={{ background: c.css }} />
              <div className="text-[10px]" style={{ color: 'var(--n-fg-subtle)' }}>{c.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
