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

const createRoute = await read('app/api/valuation/cases/route.ts')
const comparableRoute = await read('app/api/valuations/[id]/comparables/route.ts')
const workflowRoute = await read('app/api/valuations/[id]/workflow/route.ts')
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
assert.match(workflowRoute, /Solo dirección puede aprobar/)
assert.match(workflowRoute, /Solo dirección puede emitir/)
assert.match(workflowRoute, /valuation_case_versions/)
assert.match(workflowRoute, /valuation_decision_log/)

assert.match(comparableRoute, /Motivo de exclusión requerido/)
assert.match(comparableRoute, /duplicateKeys/)
assert.match(comparableRoute, /estimated_value_uf:\s*null/)
assert.match(comparableRoute, /match_status:\s*['"]accepted['"]/)

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

console.log('Valuation workflow verified: draft-only creation, canonical APIs, evidence rules, permissions and audit trail.')
