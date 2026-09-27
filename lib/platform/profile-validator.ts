import type { OperatingProfile } from '@/lib/platform/operating-profile'

export type OperatingProfileIssue = {
  code: string
  path: string
  message: string
}

function duplicates(values: string[]) {
  const seen = new Set<string>()
  const repeated = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) repeated.add(value)
    seen.add(value)
  }
  return [...repeated]
}

export function validateOperatingProfile(profile: OperatingProfile): OperatingProfileIssue[] {
  const issues: OperatingProfileIssue[] = []
  const push = (code: string, path: string, message: string) => issues.push({ code, path, message })

  if (!profile.tenantId.trim()) push('tenant_id_required', 'tenantId', 'Tenant ID is required.')
  if (!profile.clientName.trim()) push('client_name_required', 'clientName', 'Client name is required.')

  for (const id of duplicates(profile.pillars.map((item) => item.id))) {
    push('duplicate_pillar', 'pillars', `Duplicate pillar: ${id}`)
  }

  for (const id of duplicates(profile.sourceAdapters.map((item) => item.id))) {
    push('duplicate_source_adapter', 'sourceAdapters', `Duplicate source adapter: ${id}`)
  }

  const actionIds = Object.entries(profile.roles).flatMap(([role, config]) =>
    config.proactiveActions.map((action) => `${role}:${action.id}`),
  )
  for (const id of duplicates(actionIds)) {
    push('duplicate_role_action', 'roles', `Duplicate proactive action: ${id}`)
  }

  for (const [role, config] of Object.entries(profile.roles)) {
    for (const action of config.proactiveActions) {
      if (!action.href.startsWith('/dashboard')) {
        push('invalid_action_href', `roles.${role}.proactiveActions.${action.id}.href`, 'Actions must stay inside the authenticated dashboard.')
      }
    }
  }

  const allowedTargets = new Set(profile.workflows.valuation.allowedTargets)
  for (const target of profile.workflows.valuation.mfaTargets) {
    if (!allowedTargets.has(target)) {
      push('invalid_mfa_target', 'workflows.valuation.mfaTargets', `MFA target is not an allowed workflow target: ${target}`)
    }
  }

  if (profile.workflows.valuation.returnTaskDueDays < 1 || profile.workflows.valuation.returnTaskDueDays > 30) {
    push('invalid_return_sla', 'workflows.valuation.returnTaskDueDays', 'Return-task SLA must be between 1 and 30 days.')
  }

  if (profile.assistant.maxProactiveActions < 1 || profile.assistant.maxProactiveActions > 10) {
    push('invalid_proactive_limit', 'assistant.maxProactiveActions', 'Assistant proactive action limit must be between 1 and 10.')
  }

  if (profile.features['action-gateway'] && !profile.assistant.humanConfirmationForWrites) {
    push('unsafe_action_gateway', 'assistant.humanConfirmationForWrites', 'Action Gateway requires explicit human confirmation.')
  }

  if (profile.features['source-adapter-registry'] && profile.sourceAdapters.length === 0) {
    push('missing_source_adapters', 'sourceAdapters', 'Source Adapter Registry is enabled without adapters.')
  }

  if (profile.features['attention-inbox'] && !profile.features['daily-work']) {
    push('attention_requires_daily_work', 'features.attention-inbox', 'Attention Inbox requires daily-work.')
  }

  return issues
}

export function assertValidOperatingProfile(profile: OperatingProfile) {
  const issues = validateOperatingProfile(profile)
  if (!issues.length) return profile
  const summary = issues.map((issue) => `${issue.code}:${issue.path}`).join(', ')
  throw new Error(`Invalid operating profile ${profile.tenantId}: ${summary}`)
}
