'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { PPLogo } from '@/components/brand/pp-logo'
import type { Profile } from '@/lib/types'

type SidebarItem = { label: string; href: string; icon: ReactNode; exact?: boolean }
type SidebarSection = { label: string; items: SidebarItem[] }

const icons = {
  dashboard: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1.5" y="1.5" width="5" height="5" /><rect x="9.5" y="1.5" width="5" height="5" /><rect x="1.5" y="9.5" width="5" height="5" /><rect x="9.5" y="9.5" width="5" height="5" /></svg>,
  market: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6" /><path d="M2 8h12M8 2c2 1.7 3 3.7 3 6s-1 4.3-3 6c-2-1.7-3-3.7-3-6s1-4.3 3-6Z" /></svg>,
  valuation: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 7 8 2l6 5v7H2Z" /><path d="M5 10h6M8 7v6" /></svg>,
  reports: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="12" height="12" /><path d="M5 11V8M8 11V5M11 11V7" /></svg>,
  properties: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 7 8 2l6 5v7H10v-4H6v4H2Z" /></svg>,
  control: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m2 12 3-4 3 2 3-5 3 2" /><path d="M2 14h12" /></svg>,
  sources: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><ellipse cx="8" cy="4" rx="5" ry="2" /><path d="M3 4v4c0 1.1 2.2 2 5 2s5-.9 5-2V4M3 8v4c0 1.1 2.2 2 5 2s5-.9 5-2V8" /></svg>,
  settings: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="2.5" /><path d="M8 1.5v1.3M8 13.2v1.3M1.5 8h1.3M13.2 8h1.3M3.4 3.4l.9.9M11.7 11.7l.9.9M12.6 3.4l-.9.9M4.3 11.7l-.9.9" /></svg>,
  future: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3" /><circle cx="8" cy="8" r="3" /></svg>,
}

const items = {
  home: { label: 'Resumen', href: '/dashboard', icon: icons.dashboard, exact: true },
  ceo: { label: 'Vista CEO', href: '/dashboard/ceo', icon: icons.dashboard },
  director: { label: 'Vista director', href: '/dashboard/director', icon: icons.dashboard },
  partner: { label: 'Mi desempeño', href: '/dashboard/partner', icon: icons.control },
  market: { label: 'Inteligencia de mercado', href: '/dashboard/market', icon: icons.market },
  valuation: { label: 'Valorización', href: '/dashboard/valuation', icon: icons.valuation },
  properties: { label: 'Propiedades', href: '/dashboard/properties', icon: icons.properties },
  control: { label: 'Control de gestión', href: '/dashboard/control', icon: icons.control },
  controlAdmin: { label: 'Metas y alertas', href: '/dashboard/control/admin', icon: icons.settings },
  reports: { label: 'Reportes', href: '/dashboard/reportes/autonomos', icon: icons.reports },
  marketSources: { label: 'Fuentes de mercado', href: '/dashboard/market/fuentes', icon: icons.sources },
  marketImport: { label: 'Importar mercado', href: '/dashboard/market/import', icon: icons.sources },
  sources: { label: 'Fuentes de propiedades', href: '/dashboard/sources', icon: icons.sources },
  settings: { label: 'Usuarios y configuración', href: '/dashboard/settings', icon: icons.settings },
  version2: { label: 'Versión 2', href: '/dashboard/version-2', icon: icons.future },
} satisfies Record<string, SidebarItem>

const executiveSections: SidebarSection[] = [
  { label: 'Operación', items: [items.home, items.ceo, items.market, items.valuation, items.control, items.properties, items.reports] },
  { label: 'Administración', items: [items.controlAdmin, items.marketSources, items.marketImport, items.sources, items.settings] },
  { label: 'Futuro', items: [items.version2] },
]

const directorSections: SidebarSection[] = [
  { label: 'Operación', items: [items.home, items.director, items.market, items.valuation, items.control, items.properties, items.reports] },
  { label: 'Administración', items: [items.controlAdmin] },
  { label: 'Futuro', items: [items.version2] },
]

const sellerSections: SidebarSection[] = [
  { label: 'Operación', items: [items.home, items.partner, items.market, items.valuation, items.properties, items.reports] },
  { label: 'Futuro', items: [items.version2] },
]

function NavigationLinks({ items: sectionItems, pathname }: { items: SidebarItem[]; pathname: string }) {
  return (
    <ul className="flex flex-col gap-0.5">
      {sectionItems.map((item) => {
        const isActive = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <li key={item.href}>
            <Link href={item.href} onClick={(event) => event.currentTarget.closest('details')?.removeAttribute('open')} className="flex items-center gap-2.5 border-l-2 px-3 py-2.5 text-sm transition-colors" style={{ color: isActive ? 'var(--n3-text-light)' : 'var(--n3-text-muted)', background: isActive ? 'rgba(255,255,255,0.035)' : 'transparent', borderLeftColor: isActive ? '#d7332b' : 'transparent' }}>
              <span style={{ color: isActive ? '#ff766f' : 'var(--n3-text-muted)' }}>{item.icon}</span>
              <span className="truncate text-[13px]">{item.label}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function SectionNavigation({ sections, pathname }: { sections: SidebarSection[]; pathname: string }) {
  return sections.map((section) => (
    <div key={section.label} className="mb-5">
      <div className="mb-1.5 flex items-center gap-2 px-3"><span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--n3-text-muted)]">{section.label}</span><div className="h-px flex-1 bg-[var(--n3-line)]" /></div>
      <NavigationLinks items={section.items} pathname={pathname} />
    </div>
  ))
}

export default function Sidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname()
  const isExecutive = profile?.role === 'ceo' || profile?.role === 'admin'
  const isDirector = profile?.role === 'director' || profile?.role === 'subdirector'
  const sections = isExecutive ? executiveSections : isDirector ? directorSections : sellerSections

  const navigation = (
    <>
      <div className="border-b border-[var(--n3-line)] px-5 py-5"><PPLogo className="w-full" priority /><p className="mt-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--n3-text-muted)]">Intelligence Platform</p></div>
      <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto px-2 py-5"><SectionNavigation sections={sections} pathname={pathname} /></nav>
      <div className="border-t border-[var(--n3-line)] px-4 py-4">
        {profile ? <div className="flex items-center gap-2.5"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--n3-line)] text-xs font-semibold text-[#ff766f]">{(profile.full_name || 'U').charAt(0).toUpperCase()}</div><div className="min-w-0"><div className="truncate text-xs font-medium text-[var(--n3-text-light)]">{profile.full_name || 'Usuario'}</div><div className="text-[10px] capitalize text-[var(--n3-text-muted)]">{profile.role}</div></div></div> : null}
        <div className="mt-4 border-t border-[var(--n3-line)] pt-3 text-[10px] leading-4 text-[var(--n3-text-muted)]">Plataforma desarrollada por <a href="https://n3uralia.com" target="_blank" rel="noreferrer" className="font-medium text-[var(--n3-text-light)] hover:opacity-80">N3uralia</a></div>
      </div>
    </>
  )

  return (
    <>
      <details className="group fixed left-0 top-0 z-50 md:hidden"><summary aria-label="Abrir navegación" className="flex h-14 w-14 cursor-pointer list-none items-center justify-center border-b border-r border-[var(--n3-line)] bg-[var(--n3-black)] text-[var(--n3-text-light)] [&::-webkit-details-marker]:hidden"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5h14M3 10h14M3 15h14" /></svg></summary><div className="fixed inset-x-0 bottom-0 top-14 flex flex-col border-t border-[var(--n3-line)] bg-[var(--n3-black)] shadow-2xl">{navigation}</div></details>
      <aside className="hidden h-full w-60 shrink-0 flex-col border-r border-[var(--n3-line)] bg-[var(--n3-black)] md:flex">{navigation}</aside>
    </>
  )
}
