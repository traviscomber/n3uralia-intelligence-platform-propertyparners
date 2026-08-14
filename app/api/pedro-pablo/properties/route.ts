import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { accessErrorResponse, requireAnyCapability } from '@/lib/access-guards'

type PropertyAssignmentRow = {
  id: string
  status: string | null
  assigned_to: string | null
  assigned_at: string | null
  market_properties: Array<{
    id: string
    normalized_address: string | null
    property_type: string | null
    identity_status: string | null
    last_seen_at: string | null
  }>
}

function isStale(lastSeenAt: string | null, now: number) {
  if (!lastSeenAt) return true
  const observedAt = new Date(lastSeenAt).getTime()
  if (!Number.isFinite(observedAt)) return true
  return now - observedAt > 7 * 24 * 60 * 60 * 1000
}

export async function GET() {
  try {
    const scope = await requireAnyCapability(['properties.global.read', 'properties.office.read', 'properties.self.read'])
    const supabase = await createClient()

    let query = supabase
      .from('property_assignments')
      .select('id,status,assigned_to,assigned_at,market_properties(id,normalized_address,property_type,identity_status,last_seen_at)')
      .eq('status', 'active')
      .order('assigned_at', { ascending: false })
      .limit(250)

    if (scope.scope === 'self') query = query.eq('assigned_to', scope.profileId)
    else if (scope.scope === 'office') query = query.in('assigned_to', scope.visibleProfileIds)

    const { data, error } = await query
    if (error) {
      console.error('[pedro-pablo-properties] listing failed', { code: error.code })
      return NextResponse.json({ error: 'No fue posible consultar la cartera autorizada.' }, { status: 500 })
    }

    const assignments = (data ?? []) as PropertyAssignmentRow[]
    const now = Date.now()
    const pendingIdentity = assignments.filter((assignment) => assignment.market_properties[0]?.identity_status !== 'confirmed')
    const stale = assignments.filter((assignment) => isStale(assignment.market_properties[0]?.last_seen_at ?? null, now))
    const attentionIds = new Set([...pendingIdentity, ...stale].map((assignment) => assignment.id))
    const attention = assignments
      .filter((assignment) => attentionIds.has(assignment.id))
      .slice(0, 10)
      .map((assignment) => {
        const property = assignment.market_properties[0] ?? null
        return {
          assignmentId: assignment.id,
          propertyId: property?.id ?? null,
          address: property?.normalized_address ?? null,
          propertyType: property?.property_type ?? null,
          identityStatus: property?.identity_status ?? null,
          lastSeenAt: property?.last_seen_at ?? null,
          needsIdentityReview: property?.identity_status !== 'confirmed',
          needsFreshnessReview: isStale(property?.last_seen_at ?? null, now),
        }
      })

    return NextResponse.json({
      scope: scope.scope,
      totalAssignments: assignments.length,
      confirmedIdentity: assignments.length - pendingIdentity.length,
      pendingIdentity: pendingIdentity.length,
      staleAssignments: stale.length,
      attention,
      generatedAt: new Date().toISOString(),
      mode: 'canonical-governed',
      writesPerformed: 0,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return accessErrorResponse(error)
  }
}
