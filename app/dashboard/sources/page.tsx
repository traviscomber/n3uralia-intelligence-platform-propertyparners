import { createClient } from '@/lib/supabase/server'

const statusConfig = {
  active: { label: 'Activo', color: 'var(--n-success)', bg: 'var(--n-success-muted)', pulse: true },
  syncing: { label: 'Sincronizando', color: 'var(--n-warning)', bg: 'var(--n-warning-muted)', pulse: true },
  error: { label: 'Error', color: 'var(--n-danger)', bg: 'var(--n-danger-muted)', pulse: false },
  inactive: { label: 'Inactivo', color: 'var(--n-fg-subtle)', bg: 'var(--n-border)', pulse: false },
}

const typeIcons: Record<string, React.ReactNode> = {
  external_api: <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />,
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return 'Nunca'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

export default async function SourcesPage() {
  const supabase = await createClient()
  const { data: sources } = await supabase
    .from('data_sources')
    .select('*')
    .order('pipeline_order', { ascending: true })

  const activeCount = sources?.filter(s => s.status === 'active').length ?? 0
  const totalRecords = sources?.reduce((acc, s) => acc + s.records_count, 0) ?? 0

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--n-fg)' }}>Fuentes de Datos</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--n-fg-muted)' }}>Pipeline de ingestión, procesamiento y sincronización de datos</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Fuentes Activas', value: activeCount, color: 'var(--n-success)' },
          { label: 'Registros Totales', value: totalRecords.toLocaleString(), color: 'var(--n-primary)' },
          { label: 'Fuentes Configuradas', value: sources?.length ?? 0, color: 'var(--n-accent)' },
        ].map(s => (
          <div key={s.label} className="n-card p-4">
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--n-fg-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="n-card p-5">
        <h3 className="text-sm font-semibold mb-5" style={{ color: 'var(--n-fg)' }}>Pipeline de Datos</h3>
        <div className="flex flex-col gap-3">
          {sources?.map((source, idx) => {
            const s = statusConfig[source.status as keyof typeof statusConfig] ?? statusConfig.inactive
            return (
              <div key={source.id} className="flex items-center gap-4">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: source.status === 'active' ? 'var(--n-primary-muted)' : 'var(--n-border)', color: source.status === 'active' ? 'var(--n-primary)' : 'var(--n-fg-subtle)' }}>
                  {idx + 1}
                </div>
                <div className="flex-1 rounded-lg p-3 flex items-center justify-between gap-4" style={{ background: 'var(--n-surface-2)', border: '1px solid var(--n-border)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: 'var(--n-primary-muted)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--n-primary)" strokeWidth="1.5">
                        <ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v4c0 1.7 3.6 3 8 3s8-1.3 8-3V6" /><path d="M4 10v4c0 1.7 3.6 3 8 3s8-1.3 8-3v-4" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-medium" style={{ color: 'var(--n-fg)' }}>{source.name}</div>
                      <div className="text-[10px]" style={{ color: 'var(--n-fg-subtle)' }}>{source.source_type.replace(/_/g, ' ')}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {source.records_count > 0 && (
                      <div className="text-right hidden sm:block">
                        <div className="text-xs font-medium" style={{ color: 'var(--n-fg)' }}>{source.records_count.toLocaleString()}</div>
                        <div className="text-[10px]" style={{ color: 'var(--n-fg-subtle)' }}>registros</div>
                      </div>
                    )}
                    <div className="text-right hidden sm:block">
                      <div className="text-[10px]" style={{ color: 'var(--n-fg-subtle)' }}>{timeAgo(source.last_sync)}</div>
                      <div className="text-[10px]" style={{ color: 'var(--n-fg-subtle)' }}>última sync</div>
                    </div>
                    <span className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full font-medium whitespace-nowrap" style={{ background: s.bg, color: s.color }}>
                      {s.pulse && <span className="w-1.5 h-1.5 rounded-full pulse-dot inline-block" style={{ background: s.color }} />}
                      {s.label}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
