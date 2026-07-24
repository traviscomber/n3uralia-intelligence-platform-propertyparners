export type IntelligenceRole =
  | 'board_director'
  | 'ceo'
  | 'account_director'
  | 'executive'

export const roleIntelligenceModel = {
  board_director: {
    level: 'governance',
    dashboard: '/dashboard/board',
    access: ['company_metrics', 'strategic_reports', 'risk', 'forecast'],
    copilot: 'board',
    reports: ['board_report'],
  },
  ceo: {
    level: 'executive',
    dashboard: '/dashboard/ceo',
    access: ['company_metrics', 'operations', 'decisions', 'forecast'],
    copilot: 'executive',
    reports: ['board_report', 'executive_report'],
  },
  account_director: {
    level: 'management',
    dashboard: '/dashboard/accounts',
    access: ['accounts', 'portfolio', 'pipeline', 'performance'],
    copilot: 'account',
    reports: ['account_report'],
  },
  executive: {
    level: 'operations',
    dashboard: '/dashboard/executive',
    access: ['assigned_properties', 'tasks', 'leads'],
    copilot: 'operational',
    reports: ['activity_report'],
  },
} as const

export function getRoleIntelligence(role: IntelligenceRole) {
  return roleIntelligenceModel[role]
}
