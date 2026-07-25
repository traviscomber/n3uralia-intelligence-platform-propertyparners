export const DASHBOARD_ROLES = ['admin', 'ceo', 'director', 'seller'] as const

export type DashboardRole = (typeof DASHBOARD_ROLES)[number]
export type DashboardRoleInput = DashboardRole | string | null | undefined
export type RouteProvenance = 'audited' | 'live-separated' | 'pending'
export type NavigationGroup = 'Executive' | 'Intelligence' | 'Business' | 'Administration' | 'Workspace' | 'Sources'

export type DashboardRouteKey =
  | 'home'
  | 'ceo'
  | 'director'
  | 'intelligence'
  | 'market'
  | 'valuation'
  | 'reports'
  | 'partnerReports'
  | 'properties'
  | 'control'
  | 'crm'
  | 'targets'
  | 'presentations'
  | 'marketSources'
  | 'marketImport'
  | 'sources'
  | 'knowledge'
  | 'lab'
  | 'settings'

export type DashboardRouteDefinition = {
  key: DashboardRouteKey
  label: string
  href: string
  exact?: boolean
  roles: readonly DashboardRole[]
  groupByRole: Partial<Record<DashboardRole, NavigationGroup>>
  provenance: RouteProvenance
  cutoffLabel?: string
}

const ALL_ROLES = DASHBOARD_ROLES
const EXECUTIVE_ROLES = ['admin', 'ceo'] as const satisfies readonly DashboardRole[]
const LEADERSHIP_ROLES = ['admin', 'ceo', 'director'] as const satisfies readonly DashboardRole[]

export const DASHBOARD_ROUTES = [
  { key: 'home', label: 'Dashboard', href: '/dashboard', exact: true, roles: ALL_ROLES, groupByRole: { seller: 'Workspace' }, provenance: 'audited', cutoffLabel: 'Corte operativo: junio 2026' },
  { key: 'ceo', label: 'Resumen ejecutivo', href: '/dashboard/ceo', roles: EXECUTIVE_ROLES, groupByRole: { admin: 'Executive', ceo: 'Executive' }, provenance: 'audited', cutoffLabel: 'Corte operativo: junio 2026' },
  { key: 'director', label: 'Vista director', href: '/dashboard/director', roles: LEADERSHIP_ROLES, groupByRole: { director: 'Executive' }, provenance: 'audited', cutoffLabel: 'Corte operativo: junio 2026' },
  { key: 'intelligence', label: 'Inteligencia corporativa', href: '/dashboard/inteligencia', roles: EXECUTIVE_ROLES, groupByRole: {}, provenance: 'audited', cutoffLabel: 'Corte operativo: junio 2026' },
  { key: 'market', label: 'Inteligencia de mercado', href: '/dashboard/market', roles: ALL_ROLES, groupByRole: { admin: 'Intelligence', ceo: 'Intelligence', director: 'Intelligence', seller: 'Intelligence' }, provenance: 'audited', cutoffLabel: 'Cortes: Portal n/d · CBRS 9 ene 2026' },
  { key: 'valuation', label: 'Inteligencia de valorización', href: '/dashboard/valorizador', roles: ALL_ROLES, groupByRole: { admin: 'Intelligence', ceo: 'Intelligence', director: 'Intelligence', seller: 'Intelligence' }, provenance: 'audited', cutoffLabel: 'Plantillas: septiembre 2020' },
  { key: 'reports', label: 'Reportes ejecutivos', href: '/dashboard/reportes/autonomos', roles: LEADERSHIP_ROLES, groupByRole: { admin: 'Intelligence', ceo: 'Intelligence', director: 'Intelligence' }, provenance: 'audited', cutoffLabel: 'Corte operativo: junio 2026' },
  { key: 'partnerReports', label: 'Reportes para partners', href: '/dashboard/reportes/audiencias/ejecutivo', roles: ['seller'], groupByRole: { seller: 'Intelligence' }, provenance: 'audited', cutoffLabel: 'Corte operativo: junio 2026' },
  { key: 'properties', label: 'Propiedades', href: '/dashboard/properties', roles: ALL_ROLES, groupByRole: { admin: 'Business', ceo: 'Business', director: 'Business', seller: 'Business' }, provenance: 'audited', cutoffLabel: 'Cortes: Portal n/d · CBRS 9 ene 2026' },
  { key: 'control', label: 'Control de gestión', href: '/dashboard/control', roles: LEADERSHIP_ROLES, groupByRole: { admin: 'Business', ceo: 'Business', director: 'Business' }, provenance: 'audited', cutoffLabel: 'Corte operativo: junio 2026' },
  { key: 'crm', label: 'Datos CRM', href: '/dashboard/datos-crm', roles: LEADERSHIP_ROLES, groupByRole: { admin: 'Business', ceo: 'Business', director: 'Business' }, provenance: 'audited', cutoffLabel: 'Corte operativo: junio 2026' },
  { key: 'targets', label: 'Metas 2026', href: '/dashboard/metas', roles: LEADERSHIP_ROLES, groupByRole: { admin: 'Administration', ceo: 'Administration', director: 'Sources' }, provenance: 'audited', cutoffLabel: 'Metas 2026 · versión julio 2026' },
  { key: 'presentations', label: 'Presentaciones', href: '/dashboard/presentaciones', roles: LEADERSHIP_ROLES, groupByRole: { admin: 'Administration', ceo: 'Administration', director: 'Sources' }, provenance: 'audited', cutoffLabel: 'Presentaciones: corte junio 2026' },
  { key: 'marketSources', label: 'Fuentes de mercado', href: '/dashboard/market/fuentes', roles: LEADERSHIP_ROLES, groupByRole: { admin: 'Administration', ceo: 'Administration', director: 'Sources' }, provenance: 'pending' },
  { key: 'marketImport', label: 'Importar mercado', href: '/dashboard/market/import', roles: EXECUTIVE_ROLES, groupByRole: { admin: 'Administration', ceo: 'Administration' }, provenance: 'live-separated' },
  { key: 'sources', label: 'Fuentes de propiedades', href: '/dashboard/sources', roles: EXECUTIVE_ROLES, groupByRole: { admin: 'Administration', ceo: 'Administration' }, provenance: 'live-separated' },
  { key: 'knowledge', label: 'Conocimiento', href: '/dashboard/knowledge', roles: EXECUTIVE_ROLES, groupByRole: { admin: 'Administration', ceo: 'Administration' }, provenance: 'live-separated' },
  { key: 'lab', label: 'Modelos y validación', href: '/dashboard/ml-lab', roles: EXECUTIVE_ROLES, groupByRole: { admin: 'Administration', ceo: 'Administration' }, provenance: 'audited', cutoffLabel: 'Cortes declarados por fuente' },
  { key: 'settings', label: 'Configuración', href: '/dashboard/settings', roles: EXECUTIVE_ROLES, groupByRole: { admin: 'Administration', ceo: 'Administration' }, provenance: 'pending' },
] as const satisfies readonly DashboardRouteDefinition[]

const ROLE_ALIASES: Record<string, DashboardRole> = {
  admin: 'admin',
  ceo: 'ceo',
  director: 'director',
  seller: 'seller',
  agente: 'seller',
  agent: 'seller',
  ejecutivo: 'seller',
  executive: 'seller',
  account_director: 'director',
  board_director: 'director',
}

export function normalizeDashboardRole(role: DashboardRoleInput): DashboardRole | null {
  if (!role) return null
  return ROLE_ALIASES[String(role).trim().toLowerCase()] ?? null
}

export function matchesDashboardRoute(pathname: string, route: Pick<DashboardRouteDefinition, 'href' | 'exact'>) {
  return route.exact ? pathname === route.href : pathname === route.href || pathname.startsWith(`${route.href}/`)
}

export function getDashboardRoute(pathname: string) {
  return [...DASHBOARD_ROUTES]
    .sort((a, b) => b.href.length - a.href.length)
    .find((route) => matchesDashboardRoute(pathname, route)) ?? null
}

export function canAccessDashboardPath(roleInput: DashboardRoleInput, pathname: string) {
  const role = normalizeDashboardRole(roleInput)
  if (!role) return false
  const route = getDashboardRoute(pathname)
  return Boolean(route?.roles.includes(role))
}

export function getDefaultDashboardPath(roleInput: DashboardRoleInput) {
  const role = normalizeDashboardRole(roleInput)
  if (role === 'admin' || role === 'ceo') return '/dashboard/ceo'
  if (role === 'director') return '/dashboard/director'
  if (role === 'seller') return '/dashboard'
  return '/auth/error'
}

export function getNavigationSections(roleInput: DashboardRoleInput) {
  const role = normalizeDashboardRole(roleInput)
  if (!role) return []

  const order: NavigationGroup[] = role === 'seller'
    ? ['Workspace', 'Intelligence', 'Business']
    : role === 'director'
      ? ['Executive', 'Intelligence', 'Business', 'Sources']
      : ['Executive', 'Intelligence', 'Business', 'Administration']

  return order.map((label) => ({
    label,
    items: DASHBOARD_ROUTES.filter((route) => route.roles.includes(role) && route.groupByRole[role] === label),
  })).filter((section) => section.items.length > 0)
}
