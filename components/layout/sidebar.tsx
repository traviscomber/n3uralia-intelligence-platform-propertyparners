'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PPLogo } from '@/components/brand/pp-logo'
import { getRoleLabel, hasCapability, type Capability } from '@/lib/access-control'
import type { Profile } from '@/lib/types'

type SidebarItem = {
  label: string
  ceoLabel?: string
  href: string
  capability?: Capability
  anyCapability?: readonly Capability[]
  roles?: readonly Profile['role'][]
  excludeRoles?: readonly Profile['role'][]
  exact?: boolean
}

type SidebarSection = {
  label: string
  items: SidebarItem[]
}

const sections: SidebarSection[] = [
  {
    label: 'Principal',
    items: [
      { label: 'Inicio', href: '/dashboard', exact: true, excludeRoles: ['ceo'] },
      { label: 'Vista ejecutiva', ceoLabel: 'Inicio ejecutivo', href: '/dashboard/ceo', capability: 'dashboard.global.read' },
      { label: 'Vista de oficina', href: '/dashboard/director', capability: 'dashboard.office.read' },
      { label: 'Mi desempeño', href: '/dashboard/partner', capability: 'dashboard.self.read' },
    ],
  },
  {
    label: 'Negocio',
    items: [
      {
        label: 'Propiedades',
        ceoLabel: 'Propiedades y cartera',
        href: '/dashboard/properties',
        anyCapability: ['properties.global.read', 'properties.office.read', 'properties.self.read'],
      },
      {
        label: 'Valorizaciones',
        href: '/dashboard/valuations',
        anyCapability: ['valuations.global.read', 'valuations.office.read', 'valuations.self.read'],
      },
      { label: 'Inteligencia de mercado', ceoLabel: 'Mercado', href: '/dashboard/market', capability: 'market.read' },
      {
        label: 'Control de gestión',
        ceoLabel: 'Resultados comerciales',
        href: '/dashboard/control',
        anyCapability: ['management.global.read', 'management.office.read', 'management.self.read'],
      },
      {
        label: 'CRM y decisiones',
        ceoLabel: 'Decisiones pendientes',
        href: '/dashboard/datos-crm',
        anyCapability: ['dashboard.global.read', 'dashboard.office.read'],
      },
    ],
  },
  {
    label: 'Reportes',
    items: [
      {
        label: 'Centro de reportes',
        ceoLabel: 'Reportes ejecutivos',
        href: '/dashboard/reportes',
        anyCapability: ['reports.global.read', 'reports.office.read', 'reports.self.read'],
        exact: true,
      },
      {
        label: 'Directorio ejecutivo',
        href: '/dashboard/reportes/directorio',
        capability: 'reports.global.read',
      },
      {
        label: 'Entregas programadas',
        href: '/dashboard/document-delivery',
        anyCapability: ['reports.global.read', 'reports.office.read'],
      },
    ],
  },
  {
    label: 'Administración',
    items: [
      {
        label: 'Asignación de propiedades',
        href: '/dashboard/properties/admin',
        anyCapability: ['properties.global.assign', 'properties.office.assign'],
      },
      {
        label: 'Metas y alertas',
        href: '/dashboard/control/admin',
        anyCapability: ['management.global.manage', 'management.office.manage'],
      },
      { label: 'Fuentes de mercado', href: '/dashboard/market/fuentes', capability: 'market.manage_sources' },
      { label: 'Importar mercado', href: '/dashboard/market/import', capability: 'market.manage_sources' },
      { label: 'Fuentes de propiedades', href: '/dashboard/sources', capability: 'settings.manage' },
      { label: 'Usuarios y configuración', href: '/dashboard/settings', capability: 'users.manage' },
    ],
  },
]

function canSeeItem(profile: Profile, item: SidebarItem) {
  if (item.excludeRoles?.includes(profile.role)) return false
  if (item.roles && !item.roles.includes(profile.role)) return false
  if (item.capability && !hasCapability(profile, item.capability)) return false
  if (item.anyCapability && !item.anyCapability.some((capability) => hasCapability(profile, capability))) return false
  return true
}

function visibleSections(profile: Profile | null): SidebarSection[] {
  if (!profile) return []

  return sections
    .map((section) => {
      const seen = new Set<string>()
      const items = section.items.filter((item) => {
        if (!canSeeItem(profile, item)) return false
        const key = `${item.href}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      return { ...section, items }
    })
    .filter((section) => section.items.length > 0)
}

function isActive(pathname: string, item: SidebarItem) {
  if (item.href === '/dashboard/reportes') return pathname.startsWith('/dashboard/reportes') || pathname === '/dashboard/document-delivery'
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)
}

function visibleLabel(profile: Profile | null, item: SidebarItem) {
  return profile?.role === 'ceo' && item.ceoLabel ? item.ceoLabel : item.label
}

export default function Sidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname()
  const navigationSections = visibleSections(profile)

  const navigation = (
    <>
      <div className="border-b border-[var(--n3-line)] px-5 py-5">
        <PPLogo className="w-full" priority />
        <p className="mt-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--n3-text-muted)]">Intelligence Platform</p>
      </div>
      <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto px-2 py-5">
        {navigationSections.map((section) => (
          <div key={section.label} className="mb-5">
            <div className="mb-1.5 flex items-center gap-2 px-3">
              <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--n3-text-muted)]">{section.label}</span>
              <div className="h-px flex-1 bg-[var(--n3-line)]" />
            </div>
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = isActive(pathname, item)
                const label = visibleLabel(profile, item)
                return (
                  <li key={`${label}-${item.href}`}>
                    <Link
                      href={item.href}
                      onClick={(event) => event.currentTarget.closest('details')?.removeAttribute('open')}
                      aria-current={active ? 'page' : undefined}
                      className="flex items-center gap-2.5 border-l-2 px-3 py-2.5 text-sm transition-colors"
                      style={{
                        color: active ? 'var(--n3-text-light)' : 'var(--n3-text-muted)',
                        background: active ? 'rgba(255,255,255,0.035)' : 'transparent',
                        borderLeftColor: active ? '#d7332b' : 'transparent',
                      }}
                    >
                      <span aria-hidden="true" className="h-2 w-2 border border-current" />
                      <span className="truncate text-[13px]">{label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-[var(--n3-line)] px-4 py-4">
        {profile ? (
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--n3-line)] text-xs font-semibold text-[#ff766f]">
              {(profile.full_name || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs font-medium text-[var(--n3-text-light)]">{profile.full_name || 'Usuario'}</div>
              <div className="text-[10px] text-[var(--n3-text-muted)]">{getRoleLabel(profile.role)}</div>
              {profile.role === 'ceo' ? <div className="mt-0.5 text-[9px] uppercase tracking-[0.14em] text-[#ff766f]">Vista ejecutiva</div> : null}
            </div>
          </div>
        ) : null}
        <div className="mt-4 border-t border-[var(--n3-line)] pt-3 text-[10px] leading-4 text-[var(--n3-text-muted)]">
          Plataforma desarrollada por <a href="https://n3uralia.com" target="_blank" rel="noreferrer" className="font-medium text-[var(--n3-text-light)] hover:opacity-80">N3uralia</a>
        </div>
      </div>
    </>
  )

  return (
    <>
      <details className="group fixed left-0 top-0 z-50 md:hidden">
        <summary aria-label="Abrir navegación" className="flex h-14 w-14 cursor-pointer list-none items-center justify-center border-b border-r border-[var(--n3-line)] bg-[var(--n3-black)] text-[var(--n3-text-light)] [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true">☰</span>
        </summary>
        <div className="fixed inset-x-0 bottom-0 top-14 flex flex-col border-t border-[var(--n3-line)] bg-[var(--n3-black)] shadow-2xl">{navigation}</div>
      </details>
      <aside className="hidden h-full w-60 shrink-0 flex-col border-r border-[var(--n3-line)] bg-[var(--n3-black)] md:flex">{navigation}</aside>
    </>
  )
}
