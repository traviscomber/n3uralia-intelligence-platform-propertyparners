import { getRoleIntelligence, type IntelligenceRole } from './role-intelligence-model'

export function canAccessRoute(role: IntelligenceRole, route: string) {
  const permissions = getRoleIntelligence(role)
  return permissions.dashboard === route
}

export function getCopilotMode(role: IntelligenceRole) {
  return getRoleIntelligence(role).copilot
}

export function getReportPermissions(role: IntelligenceRole) {
  return getRoleIntelligence(role).reports
}

export function getDataPermissions(role: IntelligenceRole) {
  return getRoleIntelligence(role).access
}
