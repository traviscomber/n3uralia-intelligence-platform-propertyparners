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

  assert.match(createRoute, /const status = ['"]draft['"] as const/)
  assert.doesNotMatch(createRoute, /payload\.status/)
  assert.match(createRoute, /action:\s*['"]case_created['"]/)
  assert.match(createRoute, /valuation_case_versions/)

  assert.match(creatorPage, /blankComparable\(3,/)
  assert.match(creatorPage, /router\.push\(`\/dashboard\/valuations\/\$\{payload\.caseId\}`\)/)
  assert.doesNotMatch(creatorPage, /Enviar a revisión/)

  assert.match(workflowRoute, /accepted\.length < 3/)
  assert.match(workflowRoute, /const canApprove = scope\.capabilities\.includes\(['"]valuations\.global\.approve['"]\)/)
  assert.doesNotMatch(workflowRoute, /const canApprove =[^\n]*\|\| canReview/)
  assert.match(workflowRoute, /Solo Dirección puede aprobar/)
  assert.match(workflowRoute, /Solo Dirección puede emitir/)
  assert.match(workflowRoute, /Solo dirección de oficina puede devolver el caso a borrador/)
  assert.match(workflowRoute, /valuation_case_versions/)
  assert.match(workflowRoute, /valuation_decision_log/)

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
  assert.match(comparableRoute, /existingKeys/)
  assert.match(comparableRoute, /seenKeys/)
  assert.match(comparableRoute, /duplicatesSkipped/)
  assert.match(comparableRoute, /match_status:\s*['"]accepted['"]/)
  assert.match(comparableRoute, /canApprove:\s*access\.role === ['"]ceo['"]/)
  assert.match(comparableRoute, /canIssue:\s*access\.role === ['"]ceo['"]/)
  assert.doesNotMatch(comparableRoute, /canApprove:\s*ELEVATED_ROLES\.includes/)
  assert.doesNotMatch(comparableRoute, /canIssue:\s*ELEVATED_ROLES\.includes/)

  assert.match(workspacePage, /\/api\/valuations\/\$\{id\}\/comparables/)
  assert.match(workspacePage, /\/api\/valuations\/\$\{id\}\/workflow/)

  const obsoleteRoutes = [
    'app/api/valuation-cases/[id]/comparables/route.ts',
    'app/api/valuation-engine/cases/[id]/route.ts',
    'app/api/valuation/cases/[id]/comparables/route.ts',
    'app/api/valuation/cases/[id]/workflow/route.ts',
  ]

  for (const route of obsoleteRoutes) {
    assert.equal(await exists(route), false, `Obsolete valuation route still exists: ${route}`)
  }

  console.log('Valuation workflow verified: CEO-only approval and issuance, office review, evidence rules and audit trail.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
