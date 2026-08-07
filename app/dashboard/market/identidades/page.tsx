import { ShieldCheck } from 'lucide-react'
import { IdentityConfirmationForm } from '@/components/market/identity-confirmation-form'
import { OperationalState } from '@/components/ui/operational-state'
import { DataStatusBar, MetricStrip, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import { requireAnyPageCapability } from '@/lib/access-guards'
import { createClient } from '@/lib/supabase/server'

function date(value: string | null) {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '—' : new Intl.DateTimeFormat('es-CL', { dateStyle: 'short' }).format(parsed)
}

export default async function MarketIdentityQueuePage() {
  await requireAnyPageCapability([
    'market.manage_sources',
    'properties.global.assign',
    'properties.office.assign',
  ])
  const supabase = await createClient()
  const [pendingResult, confirmedResult, totalResult] = await Promise.all([
    supabase
      .from('market_properties')
      .select('id,normalized_address,property_type,rol,identity_status,identity_confidence,identity_evidence,last_seen_at,neighborhood_id')
      .neq('identity_status', 'confirmed')
      .order('last_seen_at', { ascending: false })
      .limit(100),
    supabase.from('market_properties').select('id', { count: 'exact', head: true }).eq('identity_status', 'confirmed'),
    supabase.from('market_properties').select('id', { count: 'exact', head: true }),
  ])

  const properties = pendingResult.data ?? []
  const confirmed = confirmedResult.count ?? 0
  const total = totalResult.count ?? 0
  const pending = Math.max(total - confirmed, 0)
  const coverage = total > 0 ? confirmed / total : 0
  const issues = [pendingResult.error, confirmedResult.error, totalResult.error].filter(Boolean).length

  return <WorkspaceShell>
    <WorkspaceHeader
      eyebrow="Mercado"
      title="Identidad y evidencia"
      meta="La confirmación exige evidencia humana verificable y segundo factor. No se confirma por similitud automática."
      actions={[{ label: 'Configurar MFA', href: '/auth/mfa', icon: <ShieldCheck size={15} /> }]}
    />

    <MetricStrip items={[
      { label: 'Propiedades', value: total.toLocaleString('es-CL') },
      { label: 'Confirmadas', value: confirmed.toLocaleString('es-CL'), tone: confirmed > 0 ? 'success' : 'warning' },
      { label: 'Pendientes', value: pending.toLocaleString('es-CL'), tone: pending > 0 ? 'danger' : 'success' },
      { label: 'Cobertura', value: `${(coverage * 100).toFixed(1)}%`, tone: coverage >= 0.8 ? 'success' : coverage > 0 ? 'warning' : 'danger' },
    ]} />

    <section className="mt-6">
      <div className="flex items-center justify-between border-b border-[var(--n3-line)] pb-2">
        <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Cola priorizada</h2>
        <span className="text-xs text-[var(--n3-text-muted)]">Mostrando {properties.length} de {pending}</span>
      </div>

      {pendingResult.error ? <OperationalState kind="error" title="No fue posible consultar la cola" description="La identidad no se modificó." /> : properties.length ? <div className="divide-y divide-[var(--n3-line)]">
        {properties.map((property) => {
          const evidence = property.identity_evidence && typeof property.identity_evidence === 'object' ? property.identity_evidence as Record<string, unknown> : {}
          const evidenceCount = Object.keys(evidence).length
          return <article key={property.id} className="py-5">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-start">
              <div>
                <h3 className="text-sm font-semibold text-[var(--n3-text-light)]">{property.normalized_address || 'Sin dirección normalizada'}</h3>
                <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{property.property_type || 'Sin tipo'} · Rol {property.rol || '—'} · Última evidencia {date(property.last_seen_at)}</p>
              </div>
              <span className="text-xs text-[var(--n3-text-muted)]">{property.neighborhood_id ? 'Con barrio' : 'Sin barrio'}</span>
              <span className={evidenceCount ? 'text-xs text-[#f0c96a]' : 'text-xs text-[#ff766f]'}>{evidenceCount ? `${evidenceCount} campos de evidencia` : 'Sin evidencia registrada'}</span>
            </div>
            <IdentityConfirmationForm propertyId={property.id} />
          </article>
        })}
      </div> : <OperationalState kind="empty" title="Sin identidades pendientes" description="Todas las propiedades operativas tienen identidad confirmada." />}
    </section>

    <DataStatusBar
      cutoff={properties[0]?.last_seen_at ? date(properties[0].last_seen_at) : '—'}
      coverage={`${confirmed.toLocaleString('es-CL')} de ${total.toLocaleString('es-CL')} identidades confirmadas`}
      issues={issues}
      status={issues ? 'partial' : total === 0 || confirmed === 0 ? 'blocked' : coverage >= 0.8 ? 'ready' : 'partial'}
    />
  </WorkspaceShell>
}
