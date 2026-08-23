'use client'

import Link from 'next/link'
import { KeyRound, LogOut } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import type { User } from '@supabase/supabase-js'

type ProvenanceState = {
  label: string
  detail: string
  toneClass: string
}

function getProvenanceState(pathname: string, consultationDate: string): ProvenanceState {
  if (pathname.startsWith('/dashboard/market') || pathname.startsWith('/dashboard/properties')) {
    return {
      label: 'Datos operativos',
      detail: `Consulta realizada: ${consultationDate}`,
      toneClass: 'text-[var(--chart-3)]',
    }
  }

  if (pathname.startsWith('/dashboard/pedro-pablo')) {
    return {
      label: 'Datos Property Partners',
      detail: 'Opinión N3uralia separada',
      toneClass: 'text-[var(--chart-3)]',
    }
  }

  if (pathname.startsWith('/dashboard/sources') || pathname.startsWith('/dashboard/knowledge')) {
    return {
      label: 'Fuente viva · separada',
      detail: `Consulta realizada: ${consultationDate}`,
      toneClass: 'text-[var(--chart-1)]',
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
      toneClass: 'text-[var(--chart-3)]',
    }
  }

  return {
    label: 'Procedencia pendiente',
    detail: 'La procedencia de esta vista requiere validación',
    toneClass: 'text-[var(--chart-4)]',
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
          className={`flex min-w-0 items-center gap-1.5 border border-[var(--n3-line)] bg-[var(--n3-deep)] px-2.5 py-1 text-xs ${provenance.toneClass}`}
          title={provenance.detail}
        >
          <span aria-hidden="true" className="inline-block h-1.5 w-1.5 shrink-0 border border-current bg-current" />
          <span className="truncate">{provenance.label}</span>
        </div>
        <Link
          href="/dashboard/cuenta"
          className="flex shrink-0 items-center gap-1.5 border border-[var(--n3-line)] px-2.5 py-1.5 text-xs text-[var(--n3-text-light)] transition-colors hover:bg-[var(--n3-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)]"
          title="Cambiar contraseña"
        >
          <KeyRound aria-hidden="true" size={12} strokeWidth={1.6} />
          <span className="hidden sm:inline">Contraseña</span>
        </Link>
        <button
          onClick={handleLogout}
          className="flex shrink-0 items-center gap-1.5 border border-[var(--n3-line)] px-2.5 py-1.5 text-xs text-[var(--n3-text-light)] transition-colors hover:bg-[var(--n3-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)] sm:px-3"
        >
          <LogOut aria-hidden="true" size={12} strokeWidth={1.6} />
          <span className="hidden sm:inline">{profile?.full_name?.split(' ')[0] || 'Salir'}</span>
          <span className="sm:hidden">Salir</span>
        </button>
      </div>
    </header>
  )
}
