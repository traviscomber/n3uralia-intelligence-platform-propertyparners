'use client'

import { usePathname, useRouter } from 'next/navigation'
import { getDashboardRoute } from '@/lib/dashboard-route-contract'
import { useRuntimeProvenance } from '@/components/layout/runtime-provenance-provider'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import type { User } from '@supabase/supabase-js'

const provenanceMeta = {
  audited: { label: 'Fuente auditada', color: '#65d3a5' },
  'live-separated': { label: 'Fuente viva · separada', color: '#6aa9ff' },
  pending: { label: 'Procedencia pendiente', color: '#f6c453' },
} as const

export default function Topbar({ profile }: { user: User; profile: Profile | null }) {
  const router = useRouter()
  const pathname = usePathname()
  const route = getDashboardRoute(pathname)
  const { evidence } = useRuntimeProvenance()
  const provenanceKind = evidence?.kind ?? 'pending'
  const provenance = provenanceMeta[provenanceKind]

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const consultationDate = new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
  const dateLabel = evidence?.cutoffLabel
    ?? (evidence ? `Observado: ${new Date(evidence.observedAt).toLocaleString('es-CL')}` : `Fecha de consulta: ${consultationDate}`)
  const provenanceLabel = evidence ? provenance.label : 'Sin evidencia runtime'
  const provenanceTitle = evidence
    ? `${evidence.source}${evidence.evidenceId ? ` · ${evidence.evidenceId}` : ''}`
    : `La ruta declara ${route?.provenance ?? 'pending'}, pero la vista todavía no reportó evidencia runtime.`

  return (
    <header className="sticky top-0 z-40 flex min-h-14 items-center justify-between gap-2 border-b border-[var(--n3-line)] bg-[var(--n3-black)] py-3 pl-16 pr-3 md:px-6 md:py-4">
      <p className="hidden text-xs sm:block" style={{ color: 'var(--n3-text-muted)' }}>{dateLabel}</p>
      <div className="flex items-center gap-3">
        <div title={provenanceTitle} className="flex items-center gap-1.5 rounded-full border border-[var(--n3-line)] px-2.5 py-1 text-xs" style={{ background: 'rgba(255,255,255,0.04)', color: evidence ? provenance.color : '#f6c453' }}>
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: evidence ? provenance.color : '#f6c453' }} />
          {provenanceLabel}
        </div>
        <button onClick={handleLogout} className="flex items-center gap-1.5 rounded border border-[var(--n3-line)] px-3 py-1.5 text-xs transition-colors hover:opacity-70" style={{ color: 'var(--n3-text-light)' }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M10 11l3-3-3-3M13 8H6" /></svg>
          {profile?.full_name?.split(' ')[0] || 'Salir'}
        </button>
      </div>
    </header>
  )
}
