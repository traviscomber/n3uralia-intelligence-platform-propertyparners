import { NextResponse } from 'next/server'
import { accessErrorResponse, requireUserScope } from '@/lib/access-guards'
import { getRoleOperatingProfile } from '@/lib/platform/operating-profile'
import { getRuntimeOperatingProfile } from '@/lib/platform/tenant-context'

export async function GET() {
  try {
    const scope = await requireUserScope()
    const profile = getRuntimeOperatingProfile()
    const role = getRoleOperatingProfile(profile, scope.role)

    if (!role) {
      return NextResponse.json({ error: 'Operating role profile unavailable.' }, { status: 403 })
    }

    return NextResponse.json({
      tenantId: profile.tenantId,
      clientName: profile.clientName,
      marketScope: profile.marketScope,
      pillars: profile.pillars,
      features: Object.entries(profile.features)
        .filter(([, enabled]) => enabled)
        .map(([id]) => id),
      role: {
        id: scope.role,
        label: role.label,
        scope: role.scope,
        officeName: scope.officeName,
      },
      assistant: profile.assistant,
      actions: {
        gatewayPolicyId: profile.actions.gatewayPolicyId,
        proposalPolicyId: profile.actions.proposalPolicyId,
        allowedConfirmedActions: profile.actions.allowedConfirmedActions,
      },
      workflows: profile.workflows,
      proactiveActionCatalog: role.proactiveActions.map((action) => ({
        id: action.id,
        title: action.title,
        domain: action.domain,
        href: action.href,
        condition: action.condition,
      })),
      schemaVersion: profile.schemaVersion,
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return accessErrorResponse(error)
  }
}
