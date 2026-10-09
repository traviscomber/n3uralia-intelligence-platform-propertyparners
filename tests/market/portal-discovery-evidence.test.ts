import assert from 'node:assert/strict'
import { test } from 'node:test'
import { decidePortalPageCompletion, extractPortalReportedCount, portalChallengeDetected, portalExplicitNoResults } from '../../lib/portal-discovery-evidence'
const page = { candidateCount: 48, newlyDiscovered: 48, uniqueTotal: 1960, publishedTotal: 2016, pageSize: 48, challenge: false, explicitNoResults: false }
test('published Chilean count distinguishes total from a single page', () => {
  assert.equal(extractPortalReportedCount('<main>2.016 resultados</main>'),2016)
  assert.equal(extractPortalReportedCount('<main>1,533 resultados</main>'),1533)
  assert.equal(extractPortalReportedCount('<main>48 avisos disponibles</main>'),null)
})
test('anti-bot and repeated page never masquerade as exhaust', () => {
  assert.equal(portalChallengeDetected('<div>suspicious-traffic-frontend</div>'),true)
  assert.throws(()=>decidePortalPageCompletion({...page,candidateCount:0,newlyDiscovered:0,challenge:true}),/PORTAL_SOURCE_CHALLENGE/)
  assert.throws(()=>decidePortalPageCompletion({...page,newlyDiscovered:0,publishedTotal:null}),/PORTAL_REPEATED_PAGE_UNVERIFIED/)
  assert.throws(()=>decidePortalPageCompletion({...page,candidateCount:0,newlyDiscovered:0,publishedTotal:null}),/PORTAL_UNVERIFIED_EMPTY_PAGE/)
})
test('full source count or verified empty terminal page can prove exhaustion', () => {
  assert.equal(decidePortalPageCompletion({...page,uniqueTotal:2016}),'exhausted')
  assert.equal(portalExplicitNoResults('<p>Sin resultados</p>'),true)
  assert.equal(decidePortalPageCompletion({...page,candidateCount:0,newlyDiscovered:0,uniqueTotal:1533,publishedTotal:null,explicitNoResults:true}),'exhausted')
  assert.equal(decidePortalPageCompletion({...page,candidateCount:12,newlyDiscovered:12,uniqueTotal:2012,publishedTotal:null}),'continue')
})
