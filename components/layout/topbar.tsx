'use client'

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

  const dateStr = new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[var(--n3-line)] bg-[var(--n3-black)] px-6 py-4">
      <p className="text-xs capitalize" style={{ color: 'var(--n3-text-muted)' }}>{dateStr}</p>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-full border border-[var(--n3-line)] px-2.5 py-1 text-xs" style={{ background: 'rgba(215,51,43,0.1)', color: 'var(--n3-teal-soft)' }}>
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: 'var(--n3-teal)' }} />
          Datos activos
        </div>
        <button onClick={handleLogout} className="flex items-center gap-1.5 rounded border border-[var(--n3-line)] px-3 py-1.5 text-xs transition-colors hover:opacity-70" style={{ color: 'var(--n3-text-light)' }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M10 11l3-3-3-3M13 8H6" /></svg>
          {profile?.full_name?.split(' ')[0] || 'Salir'}
        </button>
      </div>
    </header>
  )
}

