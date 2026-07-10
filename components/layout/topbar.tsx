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
    <header className="flex items-center justify-between px-6 py-3 border-b shrink-0" style={{ background: 'var(--n-surface)', borderColor: 'var(--n-border)' }}>
      <p className="text-xs capitalize" style={{ color: 'var(--n-fg-subtle)' }}>{dateStr}</p>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs" style={{ background: 'var(--n-success-muted)', color: 'var(--n-success)' }}>
          <span className="w-1.5 h-1.5 rounded-full pulse-dot inline-block" style={{ background: 'var(--n-success)' }} />
          IA Activa
        </div>
        <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors" style={{ color: 'var(--n-fg-muted)', border: '1px solid var(--n-border)' }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M10 11l3-3-3-3M13 8H6" /></svg>
          {profile?.full_name?.split(' ')[0] || 'Salir'}
        </button>
      </div>
    </header>
  )
}
