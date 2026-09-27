import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_TENANT_ID, getOperatingProfile } from '../../lib/platform/operating-profile'
import { buildNextBestActions } from '../../lib/platform/next-best-action'

test('Property Partners remains the canonical operating profile with three pillars', () => {
  const profile = getOperatingProfile(DEFAULT_TENANT_ID)
  assert.equal(profile.clientName, 'Property Partners')
  assert.equal(profile.marketScope, 'Vitacura')
  assert.deepEqual(profile.pillars.map((item) => item.id), ['management', 'intelligence', 'valuation'])
  assert.deepEqual(profile.pillars.map((item) => item.label), ['Control de gestión', 'Inteligencia de negocios', 'Valorizador de propiedades'])
  assert.equal(profile.assistant.dailyWorkFirst, true)
  assert.equal(profile.assistant.humanConfirmationForWrites, true)
  assert.deepEqual(profile.workflows.valuation.allowedTargets, ['draft', 'review', 'approved', 'issued'])
  assert.deepEqual(profile.workflows.valuation.mfaTargets, ['approved', 'issued'])
  assert.equal(profile.workflows.valuation.returnTaskDueDays, 3)
  assert.equal(profile.actions.gatewayPolicyId, 'pedro-pablo-action-gateway-v1')
  assert.equal(profile.actions.proposalPolicyId, 'pedro-pablo-proposal-contract-v4-reports-aware')
  assert.deepEqual(profile.actions.allowedConfirmedActions, ['create_task'])
  assert.equal(profile.actions.taskSourcePrefix, 'pedro-pablo')
})

test('Partner receives productive work even without formal tasks', () => {
  const profile = getOperatingProfile(DEFAULT_TENANT_ID)
  const actions = buildNextBestActions(profile, 'seller', {
    portfolioTotal: 8,
    portfolioAttentionCount: 1,
    pendingIdentityCount: 1,
    staleAssignmentsCount: 0,
    valuationReviewCount: 0,
    valuationDraftCount: 1,
    marketAvailable: true,
  })

  assert.equal(actions.length, 3)
  assert.match(actions[0].title, /Avanzar una valorización/)
  assert.ok(actions.some((item) => /contactos, llamados/.test(item.title)))
  assert.ok(actions.some((item) => /documentación/.test(item.title)))
})

test('CEO next actions stay aligned to management, valuation and market', () => {
  const profile = getOperatingProfile(DEFAULT_TENANT_ID)
  const actions = buildNextBestActions(profile, 'ceo', {
    portfolioTotal: 0,
    portfolioAttentionCount: 0,
    pendingIdentityCount: 0,
    staleAssignmentsCount: 0,
    valuationReviewCount: 2,
    valuationDraftCount: 0,
    marketAvailable: true,
  })

  assert.deepEqual(actions.map((item) => item.domain), ['management', 'valuation', 'market'])
})

test('Administration receives cleanup and source-governance work when data gaps exist', () => {
  const profile = getOperatingProfile(DEFAULT_TENANT_ID)
  const actions = buildNextBestActions(profile, 'admin', {
    portfolioTotal: 12,
    portfolioAttentionCount: 2,
    pendingIdentityCount: 2,
    staleAssignmentsCount: 1,
    valuationReviewCount: 0,
    valuationDraftCount: 0,
    marketAvailable: true,
  })

  assert.match(actions[0].title, /identidad, vigencia o documentación/)
  assert.ok(actions.some((item) => /cartera y asignaciones/.test(item.title)))
  assert.ok(actions.some((item) => /datos y fuentes/.test(item.title)))
})

test('Unknown tenant profiles fail closed', () => {
  assert.throws(() => getOperatingProfile('unknown-client'), /Unknown operating profile/)
})


test('Action Gateway preserves human-confirmed task creation through the client profile', async () => {
  const fs = await import('node:fs/promises')
  const gateway = await fs.readFile('app/api/pedro-pablo/action-gateway/route.ts', 'utf8')
  const decision = await fs.readFile('app/api/pedro-pablo/decision-support/route.ts', 'utf8')

  assert.match(gateway, /getRuntimeOperatingProfile\(\)\.actions/)
  assert.match(gateway, /allowedConfirmedActions\.includes\('create_task'\)/)
  assert.match(gateway, /if \(!confirm\)/)
  assert.match(gateway, /actionPolicy\.taskSourcePrefix/)
  assert.match(decision, /operatingProfile\.actions\.allowedConfirmedActions/)
  assert.match(decision, /operatingProfile\.actions\.proposalPolicyId/)
})


test('activity normalization produces one stable cross-domain contract', async () => {
  const { normalizeTaskActivity, normalizeValuationActivity, sortPlatformActivity } = await import('../../lib/platform/activity')

  const task = normalizeTaskActivity({
    id: 'e1',
    task_id: 't1',
    actor_id: 'u1',
    event_type: 'status_changed',
    from_status: 'open',
    to_status: 'in_progress',
    changes: {},
    created_at: '2026-09-26T12:00:00Z',
  }, 'Llamar cliente', 'Partner')

  const valuation = normalizeValuationActivity({
    id: 'e2',
    valuation_case_id: 'v1',
    actor_id: 'u2',
    action: 'submitted_for_review',
    from_status: 'draft',
    to_status: 'review',
    reason: null,
    metadata: {},
    created_at: '2026-09-26T13:00:00Z',
  }, 'Av. Vitacura 123', 'Directora')

  assert.equal(task.domain, 'management')
  assert.equal(valuation.domain, 'valuation')
  assert.equal(sortPlatformActivity([task, valuation], 2)[0].id, 'valuation:e2')
  assert.match(valuation.href, /\/dashboard\/valuations\/v1/)
})

test('activity API remains RLS-scoped and bounded', async () => {
  const fs = await import('node:fs/promises')
  const source = await fs.readFile('app/api/platform/activity/route.ts', 'utf8')
  assert.match(source, /requireUserScope\(\)/)
  assert.match(source, /\.limit\(limit\)/)
  assert.match(source, /Math\.min\(50/)
  assert.match(source, /management_task_events/)
  assert.match(source, /valuation_decision_log/)
  assert.doesNotMatch(source, /createAdminClient/)
})


test('attention inbox keeps formal work ahead of proactive work', async () => {
  const { composeAttentionInbox, proactiveAttentionItems, taskAttentionItems } = await import('../../lib/platform/attention')

  const formal = taskAttentionItems([{
    id: 't1',
    title: 'Llamar propietario',
    priority: 'medium',
    status: 'open',
    due_date: '2026-09-25',
  }], '2026-09-26')

  const proactive = proactiveAttentionItems([{
    id: 'seller-portfolio-contact',
    title: 'Ordenar cartera',
    domain: 'contacts',
    href: '/dashboard/properties',
    priority: 'medium',
    mode: 'proactive',
    source: 'operating-profile',
  }])

  const inbox = composeAttentionInbox(formal, proactive, 5)
  assert.equal(inbox.mode, 'attention')
  assert.equal(inbox.items[0].kind, 'task')
  assert.equal(inbox.items[0].priority, 'urgent')
  assert.equal(inbox.items[1].kind, 'proactive')
})

test('attention API is read-only, RLS-scoped and bounded', async () => {
  const fs = await import('node:fs/promises')
  const source = await fs.readFile('app/api/platform/attention/route.ts', 'utf8')
  assert.match(source, /requireUserScope\(\)/)
  assert.match(source, /management_tasks/)
  assert.match(source, /valuation_cases/)
  assert.match(source, /property_assignments/)
  assert.match(source, /writesPerformed:\s*0/)
  assert.doesNotMatch(source, /\.insert\(/)
  assert.doesNotMatch(source, /\.update\(/)
  assert.doesNotMatch(source, /createAdminClient/)
})
