'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PPLogo } from '@/components/brand/pp-logo'
import { hasCapability, type Capability } from '@/lib/access-control'
import type { Profile } from '@/lib/types'

type SidebarItem = {
  label: string
  href: string
  capability?: Capability
  exact?: boolean
}

type SidebarSection = {
  label: string
  items: SidebarItem[]
}

const sections: SidebarSection[] = [
  {
    label: 'Operación',
    items: [
      { label: 'Resumen', href: '/dashboard', exact: true },
      { label: 'Vista CEO', href: '/dashboard/ceo', capability: 'dashboard.global.read' },
      { label: 'Vista director', href: '/dashboard/director', capability: 'dashboard.office.read' },
      { label: 'Mi desempeño', href: '/dashboard/partner', capability: 'dashboard.self.read' },
      { label: 'Inteligencia de mercado', href: '/dashboard/market', capability: 'market.read' },
      { label: 'Valorizaciones', href: '/dashboard/valuations' },
      { label: 'Control de gestión', href: '/dashboard/control' },
      { label: 'Propiedades', href: '/dashboard/properties' },
      { label: 'Reportes', href: '/dashboard/reportes/autonomos', capability: 'reports.global.read' },
      { label: 'Reportes de oficina', href: '/dashboard/reportes/autonomos', capability: 'reports.office.read' },
      { label: 'Mi reporte', href: '/dashboard/reportes/audiencias/ejecutivo', capability: 'reports.self.read' },
    ],
  },
  {
    label: 'Administración',
    items: [
      { label: 'Asignar propiedades', href: '/dashboard/properties/admin', capability: 'properties.global.assign' },
      { label: 'Asignar propiedades', href: '/dashboard/properties/admin', capability: 'properties.office.assign' },
      { label: 'Metas y alertas', href: '/dashboard/control/admin', capability: 'management.global.manage' },
      { label: 'Metas y alertas', href: '/dashboard/control/admin', capability: 'management.office.manage' },
      { label: 'Fuentes de mercado', href: '/dashboard/market/fuentes', capability: 'market.manage_sources' },
      { label: 'Importar mercado', href: '/dashboard/market/import', capability: 'market.manage_sources' },
      { label: 'Fuentes de propiedades', href: '/dashboard/sources', capability: 'settings.manage' },
      { label: 'Usuarios y configuración', href: '/dashboard/settings', capability: 'users.manage' },
    ],
  },
]

function visibleSections(profile: Profile | null): SidebarSection[] {
  if (!profile) return []

  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.capability || hasCapability(profile, item.capability)),
    }))
    .filter((section) => section.items.length > 0)
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
                const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <li key={`${item.label}-${item.href}`}>
                    <Link
                      href={item.href}
                      onClick={(event) => event.currentTarget.closest('details')?.removeAttribute('open')}
                      className="flex items-center gap-2.5 border-l-2 px-3 py-2.5 text-sm transition-colors"
                      style={{
                        color: active ? 'var(--n3-text-light)' : 'var(--n3-text-muted)',
                        background: active ? 'rgba(255,255,255,0.035)' : 'transparent',
                        borderLeftColor: active ? '#d7332b' : 'transparent',
                      }}
                    >
                      <span aria-hidden="true" className="h-2 w-2 border border-current" />
                      <span className="truncate text-[13px]">{item.label}</span>
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
              <div className="text-[10px] capitalize text-[var(--n3-text-muted)]">{profile.role}</div>
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
