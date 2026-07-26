import type { IntelligenceRole } from './role-intelligence-model'
import { getCopilotMode, getReportPermissions } from './role-access-control'

export type CopilotContext = {
  role: IntelligenceRole
  mode: string
  availableReports: readonly string[]
  promptScope: string
}

export function createCopilotContext(role: IntelligenceRole): CopilotContext {
  const mode = getCopilotMode(role)

  return {
    role,
    mode,
    availableReports: getReportPermissions(role),
    promptScope: `Generate intelligence responses for ${role} context only.`,
  }
}
