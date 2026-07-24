export type UserRole =
  | 'board_director'
  | 'ceo'
  | 'unit_director'
  | 'executive'

export type GovernanceAction = {
  user: string
  role: UserRole
  action: string
  timestamp: string
  approvedBy?: string
}

// Official N3uralia hierarchy:
// Board Director (owners/directorio)
//        ↓
// CEO (Pedro)
//        ↓
// Unit / Branch Directors
//        ↓
// Executives
const roleHierarchy: Record<UserRole, number> = {
  board_director: 4,
  ceo: 3,
  unit_director: 2,
  executive: 1,
}

export function canApprove(
  userRole: UserRole,
  requiredRole: UserRole
) {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

export function canAccessScope(
  role: UserRole,
  scope: 'company' | 'unit' | 'assigned'
) {
  if (scope === 'company') {
    return role === 'board_director' || role === 'ceo'
  }

  if (scope === 'unit') {
    return role !== 'executive'
  }

  return true
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
