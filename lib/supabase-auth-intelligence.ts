import { getRoleIntelligence, type IntelligenceRole } from './role-intelligence-model'
import { getCopilotMode, getDataPermissions, getReportPermissions } from './role-access-control'

export type AuthenticatedIntelligenceContext = {
  userId: string
  role: IntelligenceRole
  organizationId: string
  dashboard: string
  copilot: string
  dataPermissions: readonly string[]
  reports: readonly string[]
}

export function buildSupabaseIntelligenceContext(input: {
  userId: string
  organizationId: string
  role: IntelligenceRole
}): AuthenticatedIntelligenceContext {
  const roleModel = getRoleIntelligence(input.role)

  return {
    ...input,
    dashboard: roleModel.dashboard,
    copilot: getCopilotMode(input.role),
    dataPermissions: getDataPermissions(input.role),
    reports: getReportPermissions(input.role),
  }
}
