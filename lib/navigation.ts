import type { Capability } from '@/lib/access-control'
import type { UserRole } from '@/lib/types'

export type NavigationItem = {
  label: string
  href: string
  exact?: boolean
  anyCapabilities?: Capability[]
  roles?: UserRole[]
}

export type NavigationSection = {
  label: string
  items: NavigationItem[]
}

export const CEO_NAVIGATION: NavigationSection[] = [
  {
    label: 'Principal',
    items: [
      { label: '01 · Control', href: '/dashboard/ceo', anyCapabilities: ['dashboard.global.read'] },
      { label: '02 · Mercado', href: '/dashboard/market', anyCapabilities: ['market.read'] },
      { label: '03 · Valorización', href: '/dashboard/valuations', anyCapabilities: ['valuations.global.read'] },
      { label: '04 · Ficha 360', href: '/dashboard/properties', anyCapabilities: ['properties.global.read'] },
      { label: '05 · Informes', href: '/dashboard/reportes/canonicos', anyCapabilities: ['reports.global.read'] },
      { label: 'Pedro Pablo', href: '/dashboard/pedro-pablo', anyCapabilities: ['dashboard.global.read'] },
    ],
  },
]

export const ADMIN_NAVIGATION: NavigationSection[] = [
  {
    label: 'Principal',
    items: [
      { label: 'Hoy', href: '/dashboard', exact: true, anyCapabilities: ['dashboard.global.read'] },
      { label: 'Mercado', href: '/dashboard/market', anyCapabilities: ['market.read'] },
      { label: 'Valorizaciones', href: '/dashboard/valuations', anyCapabilities: ['valuations.global.read'] },
      { label: 'Propiedades', href: '/dashboard/properties', anyCapabilities: ['properties.global.read'] },
      { label: 'Informes', href: '/dashboard/reportes/canonicos', anyCapabilities: ['reports.global.read'] },
    ],
  },
  {
    label: 'Administración',
    items: [
      { label: 'Gestión', href: '/dashboard/control/operations', anyCapabilities: ['management.global.read'] },
      { label: 'Metas y alertas', href: '/dashboard/control/admin', anyCapabilities: ['management.global.manage'] },
      { label: 'Datos y metodología', href: '/dashboard/market/fuentes', anyCapabilities: ['market.manage_sources', 'settings.manage'] },
      { label: 'Asignaciones', href: '/dashboard/properties/admin', anyCapabilities: ['properties.global.assign'] },
      { label: 'Usuarios y configuración', href: '/dashboard/settings', anyCapabilities: ['users.manage', 'settings.manage'] },
    ],
  },
]

export const DIRECTOR_NAVIGATION: NavigationSection[] = [
  {
    label: 'Principal',
    items: [
      { label: 'Hoy', href: '/dashboard/director', anyCapabilities: ['dashboard.office.read'] },
      { label: 'Mercado', href: '/dashboard/market', anyCapabilities: ['market.read'] },
      { label: 'Valorizaciones', href: '/dashboard/valuations', anyCapabilities: ['valuations.office.read'] },
      { label: 'Propiedades', href: '/dashboard/properties', anyCapabilities: ['properties.office.read'] },
      { label: 'Informes', href: '/dashboard/director/reporte', anyCapabilities: ['reports.office.read'] },
    ],
  },
  {
    label: 'Administración',
    items: [
      { label: 'Gestión', href: '/dashboard/control/operations', anyCapabilities: ['management.office.read'] },
      { label: 'Metas y alertas', href: '/dashboard/control/admin', anyCapabilities: ['management.office.manage'] },
      { label: 'Asignaciones', href: '/dashboard/properties/admin', anyCapabilities: ['properties.office.assign'] },
    ],
  },
]

export const SELLER_NAVIGATION: NavigationSection[] = [
  {
    label: 'Principal',
    items: [
      { label: 'Hoy', href: '/dashboard/partner', anyCapabilities: ['dashboard.self.read'] },
      { label: 'Mercado', href: '/dashboard/market', anyCapabilities: ['market.read'] },
      { label: 'Valorizaciones', href: '/dashboard/valuations', anyCapabilities: ['valuations.self.read'] },
      { label: 'Propiedades', href: '/dashboard/properties', anyCapabilities: ['properties.self.read'] },
      { label: 'Mi reporte', href: '/dashboard/reportes/audiencias/ejecutivo', anyCapabilities: ['reports.self.read'] },
    ],
  },
]

// Kept for compatibility with existing imports; non-CEO default is the technical admin profile.
export const DEFAULT_NAVIGATION = ADMIN_NAVIGATION
