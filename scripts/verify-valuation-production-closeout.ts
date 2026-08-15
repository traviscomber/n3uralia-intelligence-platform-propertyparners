import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const form = readFileSync('app/dashboard/valuation/page.tsx', 'utf8')
const suggest = readFileSync('app/api/valuation/comparables/suggest/route.ts', 'utf8')
const cases = readFileSync('app/api/valuation/cases/route.ts', 'utf8')
const workspace = readFileSync('app/dashboard/valuations/[id]/page.tsx', 'utf8')
const workspaceApi = readFileSync('app/api/valuations/[id]/comparables/route.ts', 'utf8')
const report = readFileSync('components/valuation/valuation-evidence-report.tsx', 'utf8')
const contract = readFileSync('lib/valuation-contract.ts', 'utf8')

assert.match(form, /usefulAreaM2: undefined/, 'Unknown useful area must stay undefined.')
assert.match(form, /terraceAreaM2: undefined/, 'Unknown terrace area must stay undefined.')
assert.match(form, /bedrooms: undefined/, 'Unknown bedrooms must stay undefined.')
assert.match(form, /portalBenchmark/, 'Valuation UI must expose canonical Portal benchmark evidence.')
assert.match(form, /reference_only/, 'Incomplete live Portal references must be explicitly reference-only.')
assert.match(form, /disabled=\{referenceOnly\}/, 'Reference-only Portal evidence must not be selectable.')

assert.match(suggest, /createAdminClient/, 'Market evidence must be read server-side after capability authorization.')
assert.match(suggest, /isSubjectCbrs/, 'CBRS subject holdout exclusion must remain enabled.')
assert.match(suggest, /source_registered_area_not_confirmed_as_useful/, 'CBRS department area semantics must remain explicit.')
assert.match(suggest, /market_portal_reference_metrics/, 'Canonical Portal benchmark must remain part of suggestion evidence.')
assert.match(suggest, /quality: 'reference_only'/, 'Incomplete live Portal evidence must remain reference-only.')
assert.doesNotMatch(suggest, /usefulAreaM2:\s*built/, 'CBRS registered area must not be relabeled as useful area.')

assert.match(cases, /match_status: item\.selected \? 'accepted' : 'candidate'/, 'Unselected evidence must persist as candidate, not rejected/excluded.')
assert.doesNotMatch(cases, /selection_reason:/, 'Do not write nonexistent selection_reason column.')
assert.match(cases, /rateAnchor/, 'Human rate anchor must be persisted for traceability.')
assert.match(cases, /source_registered_area_not_confirmed_as_useful/, 'CBRS area semantics must be persisted with the case.')

assert.doesNotMatch(workspace, /Generar candidatos/, 'Legacy candidate generator must not be exposed in the workspace.')
assert.match(workspaceApi, /LEGACY_VALUATION_CANDIDATE_GENERATOR_DISABLED/, 'Legacy candidate generation endpoint must remain blocked.')
assert.doesNotMatch(workspaceApi, /valuation_candidate_pool/, 'Workspace API must not call the legacy candidate pool.')

assert.match(report, /match_status === 'rejected'/, 'Report must use the persisted rejected state.')
assert.doesNotMatch(report, /match_status === 'excluded'/, 'Report must not depend on nonexistent excluded state.')
assert.match(report, /Superficie registrada CBRS/, 'Report must not relabel CBRS registered area as useful area.')

assert.match(contract, /qualitativeAdjustmentPct: 0/, 'Qualitative factors must not apply automatic economic repricing.')
assert.match(contract, /commercial\.valueUf \/ \(1 - upliftPct \/ 100\)/, 'Publication scenarios must keep margin inversion.')
assert.match(contract, /positive\(item\.landAreaM2\) \/ 4/, 'House comparable area must keep land divided by four.')

console.log('[valuation-closeout] PASS: production guardrails are present')
