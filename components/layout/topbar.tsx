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
    <header className="sticky top-0 z-40 flex items-center justify-between px-6 py-4 border-b bg-white">
      <p className="text-xs capitalize text-gray-500">{dateStr}</p>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-green-100 text-green-700">
          <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse inline-block" />
          IA Activa
        </div>
        <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M10 11l3-3-3-3M13 8H6" /></svg>
          {profile?.full_name?.split(' ')[0] || 'Salir'}
        </button>
      </div>
    </header>
  )
}
