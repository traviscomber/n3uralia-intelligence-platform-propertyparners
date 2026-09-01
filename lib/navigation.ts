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
      { label: 'Hoy', href: '/dashboard/ceo', anyCapabilities: ['dashboard.global.read'] },
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

export const DEFAULT_NAVIGATION: NavigationSection[] = [
  {
    label: 'Principal',
    items: [
      { label: 'Hoy', href: '/dashboard', exact: true },
      { label: 'Mercado', href: '/dashboard/market', anyCapabilities: ['market.read'] },
      { label: 'Valorizaciones', href: '/dashboard/valuations', anyCapabilities: ['valuations.global.read', 'valuations.office.read', 'valuations.self.read'] },
      { label: 'Propiedades', href: '/dashboard/properties', anyCapabilities: ['properties.global.read', 'properties.office.read', 'properties.self.read'] },
      { label: 'Informes', href: '/dashboard/reportes/canonicos', anyCapabilities: ['reports.global.read'] },
      { label: 'Mi reporte', href: '/dashboard/reportes/audiencias/ejecutivo', anyCapabilities: ['reports.self.read'] },
    ],
  },
  {
    label: 'Administración',
    items: [
      { label: 'Gestión', href: '/dashboard/control/operations', anyCapabilities: ['management.global.read', 'management.office.read'] },
      { label: 'Metas y alertas', href: '/dashboard/control/admin', anyCapabilities: ['management.global.manage', 'management.office.manage'] },
      { label: 'Datos y metodología', href: '/dashboard/market/fuentes', anyCapabilities: ['market.manage_sources', 'settings.manage'] },
      { label: 'Asignaciones', href: '/dashboard/properties/admin', anyCapabilities: ['properties.global.assign', 'properties.office.assign'] },
      { label: 'Usuarios y configuración', href: '/dashboard/settings', anyCapabilities: ['users.manage', 'settings.manage'] },
    ],
  },
]
