import type { Capability } from '@/lib/access-control'
import type { UserRole } from '@/lib/types'

export type NavigationItem = {
  label: string
  href: string
  exact?: boolean
  anyCapabilities?: Capability[]
  roles?: UserRole[]
  /** A secondary heading inside the single collapsed "Más herramientas" area. */
  group?: 'Inicio' | 'Expedientes y cartera' | 'Gestión' | 'Administración'
}

export type NavigationSection = {
  label: string
  items: NavigationItem[]
}

/**
 * Client-approved primary navigation: Mercado, Valorizador and Reportes.
 * Everything else remains reachable via "Más herramientas" with the same
 * capability checks, role-specific reports and existing routes.
 */
export const CEO_NAVIGATION: NavigationSection[] = [
  {
    label: 'Tres pilares',
    items: [
      { label: 'Mercado', href: '/dashboard/market', anyCapabilities: ['market.read'] },
      { label: 'Valorizador', href: '/dashboard/valuation', anyCapabilities: ['valuations.self.create', 'valuations.office.review', 'valuations.global.approve'] },
      { label: 'Reportes', href: '/dashboard/reportes/canonicos', anyCapabilities: ['reports.global.read'] },
    ],
  },
  {
    label: 'Más herramientas',
    items: [
      { label: 'Hoy', href: '/dashboard/ceo', anyCapabilities: ['dashboard.global.read'], group: 'Inicio' },
      { label: 'Valorizaciones', href: '/dashboard/valuations', anyCapabilities: ['valuations.global.read'], group: 'Expedientes y cartera' },
      { label: 'Por resolver', href: '/dashboard/properties', anyCapabilities: ['properties.global.read'], group: 'Expedientes y cartera' },
      { label: 'Gestión', href: '/dashboard/control/operations', anyCapabilities: ['management.global.read'], group: 'Gestión' },
    ],
  },
]

export const ADMIN_NAVIGATION: NavigationSection[] = [
  {
    label: 'Tres pilares',
    items: [
      { label: 'Mercado', href: '/dashboard/market', anyCapabilities: ['market.read'] },
      { label: 'Valorizador', href: '/dashboard/valuation', anyCapabilities: ['valuations.self.create', 'valuations.office.review', 'valuations.global.approve'] },
      { label: 'Reportes', href: '/dashboard/reportes/canonicos', anyCapabilities: ['reports.global.read'] },
    ],
  },
  {
    label: 'Más herramientas',
    items: [
      { label: 'Hoy', href: '/dashboard', exact: true, anyCapabilities: ['dashboard.global.read'], group: 'Inicio' },
      { label: 'Valorizaciones', href: '/dashboard/valuations', anyCapabilities: ['valuations.global.read'], group: 'Expedientes y cartera' },
      { label: 'Por resolver', href: '/dashboard/properties', anyCapabilities: ['properties.global.read'], group: 'Expedientes y cartera' },
      { label: 'Cartera y asignaciones', href: '/dashboard/properties/admin', anyCapabilities: ['properties.global.assign'], group: 'Expedientes y cartera' },
      { label: 'Seguimiento general', href: '/dashboard/control/operations', anyCapabilities: ['management.global.read'], group: 'Gestión' },
      { label: 'Metas y alertas', href: '/dashboard/control/admin', anyCapabilities: ['management.global.manage'], group: 'Gestión' },
      { label: 'Datos y fuentes', href: '/dashboard/market/fuentes', anyCapabilities: ['market.manage_sources', 'settings.manage'], group: 'Administración' },
      { label: 'Usuarios', href: '/dashboard/settings', anyCapabilities: ['users.manage', 'settings.manage'], group: 'Administración' },
    ],
  },
]

export const DIRECTOR_NAVIGATION: NavigationSection[] = [
  {
    label: 'Tres pilares',
    items: [
      { label: 'Mercado', href: '/dashboard/market', anyCapabilities: ['market.read'] },
      { label: 'Valorizador', href: '/dashboard/valuation', anyCapabilities: ['valuations.self.create', 'valuations.office.review', 'valuations.global.approve'] },
      { label: 'Reportes', href: '/dashboard/director/reporte', anyCapabilities: ['reports.office.read'] },
    ],
  },
  {
    label: 'Más herramientas',
    items: [
      { label: 'Hoy', href: '/dashboard/director', anyCapabilities: ['dashboard.office.read'], group: 'Inicio' },
      { label: 'Valorizaciones', href: '/dashboard/valuations', anyCapabilities: ['valuations.office.read'], group: 'Expedientes y cartera' },
      { label: 'Por resolver', href: '/dashboard/properties', anyCapabilities: ['properties.office.read'], group: 'Expedientes y cartera' },
      { label: 'Cartera y asignaciones', href: '/dashboard/properties/admin', anyCapabilities: ['properties.office.assign'], group: 'Expedientes y cartera' },
      { label: 'Operación', href: '/dashboard/control/operations', anyCapabilities: ['management.office.read'], group: 'Gestión' },
      { label: 'Metas y seguimiento', href: '/dashboard/control/admin', anyCapabilities: ['management.office.manage'], group: 'Gestión' },
    ],
  },
]

export const SELLER_NAVIGATION: NavigationSection[] = [
  {
    label: 'Tres pilares',
    items: [
      { label: 'Mercado', href: '/dashboard/market', anyCapabilities: ['market.read'] },
      { label: 'Valorizador', href: '/dashboard/valuation', anyCapabilities: ['valuations.self.create', 'valuations.office.review', 'valuations.global.approve'] },
      { label: 'Reportes', href: '/dashboard/reportes/audiencias/ejecutivo', anyCapabilities: ['reports.self.read'] },
    ],
  },
  {
    label: 'Más herramientas',
    items: [
      { label: 'Hoy', href: '/dashboard/partner', anyCapabilities: ['dashboard.self.read'], group: 'Inicio' },
      { label: 'Valorizaciones', href: '/dashboard/valuations', anyCapabilities: ['valuations.self.read'], group: 'Expedientes y cartera' },
      { label: 'Propiedades', href: '/dashboard/properties', anyCapabilities: ['properties.self.read'], group: 'Expedientes y cartera' },
    ],
  },
]

// Kept for compatibility with existing imports; non-CEO default is the technical admin profile.
export const DEFAULT_NAVIGATION = ADMIN_NAVIGATION
