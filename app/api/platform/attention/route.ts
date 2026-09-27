import { NextResponse } from 'next/server'
import { hasCapability } from '@/lib/access-control'
import { accessErrorResponse, requireUserScope } from '@/lib/access-guards'
import {
  composeAttentionInbox,
  proactiveAttentionItems,
  taskAttentionItems,
  valuationAttentionItems,
} from '@/lib/platform/attention'
import { buildNextBestActions } from '@/lib/platform/next-best-action'
import { getRuntimeOperatingProfile } from '@/lib/platform/tenant-context'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const scope = await requireUserScope()
    const operatingProfile = getRuntimeOperatingProfile()
    if (!operatingProfile.features['attention-inbox']) {
      return NextResponse.json({ error: 'Attention inbox disabled for this client.' }, { status: 404 })
    }

    const supabase = await createClient()
    const canReadTasks =
      hasCapability(scope.role, 'tasks.global.manage')
      || hasCapability(scope.role, 'tasks.office.manage')
      || hasCapability(scope.role, 'tasks.self.manage')
    const canReadValuations =
      hasCapability(scope.role, 'valuations.global.read')
      || hasCapability(scope.role, 'valuations.office.read')
      || hasCapability(scope.role, 'valuations.self.read')
    const canReadPortfolio =
      hasCapability(scope.role, 'properties.global.read')
      || hasCapability(scope.role, 'properties.office.read')
      || hasCapability(scope.role, 'properties.self.read')

    const [tasksResult, valuationsResult, assignmentsResult] = await Promise.all([
      canReadTasks
        ? supabase
            .from('management_tasks')
            .select('id,title,priority,status,due_date')
            .in('status', ['open', 'in_progress'])
            .order('due_date', { ascending: true, nullsFirst: false })
            .limit(50)
        : Promise.resolve({ data: [], error: null }),
      canReadValuations
        ? supabase
            .from('valuation_cases')
            .select('id,address,status,requested_by,updated_at')
            .in('status', ['draft', 'review', 'approved'])
            .order('updated_at', { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [], error: null }),
      canReadPortfolio
        ? supabase
            .from('property_assignments')
            .select('id,status')
            .limit(50)
        : Promise.resolve({ data: [], error: null }),
    ])

    const failure = [tasksResult, valuationsResult, assignmentsResult].find((result) => result.error)
    if (failure?.error) {
      console.error('[platform-attention] source lookup failed', { code: failure.error.code })
      return NextResponse.json({ error: 'No fue posible organizar el trabajo del día.' }, { status: 500 })
    }

    const tasks = tasksResult.data ?? []
    const valuations = valuationsResult.data ?? []
    const assignments = assignmentsResult.data ?? []
    const reviewCount = valuations.filter((item) => item.status === 'review').length
    const draftCount = valuations.filter((item) => item.status === 'draft').length

    const proactive = buildNextBestActions(operatingProfile, scope.role, {
      portfolioTotal: assignments.length,
      portfolioAttentionCount: 0,
      pendingIdentityCount: 0,
      staleAssignmentsCount: 0,
      valuationReviewCount: reviewCount,
      valuationDraftCount: draftCount,
      marketAvailable: operatingProfile.features['market-intelligence'],
    })

    const today = new Date().toISOString().slice(0, 10)
    const formal = [
      ...taskAttentionItems(tasks, today),
      ...valuationAttentionItems(valuations, scope.role, scope.profileId),
    ]
    const inbox = composeAttentionInbox(formal, proactiveAttentionItems(proactive), 5)

    return NextResponse.json({
      ...inbox,
      generatedAt: new Date().toISOString(),
      tenantId: operatingProfile.tenantId,
      scope: scope.scope,
      policy: 'formal-work-first-then-next-best-action-v1',
      writesPerformed: 0,
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return accessErrorResponse(error)
  }
}
