import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildCanonicalMonthlySnapshot } from '../lib/management-canonical-monthly-snapshot'

test('August canonical monthly snapshot uses the Pedro board authority without inventing missing metrics', () => {
  const snapshot = buildCanonicalMonthlySnapshot(
    '2026-08',
    '2026-09-25T12:00:00.000Z',
    'manual',
  )

  assert.ok(snapshot)
  assert.equal(snapshot.period.start, '2026-08-01')
  assert.equal(snapshot.period.end, '2026-08-31')
  assert.equal(snapshot.provenance.sourceAuthority.file, 'Ago_Directorio.pptx')
  assert.equal(snapshot.provenance.sourceAuthority.sha256, '395e5d942d575bf17939cef99567cfa6ef3f2c6b85bb9d1af43a7b2c20ea2f74')

  assert.equal(snapshot.company.cierresAcreditados, 8)
  assert.equal(snapshot.company.volumenUfAcreditado, 141650)
  assert.equal(snapshot.company.metaCierres, 8.2)
  assert.equal(snapshot.company.cartera, 324)
  assert.equal(snapshot.company.requerimientos, 468)
  assert.equal(snapshot.company.visitasAgendadas, 324)
  assert.equal(snapshot.company.visitasRealizadas, 189)
  assert.equal(snapshot.company.scoreGestion, 67.4)

  assert.equal(snapshot.company.captaciones, null)
  assert.equal(snapshot.company.leadsNuevos, null)
  assert.equal(snapshot.company.suspendidas, null)
  assert.equal(snapshot.completeness.operationalReportReady, false)
  assert.equal(snapshot.completeness.fullManagementScoreReady, true)
  assert.deepEqual(
    snapshot.completeness.blocked.map((item) => item.code),
    ['captations', 'leads', 'suspended_listings'],
  )

  assert.equal(snapshot.offices.length, 3)
  assert.equal(snapshot.entities.filter((entity) => entity.entityType === 'partner').length, 0)
})

test('canonical monthly snapshot handles calendar month ends and refuses unpublished periods', () => {
  const february = buildCanonicalMonthlySnapshot('2026-02', '2026-03-01T12:00:00.000Z', 'cron')
  assert.ok(february)
  assert.equal(february.period.end, '2026-02-28')

  assert.equal(buildCanonicalMonthlySnapshot('2026-09', '2026-10-01T12:00:00.000Z', 'cron'), null)
  assert.equal(buildCanonicalMonthlySnapshot('invalid', '2026-10-01T12:00:00.000Z', 'cron'), null)
})
