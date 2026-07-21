'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PPLogo } from '@/components/brand/pp-logo'
import type { Profile } from '@/lib/types'

const navItems = [
  {
    label: 'Panel',
    href: '/dashboard',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="6" height="6" rx="1" /><rect x="9" y="1" width="6" height="6" rx="1" /><rect x="1" y="9" width="6" height="6" rx="1" /><rect x="9" y="9" width="6" height="6" rx="1" /></svg>,
    exact: true,
  },
  {
    label: 'Control de Gestion',
    href: '/dashboard/control',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="2,12 5,8 8,10 11,5 14,7" /><line x1="2" y1="14" x2="14" y2="14" /></svg>,
  },
  {
    label: 'Datos CRM',
    href: '/dashboard/datos-crm',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4c0-1.1 2.7-2 6-2s6 .9 6 2-2.7 2-6 2-6-.9-6-2Z" /><path d="M2 4v4c0 1.1 2.7 2 6 2s6-.9 6-2V4" /><path d="M2 8v4c0 1.1 2.7 2 6 2s6-.9 6-2V8" /></svg>,
  },
  {
    label: 'Metas 2026',
    href: '/dashboard/metas',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6" /><circle cx="8" cy="8" r="3" /><path d="M8 1v3M15 8h-3" /></svg>,
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
    label: 'Configuracion',
    href: '/dashboard/settings',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="2.5" /><path d="M8 1.5v1.2M8 13.3v1.2M1.5 8h1.2M13.3 8h1.2M3.3 3.3l.85.85M11.85 11.85l.85.85M11.85 4.15l-.85.85M4.15 11.85l-.85.85" /></svg>,
  },
]

const roleNavItems = [
  {
    label: 'Vista CEO',
    href: '/dashboard/ceo',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="8,2 14,6 14,10 8,14 2,10 2,6" /><circle cx="8" cy="8" r="2" /></svg>,
  },
  {
    label: 'Vista Director',
    href: '/dashboard/director',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="5" r="2.5" /><path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5" /><circle cx="13" cy="5" r="1.5" /><path d="M14.5 12c0-1.7 1.3-3 3-3" strokeWidth="1.2" /></svg>,
  },
  {
    label: 'Agente',
    href: '/dashboard/agente',
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="5" r="2.5" /><path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5" /><polyline points="6,10 8,12 11,9" /></svg>,
  },
]

export default function Sidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-[var(--n3-line)] bg-[var(--n3-black)]">
      <div className="flex items-center gap-2.5 border-b border-[var(--n3-line)] px-4 py-4">
        <div className="w-24 shrink-0 rounded-md bg-[var(--n3-dark-surface)] px-2 py-1">
          <PPLogo className="h-6 w-auto" priority />
        </div>
        <div>
          <div className="text-sm font-semibold leading-none tracking-tight text-[var(--n3-text-light)]">N3uralia</div>
          <div className="mt-0.5 text-[10px]" style={{ color: 'var(--n3-text-muted)' }}>Intelligent operations</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-2.5 rounded px-3 py-2 text-sm transition-all"
                  style={{
                    color: isActive ? 'var(--n3-text-light)' : 'var(--n3-text-muted)',
                    background: isActive ? 'rgba(139,169,167,0.08)' : 'transparent',
                    borderLeft: isActive ? '2px solid var(--n3-teal)' : '2px solid transparent',
                  }}
                >
                  <span style={{ color: isActive ? 'var(--n3-teal)' : 'var(--n3-text-muted)' }}>{item.icon}</span>
                  <span className="truncate text-[13px]">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="mt-4 mb-1 flex items-center gap-2 px-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--n3-text-muted)' }}>Paneles</span>
          <div className="h-px flex-1" style={{ background: 'var(--n3-line)' }} />
        </div>
        <ul className="flex flex-col gap-0.5">
          {roleNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-2.5 rounded px-3 py-2 text-sm transition-all"
                  style={{
                    color: isActive ? 'var(--n3-text-light)' : 'var(--n3-text-muted)',
                    background: isActive ? 'rgba(139,169,167,0.08)' : 'transparent',
                    borderLeft: isActive ? '2px solid var(--n3-teal)' : '2px solid transparent',
                  }}
                >
                  <span style={{ color: isActive ? 'var(--n3-teal)' : 'var(--n3-text-muted)' }}>{item.icon}</span>
                  <span className="truncate text-[13px]">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-[var(--n3-line)] px-3 py-3">
        {profile ? (
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold" style={{ background: 'rgba(139,169,167,0.14)', color: 'var(--n3-teal)' }}>
              {(profile.full_name || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs font-medium text-[var(--n3-text-light)]">{profile.full_name || 'Usuario'}</div>
              <div className="text-[10px] capitalize" style={{ color: 'var(--n3-text-muted)' }}>{profile.role}</div>
            </div>
          </div>
        ) : null}
        <div className="mt-3 border-t border-[var(--n3-line)] pt-3 text-[11px] leading-tight" style={{ color: 'var(--n3-text-muted)' }}>
          Powered by{' '}
          <a href="https://n3uralia.com" target="_blank" rel="noreferrer" className="font-medium hover:opacity-80" style={{ color: 'var(--n3-teal)' }}>
            N3uralia
          </a>
        </div>
      </div>
    </aside>
  )
}
