import assert from 'node:assert/strict'
import test from 'node:test'

import { getMlLabSnapshot } from '../lib/ml-lab'

test('forecast engine remains research-only without confirmed training pairs', () => {
  const lab = getMlLabSnapshot()

  assert.equal(lab.status, 'research_only')
  assert.equal(lab.experimentContract.confirmedPairs, 0)
  assert.equal(lab.experimentContract.trainingEnabled, false)
  assert.equal(lab.canTrainPriceModel, false)
  assert.equal(lab.modelVersions, 0)
  assert.equal(lab.approvedVersions, 0)
})

test('forecast contract preserves segment isolation and temporal validation', () => {
  const contract = getMlLabSnapshot().experimentContract

  assert.deepEqual(contract.segments, ['apartment', 'house'])
  assert.equal(contract.splitStrategy, 'temporal')
  assert.equal(contract.target, 'registered_sale_price_uf')
  assert.equal(contract.baseline, 'property_partners_excel_rules')
})

test('forecast activation requires professional approval', () => {
  const contract = getMlLabSnapshot().experimentContract

  assert.equal(contract.activation, 'professional_approval_required')
})

test('forecast evidence remains immutable and source-complete', () => {
  const contract = getMlLabSnapshot().experimentContract

  assert.equal(contract.sourceHashes.length, 7)
  assert.equal(new Set(contract.sourceHashes).size, contract.sourceHashes.length)
  assert.ok(contract.sourceHashes.every((hash) => /^[a-f0-9]{64}$/.test(hash)))
})

test('forecast readiness exposes blocking gates until evidence is sufficient', () => {
  const lab = getMlLabSnapshot()
  const blockingChecks = lab.checks.filter(
    (check) => check.blocksTraining && check.status !== 'ready',
  )

  assert.equal(lab.blockingChecks, blockingChecks.length)
  assert.ok(blockingChecks.length > 0)
  assert.ok(blockingChecks.some((check) => check.label === 'Pares oferta–cierre'))
  assert.ok(blockingChecks.some((check) => check.label === 'Backtesting temporal'))
})

test('forecast source metrics reconcile before any model is trained', () => {
  const lab = getMlLabSnapshot()

  assert.equal(lab.portalRows, lab.apartmentRows + lab.projectRows + lab.houseRows)
  assert.ok(lab.eligibleOffers <= lab.validOffers)
  assert.ok(lab.residentialCbrsRows <= lab.cbrsRows)
  assert.ok(lab.portalGeoAssigned <= lab.portalRows)
})
