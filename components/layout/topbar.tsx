'use client'

import Link from 'next/link'
import { LogOut, UserRound } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import type { User } from '@supabase/supabase-js'

export default function Topbar({ profile }: { user: User; profile: Profile | null }) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 flex min-h-14 items-center justify-end gap-2 border-b border-[var(--n3-line)] bg-[var(--n3-black)] py-3 pl-16 pr-3 md:px-6 md:py-4">
      <Link
        href="/dashboard/cuenta"
        className="flex min-h-9 shrink-0 items-center gap-2 px-2.5 text-xs text-[var(--n3-text-muted)] transition-colors hover:text-[var(--n3-text-light)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)]"
        aria-label="Abrir cuenta"
      >
        <UserRound aria-hidden="true" size={14} strokeWidth={1.6} />
        <span className="hidden sm:inline">{profile?.full_name?.split(' ')[0] || 'Cuenta'}</span>
      </Link>
      <button
        onClick={handleLogout}
        className="flex min-h-9 shrink-0 items-center gap-2 px-2.5 text-xs text-[var(--n3-text-muted)] transition-colors hover:text-[var(--n3-text-light)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)]"
        aria-label="Cerrar sesión"
      >
        <LogOut aria-hidden="true" size={14} strokeWidth={1.6} />
        <span className="hidden sm:inline">Salir</span>
      </button>
    </header>
  )
}
