'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Profile } from '@/lib/types'

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="6" height="6" rx="1" /><rect x="9" y="1" width="6" height="6" rx="1" /><rect x="1" y="9" width="6" height="6" rx="1" /><rect x="9" y="9" width="6" height="6" rx="1" /></svg>,
    exact: true,
  },
  {
    label: 'Control de Gestión',
    href: '/dashboard/control',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="2,12 5,8 8,10 11,5 14,7" /><line x1="2" y1="14" x2="14" y2="14" /></svg>,
  },
  {
    label: 'Casas Vitacura',
    href: '/dashboard/properties',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 7L8 2l6 5v7H10v-4H6v4H2z" /></svg>,
  },
  {
    label: 'Inteligencia de Mercado',
    href: '/dashboard/market',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6" /><line x1="8" y1="2" x2="8" y2="14" /><line x1="2" y1="8" x2="14" y2="8" /><path d="M4.5 4.5c1 .4 2.3.8 3.5.8s2.5-.4 3.5-.8" /><path d="M4.5 11.5c1-.4 2.3-.8 3.5-.8s2.5.4 3.5.8" /></svg>,
  },
  {
    label: 'Importar Mercado',
    href: '/dashboard/market/import',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 1v8" /><path d="M5.5 6.5L8 9l2.5-2.5" /><path d="M3 11.5h10" /><path d="M3 13.5h10" /></svg>,
  },
  {
    label: 'Valorizador IA',
    href: '/dashboard/valorizador',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="3" /><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4" /></svg>,
  },
  {
    label: 'Reportes IA',
    href: '/dashboard/reportes',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 2h7l3 3v9H3z" /><polyline points="10,2 10,5 13,5" /><line x1="5" y1="8" x2="11" y2="8" /><line x1="5" y1="11" x2="9" y2="11" /></svg>,
  },
  {
    label: 'Conocimiento Casas',
    href: '/dashboard/knowledge',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3h5l1 1h6v9H2z" /><line x1="5" y1="8" x2="11" y2="8" /><line x1="5" y1="10.5" x2="9" y2="10.5" /></svg>,
  },
  {
    label: 'Fuentes Casas',
    href: '/dashboard/sources',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><ellipse cx="8" cy="5" rx="5" ry="2" /><path d="M3 5v3c0 1.1 2.2 2 5 2s5-.9 5-2V5" /><path d="M3 8v3c0 1.1 2.2 2 5 2s5-.9 5-2V8" /></svg>,
  },
  {
    label: 'Configuración',
    href: '/dashboard/settings',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="2.5" /><path d="M8 1.5v1.2M8 13.3v1.2M1.5 8h1.2M13.3 8h1.2M3.3 3.3l.85.85M11.85 11.85l.85.85M11.85 4.15l-.85.85M4.15 11.85l-.85.85" /></svg>,
  },
]

export default function Sidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col w-56 shrink-0 border-r h-full bg-white border-gray-200">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4" style={{ borderBottom: '1px solid #d8e5e2' }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#8fb2aa' }}>
          <svg width="15" height="15" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="3" fill="white" /><circle cx="9" cy="9" r="7" stroke="white" strokeWidth="1.5" strokeDasharray="3 2" /></svg>
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight leading-none text-gray-900">N3uralia</div>
          <div className="text-[10px] mt-0.5" style={{ color: '#9ca9a3' }}>Intelligence Platform</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        <ul className="flex flex-col gap-0.5">
          {navItems.map(item => {
            const isActive = item.exact ? pathname === item.href : (pathname === item.href || pathname.startsWith(item.href + '/'))
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-all"
                  style={{
                    color: isActive ? '#173634' : '#9ca9a3',
                    background: isActive ? '#e8f3f0' : 'transparent',
                    borderLeft: isActive ? '2px solid #8fb2aa' : '2px solid transparent',
                  }}
                >
                  <span style={{ color: isActive ? '#8fb2aa' : '#b9bfbc' }}>{item.icon}</span>
                  <span className="truncate text-[13px]">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User */}
      {profile && (
        <div className="px-3 py-3" style={{ borderTop: '1px solid #d8e5e2' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0" style={{ background: '#e8f3f0', color: '#8fb2aa' }}>
              {(profile.full_name || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium truncate text-gray-900">{profile.full_name || 'Usuario'}</div>
              <div className="text-[10px] capitalize" style={{ color: '#9ca9a3' }}>{profile.role}</div>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
