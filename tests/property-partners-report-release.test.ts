import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PDFDocument } from 'pdf-lib'
import { verifyMonthlyReportRelease } from '../lib/property-partners-report-release'

let pdf: Uint8Array
async function makePdf() {
  const doc = await PDFDocument.create()
  for (let i = 0; i < 4; i++) doc.addPage([595.28, 841.89])
  doc.setTitle('Canonical report')
  const bytes = await doc.save({ useObjectStreams: false })
  const padded = new Uint8Array(Math.max(1600, bytes.length))
  padded.set(bytes)
  return bytes.length >= 1600 ? bytes : padded
}
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
test('three separate monthly PDF deliverables are required', async () => {
  pdf = await makePdf()
  await assert.doesNotReject(() => verifyMonthlyReportRelease(fixture()))
  const one = fixture()
  one.artifacts.pop()
  await assert.rejects(() => verifyMonthlyReportRelease(one), /THREE_SEPARATE/)
})
test('release fails closed without complete visual and canonical review', async () => {
  pdf = await makePdf()
  const p = fixture()
  p.artifacts[1].reviewedPageCount = 3
  await assert.rejects(() => verifyMonthlyReportRelease(p), /VISUAL_REVIEW/)
  const q = fixture()
  q.artifacts[2].canonicalCoverageVerified = false
  await assert.rejects(() => verifyMonthlyReportRelease(q), /QUALITY_GATE/)
})
test('release rejects duplicate names and unverified reconciliation', async () => {
  pdf = await makePdf()
  const p = fixture()
  p.artifacts[2].filename = 'ceo.pdf'
  await assert.rejects(() => verifyMonthlyReportRelease(p), /FILENAME/)
  const q = fixture()
  q.reconciliationVerified = false
  await assert.rejects(() => verifyMonthlyReportRelease(q), /RECONCILIATION/)
})
