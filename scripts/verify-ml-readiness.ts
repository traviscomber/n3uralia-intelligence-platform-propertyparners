import assert from 'node:assert/strict'
import { getMlLabSnapshot } from '../lib/ml-lab'

const lab = getMlLabSnapshot()
const contract = lab.experimentContract

assert.equal(contract.confirmedPairs, 0, 'No Portal–CBRS pairs are currently confirmed.')
assert.equal(contract.trainingEnabled, false, 'Price training must remain disabled without confirmed pairs.')
assert.equal(lab.canTrainPriceModel, false, 'The ML Lab must not expose price training as enabled.')
assert.deepEqual(contract.segments, ['apartment', 'house'], 'Houses and apartments must remain separate segments.')
assert.equal(contract.splitStrategy, 'temporal', 'Model validation must use a temporal split.')
assert.equal(contract.baseline, 'property_partners_excel_rules', 'Every challenger must retain the Excel rules as baseline.')
assert.equal(contract.sourceHashes.length, 7, 'The contract must fingerprint five market sources and two valuation templates.')
assert.equal(new Set(contract.sourceHashes).size, contract.sourceHashes.length, 'Every ML source fingerprint must be unique.')
assert.equal(lab.portalRows, lab.apartmentRows + lab.projectRows + lab.houseRows, 'Portal segment rows must reconcile to the source total.')
assert.ok(lab.residentialCbrsRows <= lab.cbrsRows, 'Residential CBRS assets cannot exceed all CBRS assets.')
assert.ok(lab.blockingChecks > 0, 'Incomplete evidence must keep at least one blocking gate visible.')

console.log(`ML readiness verified: ${lab.blockingChecks} blocking gates, ${contract.confirmedPairs} confirmed pairs, ${contract.sourceHashes.length} immutable source hashes.`)
