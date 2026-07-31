import type { Profile, UserRole } from '@/lib/types'

export type Capability =
  | 'dashboard.global.read'
  | 'dashboard.office.read'
  | 'dashboard.self.read'
  | 'management.global.read'
  | 'management.office.read'
  | 'management.self.read'
  | 'management.global.manage'
  | 'management.office.manage'
  | 'market.read'
  | 'market.manage_sources'
  | 'valuations.global.read'
  | 'valuations.office.read'
  | 'valuations.self.read'
  | 'valuations.self.create'
  | 'valuations.office.review'
  | 'valuations.global.approve'
  | 'properties.global.read'
  | 'properties.office.read'
  | 'properties.self.read'
  | 'properties.global.assign'
  | 'properties.office.assign'
  | 'tasks.global.manage'
  | 'tasks.office.manage'
  | 'tasks.self.manage'
  | 'reports.global.read'
  | 'reports.office.read'
  | 'reports.self.read'
  | 'users.manage'
  | 'settings.manage'

const ROLE_CAPABILITIES: Record<UserRole, readonly Capability[]> = {
  ceo: [
    'dashboard.global.read',
    'management.global.read',
    'management.global.manage',
    'market.read',
    'valuations.global.read',
    'valuations.global.approve',
    'properties.global.read',
    'properties.global.assign',
    'tasks.global.manage',
    'reports.global.read',
  ],
  admin: [
    'dashboard.global.read',
    'management.global.read',
    'management.global.manage',
    'market.read',
    'market.manage_sources',
    'valuations.global.read',
    'valuations.global.approve',
    'properties.global.read',
    'properties.global.assign',
    'tasks.global.manage',
    'reports.global.read',
    'users.manage',
    'settings.manage',
  ],
  director: [
    'dashboard.office.read',
    'management.office.read',
    'management.office.manage',
    'market.read',
    'valuations.office.read',
    'valuations.office.review',
    'properties.office.read',
    'properties.office.assign',
    'tasks.office.manage',
    'reports.office.read',
  ],
  subdirector: [
    'dashboard.office.read',
    'management.office.read',
    'management.office.manage',
    'market.read',
    'valuations.office.read',
    'valuations.office.review',
    'properties.office.read',
    'properties.office.assign',
    'tasks.office.manage',
    'reports.office.read',
  ],
  seller: [
    'dashboard.self.read',
    'management.self.read',
    'market.read',
    'valuations.self.read',
    'valuations.self.create',
    'properties.self.read',
    'tasks.self.manage',
    'reports.self.read',
  ],
}

export type AccessScope = 'global' | 'office' | 'self'

export type AccessContext = {
  profileId: string
  role: UserRole
  team: string | null
  scope: AccessScope
  capabilities: readonly Capability[]
}

export function getRoleCapabilities(role: UserRole): readonly Capability[] {
  return ROLE_CAPABILITIES[role]
}

export function hasCapability(
  profileOrRole: Pick<Profile, 'role'> | UserRole | null | undefined,
  capability: Capability,
): boolean {
  if (!profileOrRole) return false
  const role = typeof profileOrRole === 'string' ? profileOrRole : profileOrRole.role
  return ROLE_CAPABILITIES[role].includes(capability)
}

export function getAccessScope(role: UserRole): AccessScope {
  if (role === 'ceo' || role === 'admin') return 'global'
  if (role === 'director' || role === 'subdirector') return 'office'
  return 'self'
}

export function createAccessContext(profile: Profile): AccessContext {
  return {
    profileId: profile.id,
    role: profile.role,
    team: profile.team,
    scope: getAccessScope(profile.role),
    capabilities: getRoleCapabilities(profile.role),
  }
}

export function defaultDashboardForRole(role: UserRole): string {
  if (role === 'ceo') return '/dashboard/ceo'
  if (role === 'director' || role === 'subdirector') return '/dashboard/director'
  if (role === 'seller') return '/dashboard/partner'
  return '/dashboard'
}
