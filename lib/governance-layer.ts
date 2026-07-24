export type UserRole =
  | 'board_director'
  | 'ceo'
  | 'account_director'
  | 'executive'

export type GovernanceAction = {
  user: string
  role: UserRole
  action: string
  timestamp: string
  approvedBy?: string
}

const roleHierarchy: Record<UserRole, number> = {
  board_director: 4,
  ceo: 3,
  account_director: 2,
  executive: 1,
}

export function canApprove(
  userRole: UserRole,
  requiredRole: UserRole
) {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

export function createAuditRecord(input: {
  user: string
  role: UserRole
  action: string
  approvedBy?: string
}): GovernanceAction {
  return {
    ...input,
    timestamp: new Date().toISOString(),
  }
}
