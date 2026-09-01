'use client'

import Link from 'next/link'
import { ChevronDown, Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { PPLogo } from '@/components/brand/pp-logo'
import { getRoleLabel, hasCapability } from '@/lib/access-control'
import {
  ADMIN_NAVIGATION,
  CEO_NAVIGATION,
  DIRECTOR_NAVIGATION,
  SELLER_NAVIGATION,
  type NavigationSection,
} from '@/lib/navigation'
import type { Profile } from '@/lib/types'

function filterSections(profile: Profile, source: NavigationSection[]): NavigationSection[] {
  return source
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        const roleAllowed = !item.roles || item.roles.includes(profile.role)
        const capabilityAllowed = !item.anyCapabilities?.length || item.anyCapabilities.some((capability) => hasCapability(profile, capability))
        return roleAllowed && capabilityAllowed
      }),
    }))
    .filter((section) => section.items.length > 0)
}

function sourceForRole(profile: Profile): NavigationSection[] {
  if (profile.role === 'ceo') return CEO_NAVIGATION
  if (profile.role === 'admin') return ADMIN_NAVIGATION
  if (profile.role === 'director' || profile.role === 'subdirector') return DIRECTOR_NAVIGATION
  return SELLER_NAVIGATION
}

function visibleSections(profile: Profile | null): NavigationSection[] {
  if (!profile) return []
  return filterSections(profile, sourceForRole(profile))
}

export default function Sidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname()
  const navigationSections = visibleSections(profile)
  const [mobileOpen, setMobileOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const mobilePanelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!mobileOpen) return

    closeButtonRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMobileOpen(false)
        menuButtonRef.current?.focus()
        return
      }

      if (event.key !== 'Tab') return
      const panel = mobilePanelRef.current
      if (!panel) return
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), summary, input, select, textarea, [tabindex]:not([tabindex="-1"])'))
        .filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true')
      if (!focusable.length) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [mobileOpen])

  function closeMobileNavigation() {
    setMobileOpen(false)
  }

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
  }

  function sectionItems(section: NavigationSection) {
    return (
      <ul className="flex flex-col gap-0.5">
        {section.items.map((item) => {
          const active = isActive(item.href, item.exact)
          return (
            <li key={`${item.label}-${item.href}`}>
              <Link
                href={item.href}
                onClick={closeMobileNavigation}
                aria-current={active ? 'page' : undefined}
                className="flex min-h-11 items-center gap-2.5 border-l-2 px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)]"
                style={{
                  color: active ? 'var(--n3-text-light)' : 'var(--n3-text-muted)',
                  background: active ? 'rgba(255,255,255,0.035)' : 'transparent',
                  borderLeftColor: active ? 'var(--primary)' : 'transparent',
                }}
              >
                <span aria-hidden="true" className="h-2 w-2 border border-current" />
                <span className="truncate text-[13px]">{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    )
  }

  const navigation = (
    <>
      <div className="border-b border-[var(--n3-line)] px-5 py-5">
        <PPLogo className="w-full" priority />
        <p className="mt-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--n3-text-muted)]">Intelligence Platform</p>
      </div>
      <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto px-2 py-5">
        {navigationSections.map((section, index) => {
          const sectionActive = section.items.some((item) => isActive(item.href, item.exact))
          const collapsible = index > 0

          if (collapsible) {
            return (
              <details key={section.label} className="group mb-5" open={sectionActive || undefined}>
                <summary className="mb-1.5 flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--n3-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)] [&::-webkit-details-marker]:hidden">
                  <span>{section.label}</span>
                  <div className="h-px flex-1 bg-[var(--n3-line)]" />
                  <ChevronDown aria-hidden="true" size={13} className="transition-transform group-open:rotate-180" />
                </summary>
                {sectionItems(section)}
              </details>
            )
          }

          return (
            <div key={section.label} className="mb-5">
              <div className="mb-1.5 flex items-center gap-2 px-3">
                <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--n3-text-muted)]">{section.label}</span>
                <div className="h-px flex-1 bg-[var(--n3-line)]" />
              </div>
              {sectionItems(section)}
            </div>
          )
        })}
      </nav>
      <div className="border-t border-[var(--n3-line)] px-4 py-4">
        {profile ? (
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--n3-line)] text-xs font-semibold text-[var(--n3-teal-soft)]">
              {(profile.full_name || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs font-medium text-[var(--n3-text-light)]">{profile.full_name || 'Usuario'}</div>
              <div className="text-[10px] text-[var(--n3-text-muted)]">{getRoleLabel(profile.role)}</div>
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
      <button
        ref={menuButtonRef}
        type="button"
        aria-label={mobileOpen ? 'Cerrar navegación' : 'Abrir navegación'}
        aria-expanded={mobileOpen}
        aria-controls="mobile-navigation-panel"
        onClick={() => setMobileOpen((value) => !value)}
        className="fixed left-0 top-0 z-[60] flex h-14 w-14 items-center justify-center border-b border-r border-[var(--n3-line)] bg-[var(--n3-black)] text-[var(--n3-text-light)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)] md:hidden"
      >
        {mobileOpen ? <X aria-hidden="true" size={19} strokeWidth={1.6} /> : <Menu aria-hidden="true" size={19} strokeWidth={1.6} />}
      </button>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={closeMobileNavigation}
            className="absolute inset-0 bg-black/70"
          />
          <aside
            id="mobile-navigation-panel"
            ref={mobilePanelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-navigation-title"
            className="absolute bottom-0 left-0 top-14 flex w-[min(86vw,320px)] flex-col border-r border-t border-[var(--n3-line)] bg-[var(--n3-black)]"
          >
            <div className="flex min-h-12 items-center justify-between border-b border-[var(--n3-line)] px-4">
              <h2 id="mobile-navigation-title" className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Navegación</h2>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Cerrar navegación"
                onClick={() => {
                  closeMobileNavigation()
                  menuButtonRef.current?.focus()
                }}
                className="flex h-11 w-11 items-center justify-center text-[var(--n3-text-light)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)]"
              >
                <X aria-hidden="true" size={18} strokeWidth={1.6} />
              </button>
            </div>
            {navigation}
          </aside>
        </div>
      ) : null}

      <aside className="hidden h-full w-60 shrink-0 flex-col border-r border-[var(--n3-line)] bg-[var(--n3-black)] md:flex">{navigation}</aside>
    </>
  )
}
