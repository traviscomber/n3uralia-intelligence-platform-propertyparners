import { MANAGEMENT_DECISION_POLICY } from '@/lib/management-decision-policy'

export type ManagementDecisionPolicy = typeof MANAGEMENT_DECISION_POLICY

const MANAGEMENT_POLICIES: Record<string, ManagementDecisionPolicy> = {
  'property-partners-management-2026-08-07.2': MANAGEMENT_DECISION_POLICY,
}

export function getManagementDecisionPolicy(policyId: string): ManagementDecisionPolicy {
  const policy = MANAGEMENT_POLICIES[policyId]
  if (!policy) throw new Error(`Unknown management decision policy: ${policyId}`)
  return policy
}
