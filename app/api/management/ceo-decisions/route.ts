import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { accessErrorResponse, requireAnyCapability } from '@/lib/access-guards'
import { getN3uraliaIntelligence } from '@/lib/n3uralia-intelligence-gateway'

const PROPERTY_PARTNERS_TENANT_ID = 'property-partners'

export async function GET() {
  try {
    await requireAnyCapability(['management.global.read', 'tasks.global.manage', 'valuations.global.read'])

    const [supabase, intelligence] = await Promise.all([
      createClient(),
      getN3uraliaIntelligence({
        tenantId: PROPERTY_PARTNERS_TENANT_ID,
        audience: 'ceo',
        domains: ['executive', 'crm', 'market', 'valuation'],
        purpose: 'decision-support',
      }),
    ])

    const [casesResult, tasksResult] = await Promise.all([
      supabase
        .from('valuation_cases')
        .select('id,address,status,requested_by,version_number,updated_at')
        .in('status', ['review', 'draft'])
        .order('updated_at', { ascending: false })
        .limit(100),
      supabase
        .from('management_tasks')
        .select('id,source_key,title,detail,status,priority,due_date,office,assigned_to,subject_profile_id,created_at,updated_at')
        .in('status', ['open', 'in_progress'])
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(150),
    ])

    if (casesResult.error) return NextResponse.json({ error: casesResult.error.message }, { status: 500 })
    if (tasksResult.error) return NextResponse.json({ error: tasksResult.error.message }, { status: 500 })

    const cases = casesResult.data ?? []
    const tasks = tasksResult.data ?? []
    const caseIds = cases.map((item) => item.id)
    const profileIds = Array.from(new Set([
      ...cases.map((item) => item.requested_by),
      ...tasks.flatMap((item) => [item.assigned_to, item.subject_profile_id]),
    ].filter(Boolean))) as string[]

    const [logsResult, profilesResult] = await Promise.all([
      caseIds.length
        ? supabase
          .from('valuation_decision_log')
          .select('id,valuation_case_id,action,reason,actor_id,created_at')
          .in('valuation_case_id', caseIds)
          .order('created_at', { ascending: false })
          .limit(250)
        : Promise.resolve({ data: [], error: null }),
      profileIds.length
        ? supabase.from('profiles').select('id,full_name,team,role').in('id', profileIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (logsResult.error) return NextResponse.json({ error: logsResult.error.message }, { status: 500 })
    if (profilesResult.error) return NextResponse.json({ error: profilesResult.error.message }, { status: 500 })

    const profileMap = Object.fromEntries((profilesResult.data ?? []).map((profile) => [profile.id, profile]))
    const taskByCase = new Map<string, typeof tasks>()
    for (const task of tasks) {
      const match = String(task.source_key ?? '').match(/^valuation:([^:]+):/)
      if (!match) continue
      const rows = taskByCase.get(match[1]) ?? []
      rows.push(task)
      taskByCase.set(match[1], rows)
    }

    const queue = cases.map((valuation) => {
      const owner = profileMap[valuation.requested_by] ?? null
      const relatedTasks = taskByCase.get(valuation.id) ?? []
      const latestDecision = (logsResult.data ?? []).find((log) => log.valuation_case_id === valuation.id) ?? null
      return {
        id: valuation.id,
        address: valuation.address,
        status: valuation.status,
        versionNumber: valuation.version_number,
        updatedAt: valuation.updated_at,
        office: owner?.team ?? null,
        owner,
        latestDecision,
        tasks: relatedTasks.map((task) => ({
          ...task,
          assignedProfile: task.assigned_to ? profileMap[task.assigned_to] ?? null : null,
          subjectProfile: task.subject_profile_id ? profileMap[task.subject_profile_id] ?? null : null,
        })),
      }
    })

    const intelligencePayload = intelligence.mode === 'remote' && intelligence.remote
      ? {
          mode: intelligence.mode,
          signals: intelligence.remote.signals,
          risks: intelligence.remote.risks,
          actions: intelligence.remote.actions,
          provenance: intelligence.remote.provenance,
        }
      : {
          mode: intelligence.mode,
          signals: intelligence.local.signals,
          risks: intelligence.local.risks,
          actions: intelligence.local.actions,
          provenance: {
            clientEvidenceIds: intelligence.local.evidence
              .filter((item) => item.sourceClass === 'client_evidence')
              .map((item) => item.id),
            externalSourceIds: intelligence.local.evidence
              .filter((item) => item.sourceClass === 'external_market')
              .map((item) => item.id),
            modelVersion: 'local-transition',
          },
          remoteError: intelligence.remoteError,
        }

    return NextResponse.json(
      {
        queue,
        intelligence: intelligencePayload,
        generatedAt: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (error) {
    return accessErrorResponse(error)
  }
}
