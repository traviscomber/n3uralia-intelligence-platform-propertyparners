export const CANONICAL_DASHBOARD_ROLES = ['admin', 'ceo', 'director', 'seller'] as const

export type CanonicalDashboardRole = (typeof CANONICAL_DASHBOARD_ROLES)[number]
export type DashboardRole = CanonicalDashboardRole | string

const ROLE_ALIASES: Readonly<Record<string, CanonicalDashboardRole>> = {
  admin: 'admin',
  ceo: 'ceo',
  director: 'director',
  board_director: 'director',
  account_director: 'director',
  seller: 'seller',
  agent: 'seller',
  agente: 'seller',
  executive: 'seller',
}

const DEFAULT_DASHBOARD_BY_ROLE: Readonly<Record<CanonicalDashboardRole, string>> = {
  admin: '/dashboard/ceo',
  ceo: '/dashboard/ceo',
  director: '/dashboard/director',
  seller: '/dashboard/agente',
}

const EXECUTIVE_ONLY = ['/dashboard/ceo', '/dashboard/settings', '/dashboard/sources', '/dashboard/market/fuentes', '/dashboard/market/import', '/dashboard/knowledge', '/dashboard/ml-lab']
const SELLER_ALLOWED = ['/dashboard', '/dashboard/agente', '/dashboard/properties', '/dashboard/market', '/dashboard/valorizador', '/dashboard/reportes/audiencias/ejecutivo']

function matches(pathname: string, route: string) {
  return pathname === route || (route !== '/dashboard' && pathname.startsWith(`${route}/`))
}

export function normalizeDashboardRole(role: DashboardRole | null | undefined): CanonicalDashboardRole | null {
  if (!role) return null
  return ROLE_ALIASES[role.trim().toLowerCase()] ?? null
}

export function getDefaultDashboardPath(role: DashboardRole | null | undefined): string | null {
  const canonicalRole = normalizeDashboardRole(role)
  return canonicalRole ? DEFAULT_DASHBOARD_BY_ROLE[canonicalRole] : null
}

export function canAccessDashboardPath(role: DashboardRole, pathname: string) {
  const canonicalRole = normalizeDashboardRole(role)
  if (!canonicalRole) return false
  if (canonicalRole === 'admin' || canonicalRole === 'ceo') return true
  if (EXECUTIVE_ONLY.some((route) => matches(pathname, route))) return false
  if (canonicalRole === 'director') return true
  return SELLER_ALLOWED.some((route) => matches(pathname, route))
}
