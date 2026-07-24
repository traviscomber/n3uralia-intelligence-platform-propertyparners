import type { IntelligenceRole } from './role-intelligence-model'
import { getRoleIntelligence } from './role-intelligence-model'

export function getDashboardRouteForRole(role: IntelligenceRole) {
  return getRoleIntelligence(role).dashboard
}

export function getDefaultDashboard(role: IntelligenceRole) {
  return {
    route: getDashboardRouteForRole(role),
    role,
  }
}

export function canOpenDashboard(role: IntelligenceRole, route: string) {
  return getDashboardRouteForRole(role) === route
}
