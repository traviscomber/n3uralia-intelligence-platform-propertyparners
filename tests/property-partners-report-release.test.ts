import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PDFDocument } from 'pdf-lib'
import { verifyMonthlyReportRelease } from '../lib/property-partners-report-release'

let pdfs: Record<string, Uint8Array>
async function makePdf(audience: string) {
  const doc = await PDFDocument.create()
  for (let i = 0; i < 4; i++) doc.addPage([595.28, 841.89])
  doc.setTitle('Canonical ' + audience)
  doc.setSubject(`PP_REPORT|${audience}|2026-09|pedro-septiembre-approved`)
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
      filename: audience + '-2026-09.pdf',
      bytes: pdfs[audience],
      pageCount: 4,
      reviewedPageCount: 4,
      canonicalCoverageVerified: true,
      brandVerified: true,
      accessScopeVerified: true,
      visualInspectionVerified: true,
      sourcePeriod: '2026-09',
      sourceEvidenceVersion: 'pedro-septiembre-approved',
      embeddedIdentityVerified: true,
    })),
  }
}
test('three separate monthly PDF deliverables are required', async () => {
  pdfs = Object.fromEntries(await Promise.all(['ceo','directoras','partners'].map(async audience => [audience, await makePdf(audience)] as const)))
  await assert.doesNotReject(() => verifyMonthlyReportRelease(fixture()))
  const one = fixture()
  one.artifacts.pop()
  await assert.rejects(() => verifyMonthlyReportRelease(one), /THREE_SEPARATE/)
})
test('release fails closed without complete visual and canonical review', async () => {
  pdfs = Object.fromEntries(await Promise.all(['ceo','directoras','partners'].map(async audience => [audience, await makePdf(audience)] as const)))
  const p = fixture()
  p.artifacts[1].reviewedPageCount = 3
  await assert.rejects(() => verifyMonthlyReportRelease(p), /VISUAL_REVIEW/)
  const q = fixture()
  q.artifacts[2].canonicalCoverageVerified = false
  await assert.rejects(() => verifyMonthlyReportRelease(q), /QUALITY_GATE/)
})
test('release rejects duplicate names and unverified reconciliation', async () => {
  pdfs = Object.fromEntries(await Promise.all(['ceo','directoras','partners'].map(async audience => [audience, await makePdf(audience)] as const)))
  const p = fixture()
  p.artifacts[2].filename = 'ceo-2026-09.pdf'
  await assert.rejects(() => verifyMonthlyReportRelease(p), /FILENAME/)
  const q = fixture()
  q.reconciliationVerified = false
  await assert.rejects(() => verifyMonthlyReportRelease(q), /RECONCILIATION/)
})

test('release rejects identical PDF content under different audience labels', async () => {
  pdfs = Object.fromEntries(await Promise.all(['ceo','directoras','partners'].map(async audience => [audience, await makePdf(audience)] as const)))
  const p = fixture()
  p.artifacts[1].bytes = p.artifacts[0].bytes
  await assert.rejects(() => verifyMonthlyReportRelease(p), /DUPLICATE_PDF_CONTENT/)
})

test('release rejects a report filename assigned to another period', async () => {
  pdfs = Object.fromEntries(await Promise.all(['ceo','directoras','partners'].map(async audience => [audience, await makePdf(audience)] as const)))
  const p = fixture()
  p.artifacts[1].filename = 'directoras-2026-08.pdf'
  await assert.rejects(() => verifyMonthlyReportRelease(p), /PERIOD_NOT_IN_FILENAME/)
})

test('release rejects audience PDF generated from different month or evidence version', async () => {
  pdfs = Object.fromEntries(await Promise.all(['ceo','directoras','partners'].map(async audience => [audience, await makePdf(audience)] as const)))
  const wrongMonth = fixture()
  wrongMonth.artifacts[1].sourcePeriod = '2026-08'
  await assert.rejects(() => verifyMonthlyReportRelease(wrongMonth), /SOURCE_PERIOD_MISMATCH/)
  const wrongSnapshot = fixture()
  wrongSnapshot.artifacts[2].sourceEvidenceVersion = 'other-snapshot'
  await assert.rejects(() => verifyMonthlyReportRelease(wrongSnapshot), /SOURCE_VERSION_MISMATCH/)
})

test('release rejects a PDF whose embedded identity contradicts its manifest', async () => {
  pdfs = Object.fromEntries(await Promise.all(['ceo','directoras','partners'].map(async audience => [audience, await makePdf(audience)] as const)))
  const p = fixture()
  const altered = await PDFDocument.load(p.artifacts[0].bytes)
  altered.setSubject('PP_REPORT|ceo|2026-08|pedro-septiembre-approved')
  const changed = await altered.save()
  const padded = new Uint8Array(Math.max(1600, changed.length))
  padded.set(changed)
  p.artifacts[0].bytes = padded
  await assert.rejects(() => verifyMonthlyReportRelease(p), /EMBEDDED_EVIDENCE_MISMATCH/)
})

test('delivery is held when embedded identity was not verified', async () => {
  pdfs = Object.fromEntries(await Promise.all(['ceo','directoras','partners'].map(async audience => [audience, await makePdf(audience)] as const)))
  const p = fixture()
  p.artifacts[0].embeddedIdentityVerified = false
  await assert.rejects(() => verifyMonthlyReportRelease(p), /EMBEDDED_IDENTITY_NOT_VERIFIED/)
})
