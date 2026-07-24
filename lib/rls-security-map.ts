export const intelligenceRlsPolicies = {
  profiles: 'user owns profile data',
  properties: 'organization scoped access',
  sales: 'organization scoped access',
  evidence: 'executive visibility based on role',
  decisions: 'CEO approval workflow',
  marketSignals: 'organization scoped access',
} as const

export function getRlsPolicy(table: keyof typeof intelligenceRlsPolicies) {
  return intelligenceRlsPolicies[table]
}
