'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import type { User } from '@supabase/supabase-js'

type ProvenanceState = {
  label: string
  detail: string
  color: string
}

function getProvenanceState(pathname: string, consultationDate: string): ProvenanceState {
  if (pathname.startsWith('/dashboard/market') || pathname.startsWith('/dashboard/properties')) {
    return {
      label: 'Datos operativos',
      detail: `Consulta realizada: ${consultationDate}`,
      color: '#65d3a5',
    }
  }

  if (pathname.startsWith('/dashboard/sources') || pathname.startsWith('/dashboard/knowledge')) {
    return {
      label: 'Fuente viva · separada',
      detail: `Consulta realizada: ${consultationDate}`,
      color: '#6aa9ff',
    }
  }

  if (
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/valuation') ||
    pathname.startsWith('/dashboard/valuations') ||
    pathname.startsWith('/dashboard/control') ||
    pathname.startsWith('/dashboard/ceo') ||
    pathname.startsWith('/dashboard/director') ||
    pathname.startsWith('/dashboard/partner') ||
    pathname.startsWith('/dashboard/reportes') ||
    pathname.startsWith('/dashboard/version-2')
  ) {
    return {
      label: 'Alcance contractual',
      detail: 'Contenido y estados definidos por el módulo',
      color: '#65d3a5',
    }
  }

  return {
    label: 'Procedencia pendiente',
    detail: 'La procedencia de esta vista requiere validación',
    color: '#f6c453',
  }
}

export default function Topbar({ profile }: { user: User; profile: Profile | null }) {
  const router = useRouter()
  const pathname = usePathname()
  const consultationDate = new Date().toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const provenance = getProvenanceState(pathname, consultationDate)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 flex min-h-14 items-center justify-between gap-2 border-b border-[var(--n3-line)] bg-[var(--n3-black)] py-3 pl-16 pr-3 md:px-6 md:py-4">
      <p className="hidden min-w-0 truncate text-xs text-[var(--n3-text-muted)] sm:block">
        {provenance.detail}
      </p>
      <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
        <div
          className="flex min-w-0 items-center gap-1.5 rounded-full border border-[var(--n3-line)] px-2.5 py-1 text-xs"
          style={{ background: 'rgba(255,255,255,0.04)', color: provenance.color }}
          title={provenance.detail}
        >
          <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: provenance.color }} />
          <span className="truncate">{provenance.label}</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex shrink-0 items-center gap-1.5 rounded border border-[var(--n3-line)] px-2.5 py-1.5 text-xs text-[var(--n3-text-light)] transition-colors hover:opacity-70 sm:px-3"
        >
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M10 11l3-3-3-3M13 8H6" /></svg>
          <span className="hidden sm:inline">{profile?.full_name?.split(' ')[0] || 'Salir'}</span>
          <span className="sm:hidden">Salir</span>
        </button>
      </div>
    </header>
  )
}
