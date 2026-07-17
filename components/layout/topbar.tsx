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
    <header className="sticky top-0 z-40 flex items-center justify-between px-6 py-4 bg-white" style={{ borderBottom: '1px solid #e5e7eb' }}>
      <p className="text-xs capitalize" style={{ color: '#6b7280' }}>{dateStr}</p>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs" style={{ background: '#f9fafb', color: '#d61f2c' }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ background: '#d61f2c' }} />
          IA Activa
        </div>
        <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors hover:opacity-70" style={{ color: '#374151', border: '1px solid #e5e7eb' }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M10 11l3-3-3-3M13 8H6" /></svg>
          {profile?.full_name?.split(' ')[0] || 'Salir'}
        </button>
      </div>
    </header>
  )
}

