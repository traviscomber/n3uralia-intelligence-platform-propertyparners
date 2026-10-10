import assert from 'node:assert/strict'
import { test } from 'node:test'
import { verifyMonthlyReportRelease } from '../lib/property-partners-report-release'

const pdf = new Uint8Array(1600)
pdf.set([37,80,68,70])
function fixture() {
  return {
    period: '2026-09',
    evidenceVersion: 'pedro-septiembre-approved',
    reconciliationVerified: true,
    artifacts: (['ceo','directoras','partners'] as const).map((audience) => ({
      audience,
      filename: audience + '.pdf',
      bytes: pdf,
      pageCount: 4,
      reviewedPageCount: 4,
      canonicalCoverageVerified: true,
      brandVerified: true,
      accessScopeVerified: true,
      visualInspectionVerified: true,
    })),
  }
}
test('three separate monthly PDF deliverables are required', () => {
  assert.doesNotThrow(() => verifyMonthlyReportRelease(fixture()))
  const one = fixture()
  one.artifacts.pop()
  assert.throws(() => verifyMonthlyReportRelease(one), /THREE_SEPARATE/)
})
test('release fails closed without complete visual and canonical review', () => {
  const p = fixture()
  p.artifacts[1].reviewedPageCount = 3
  assert.throws(() => verifyMonthlyReportRelease(p), /VISUAL_REVIEW/)
  const q = fixture()
  q.artifacts[2].canonicalCoverageVerified = false
  assert.throws(() => verifyMonthlyReportRelease(q), /QUALITY_GATE/)
})
test('release rejects duplicate names and unverified reconciliation', () => {
  const p = fixture()
  p.artifacts[2].filename = 'ceo.pdf'
  assert.throws(() => verifyMonthlyReportRelease(p), /FILENAME/)
  const q = fixture()
  q.reconciliationVerified = false
  assert.throws(() => verifyMonthlyReportRelease(q), /RECONCILIATION/)
})
