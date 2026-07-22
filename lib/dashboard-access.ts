export type DashboardRole = 'admin' | 'ceo' | 'director' | 'seller' | string

const EXECUTIVE_ONLY = ['/dashboard/ceo', '/dashboard/settings', '/dashboard/sources', '/dashboard/market/fuentes', '/dashboard/market/import', '/dashboard/knowledge', '/dashboard/ml-lab']
const SELLER_ALLOWED = ['/dashboard', '/dashboard/agente', '/dashboard/properties', '/dashboard/market', '/dashboard/valorizador', '/dashboard/reportes/audiencias/ejecutivo']

function matches(pathname: string, route: string) {
  return pathname === route || (route !== '/dashboard' && pathname.startsWith(`${route}/`))
}

export function canAccessDashboardPath(role: DashboardRole, pathname: string) {
  if (role === 'admin' || role === 'ceo') return true
  if (EXECUTIVE_ONLY.some((route) => matches(pathname, route))) return false
  if (role === 'director') return true
  return SELLER_ALLOWED.some((route) => matches(pathname, route))
}
