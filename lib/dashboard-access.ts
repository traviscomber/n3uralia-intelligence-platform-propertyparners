export type DashboardRole = 'admin' | 'ceo' | 'director' | 'subdirector' | 'seller' | string

const EXECUTIVE_ONLY = [
  '/dashboard/ceo',
  '/dashboard/settings',
  '/dashboard/sources',
  '/dashboard/market/fuentes',
  '/dashboard/market/import',
  '/dashboard/market/roadmap',
  '/dashboard/market/reconciliacion',
  '/dashboard/knowledge',
  '/dashboard/ml-lab',
  '/dashboard/reportes/autonomos',
  '/dashboard/reportes/directorio',
  '/dashboard/reportes/audiencias/ceo',
  '/dashboard/reportes/audiencias/director-cuenta',
]

const SELLER_FORBIDDEN = [
  '/dashboard/properties/admin',
]

const SELLER_ALLOWED = [
  '/dashboard',
  '/dashboard/partner',
  '/dashboard/agente',
  '/dashboard/properties',
  '/dashboard/market',
  '/dashboard/valuations',
  '/dashboard/valuation',
  '/dashboard/valorizador',
  '/dashboard/reportes/audiencias/ejecutivo',
]

function matches(pathname: string, route: string) {
  return pathname === route || (route !== '/dashboard' && pathname.startsWith(`${route}/`))
}

export function canAccessDashboardPath(role: DashboardRole, pathname: string) {
  if (role === 'admin' || role === 'ceo') return true
  if (EXECUTIVE_ONLY.some((route) => matches(pathname, route))) return false
  if (role === 'director' || role === 'subdirector') return true
  if (role !== 'seller') return false
  if (SELLER_FORBIDDEN.some((route) => matches(pathname, route))) return false
  return SELLER_ALLOWED.some((route) => matches(pathname, route))
}
