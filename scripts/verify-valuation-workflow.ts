import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { constants } from 'node:fs'

async function read(path: string) {
  return readFile(path, 'utf8')
}

async function exists(path: string) {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function main() {
  const createRoute = await read('app/api/valuation/cases/route.ts')
  const comparableRoute = await read('app/api/valuations/[id]/comparables/route.ts')
  const workflowRoute = await read('app/api/valuations/[id]/workflow/route.ts')
  const accessControl = await read('lib/access-control.ts')
  const creatorPage = await read('app/dashboard/valuation/page.tsx')
  const workspacePage = await read('app/dashboard/valuations/[id]/page.tsx')
  const reportPage = await read('app/dashboard/valuations/[id]/report/page.tsx')
  const reportBanner = await read('components/valuation/valuation-report-status-banner.tsx')
  const auditActionMigration = await read('supabase/migrations/20260816_allow_valuation_case_created_decision_action.sql')

  assert.match(createRoute, /const status = ['"]draft['"] as const/)
  assert.doesNotMatch(createRoute, /payload\.status/)
  assert.match(createRoute, /action:\s*['"]case_created['"]/)
  assert.match(auditActionMigration, /'case_created'::text/, 'Database decision-log constraint must allow the case_created action used by the valuation API.')
  assert.match(auditActionMigration, /valuation_decision_log_action_check/, 'Valuation audit-action migration must explicitly replace the decision-log action constraint.')
  assert.match(createRoute, /valuation_case_versions/)
  assert.match(createRoute, /rateAnchor/)
  assert.match(createRoute, /match_status: item\.selected \? 'accepted' : 'candidate'/)

  assert.match(creatorPage, /useState<ValuationComparable\[]>\(\[\]\)/)
  assert.doesNotMatch(creatorPage, /similarityScore:\s*0\.7/)
  assert.doesNotMatch(creatorPage, /selected:\s*true/)
  assert.match(creatorPage, /router\.push\(`\/dashboard\/valuations\/\$\{payload\.caseId\}`\)/)
  assert.doesNotMatch(creatorPage, /Enviar a revisión/)
  assert.match(creatorPage, /reference_only/)

  assert.match(workflowRoute, /transition_valuation_case_atomic/)
  assert.match(workflowRoute, /target_case_id:\s*id/)
  assert.match(workflowRoute, /target_status:\s*target/)
  assert.match(workflowRoute, /transition_reason:\s*reason/)
  assert.match(workflowRoute, /atomic:\s*true/)
  assert.doesNotMatch(workflowRoute, /from\(['"]valuation_cases['"]\)\.update/)
  assert.doesNotMatch(workflowRoute, /from\(['"]valuation_case_versions['"]\)\.insert/)
  assert.doesNotMatch(workflowRoute, /from\(['"]valuation_decision_log['"]\)\.insert/)

  const ceoBlock = accessControl.match(/ceo:\s*\[([\s\S]*?)\n\s*\],/)?.[1] ?? ''
  const adminBlock = accessControl.match(/admin:\s*\[([\s\S]*?)\n\s*\],/)?.[1] ?? ''
  const directorBlock = accessControl.match(/director:\s*\[([\s\S]*?)\n\s*\],/)?.[1] ?? ''
  const subdirectorBlock = accessControl.match(/subdirector:\s*\[([\s\S]*?)\n\s*\],/)?.[1] ?? ''
  assert.match(ceoBlock, /valuations\.global\.approve/)
  assert.doesNotMatch(adminBlock, /valuations\.global\.approve/)
  assert.doesNotMatch(directorBlock, /valuations\.global\.approve/)
  assert.doesNotMatch(subdirectorBlock, /valuations\.global\.approve/)
  assert.match(directorBlock, /valuations\.office\.review/)
  assert.match(subdirectorBlock, /valuations\.office\.review/)

  assert.match(comparableRoute, /Motivo de exclusión requerido/)
  assert.match(comparableRoute, /LEGACY_VALUATION_CANDIDATE_GENERATOR_DISABLED/)
  assert.doesNotMatch(comparableRoute, /valuation_candidate_pool/)
  assert.match(comparableRoute, /apply_valuation_comparable_decision/)
  assert.match(comparableRoute, /assertProfileVisible\(scope, valuationCase\.requested_by\)/)
  assert.match(comparableRoute, /scope\.capabilities\.includes\(['"]valuations\.office\.review['"]\)/)
  assert.match(comparableRoute, /scope\.capabilities\.includes\(['"]valuations\.global\.approve['"]\)/)
  assert.doesNotMatch(comparableRoute, /ELEVATED_ROLES/)
  assert.doesNotMatch(comparableRoute, /canOperateCase/)

  assert.match(workspacePage, /\/api\/valuations\/\$\{id\}\/comparables/)
  assert.match(workspacePage, /\/api\/valuations\/\$\{id\}\/workflow/)
  assert.doesNotMatch(workspacePage, /Generar candidatos/)
  assert.match(reportPage, /ValuationReportStatusBanner/)
  assert.match(reportBanner, /PRELIMINAR · NO PUBLICABLE/)
  assert.match(reportBanner, /VALORIZACIÓN EMITIDA/)

  const obsoleteRoutes = [
    'app/api/valuation-cases/[id]/comparables/route.ts',
    'app/api/valuation-engine/cases/[id]/route.ts',
    'app/api/valuation/cases/[id]/comparables/route.ts',
    'app/api/valuation/cases/[id]/workflow/route.ts',
  ]

  for (const route of obsoleteRoutes) {
    assert.equal(await exists(route), false, `Obsolete valuation route still exists: ${route}`)
  }

  console.log('Valuation workflow verified: atomic transitions, CEO-only approval, scoped review, canonical comparable generation boundary, audit action compatibility and non-publicable preliminary reports.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
