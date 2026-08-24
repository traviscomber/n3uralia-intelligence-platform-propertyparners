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
    label: 'Gestión ejecutiva',
    items: [
      { label: 'Vista CEO', href: '/dashboard/ceo', anyCapabilities: ['dashboard.global.read'] },
      { label: 'Pedro Pablo', href: '/dashboard/pedro-pablo', anyCapabilities: ['dashboard.global.read'] },
      { label: 'Mercado', href: '/dashboard/market', anyCapabilities: ['market.read'] },
      { label: 'Propiedades', href: '/dashboard/properties', anyCapabilities: ['properties.global.read'] },
      { label: 'Informes', href: '/dashboard/reportes/canonicos', anyCapabilities: ['reports.global.read'] },
    ],
  },
  {
    label: 'Gestión y administración',
    items: [
      { label: 'Metas y alertas', href: '/dashboard/control/admin', anyCapabilities: ['management.global.manage'] },
      { label: 'Valorizaciones', href: '/dashboard/valuations', anyCapabilities: ['valuations.global.read'] },
      { label: 'Control de gestión', href: '/dashboard/control/operations', anyCapabilities: ['management.global.read'] },
      { label: 'Identidad y evidencia', href: '/dashboard/market/identidades', anyCapabilities: ['market.manage_sources', 'properties.global.assign'] },
      { label: 'Revisar barrios', href: '/dashboard/market/revisar-barrios', anyCapabilities: ['market.manage_sources', 'management.global.read'] },
      { label: 'Asignaciones', href: '/dashboard/properties/admin', anyCapabilities: ['properties.global.assign'] },
      { label: 'Reportes operativos', href: '/dashboard/reportes/autonomos', anyCapabilities: ['reports.global.read'] },
      { label: 'Fuentes', href: '/dashboard/market/fuentes', anyCapabilities: ['market.manage_sources', 'settings.manage'] },
      { label: 'Usuarios y configuración', href: '/dashboard/settings', anyCapabilities: ['users.manage', 'settings.manage'] },
    ],
  },
]

export const DEFAULT_NAVIGATION: NavigationSection[] = [
  {
    label: 'Operación',
    items: [
      { label: 'Resumen', href: '/dashboard', exact: true },
      { label: 'Pedro Pablo', href: '/dashboard/pedro-pablo', anyCapabilities: ['management.global.read', 'management.office.read', 'management.self.read'] },
      { label: 'Vista CEO', href: '/dashboard/ceo', anyCapabilities: ['dashboard.global.read'] },
      { label: 'Vista director', href: '/dashboard/director', anyCapabilities: ['dashboard.office.read'] },
      { label: 'Mi desempeño', href: '/dashboard/partner', anyCapabilities: ['dashboard.self.read'] },
      { label: 'Mercado', href: '/dashboard/market', anyCapabilities: ['market.read'] },
      { label: 'Propiedades', href: '/dashboard/properties', anyCapabilities: ['properties.global.read', 'properties.office.read', 'properties.self.read'] },
      { label: 'Valorizaciones', href: '/dashboard/valuations', anyCapabilities: ['valuations.global.read', 'valuations.office.read', 'valuations.self.read'] },
      { label: 'Control de gestión', href: '/dashboard/control/operations', anyCapabilities: ['management.global.read', 'management.office.read', 'management.self.read'] },
      { label: 'Informes', href: '/dashboard/reportes/canonicos', anyCapabilities: ['reports.global.read'] },
      { label: 'Reportes de oficina', href: '/dashboard/reportes/autonomos', anyCapabilities: ['reports.office.read'] },
      { label: 'Mi reporte', href: '/dashboard/reportes/audiencias/ejecutivo', anyCapabilities: ['reports.self.read'] },
    ],
  },
  {
    label: 'Administración',
    items: [
      { label: 'Identidad y evidencia', href: '/dashboard/market/identidades', anyCapabilities: ['market.manage_sources', 'properties.global.assign', 'properties.office.assign'] },
      { label: 'Revisar barrios', href: '/dashboard/market/revisar-barrios', anyCapabilities: ['market.manage_sources'] },
      { label: 'Asignaciones', href: '/dashboard/properties/admin', anyCapabilities: ['properties.global.assign', 'properties.office.assign'] },
      { label: 'Metas y alertas', href: '/dashboard/control/admin', anyCapabilities: ['management.global.manage', 'management.office.manage'] },
      { label: 'Fuentes', href: '/dashboard/market/fuentes', anyCapabilities: ['market.manage_sources', 'settings.manage'] },
      { label: 'Usuarios y configuración', href: '/dashboard/settings', anyCapabilities: ['users.manage', 'settings.manage'] },
    ],
  },
]
