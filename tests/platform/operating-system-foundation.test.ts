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
