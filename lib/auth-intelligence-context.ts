export type IntelligenceRole = 'CEO' | 'Director' | 'Agent'

export type IntelligenceUserContext = {
  userId: string
  role: IntelligenceRole
  organizationId: string
}

export function createIntelligenceContext(input: IntelligenceUserContext) {
  return {
    ...input,
    canAccessExecutiveData:
      input.role === 'CEO' || input.role === 'Director',
    canModifyDecisions:
      input.role === 'CEO',
  }
}
