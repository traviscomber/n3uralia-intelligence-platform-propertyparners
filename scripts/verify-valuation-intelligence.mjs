import assert from 'node:assert/strict'
import data from '../data/valuation-intelligence.json' with { type: 'json' }

assert.equal(data.scope.commune, 'Vitacura')
assert.equal(data.scope.operation, 'Venta')
assert.equal(data.sourceInventory.length, 2)
assert.equal(data.sourceInventory.reduce((sum, source) => sum + source.sheets.reduce((sheetSum, sheet) => sheetSum + sheet.formulaCells, 0), 0), 122)
assert.equal(data.sourceInventory.reduce((sum, source) => sum + source.sheets.reduce((sheetSum, sheet) => sheetSum + sheet.formulaErrorCells, 0), 0), 0)
assert.equal(data.sourceReconciliation.currentPortalValidListings, 5197)
assert.equal(data.sourceReconciliation.currentPortalSaleEligibleListings, 5190)
assert.equal(data.sourceReconciliation.portalListingsQuarantinedByRentIndicator, 7)
assert.equal(data.sourceReconciliation.currentCbrsRows, 40843)
assert.equal(data.templateCase.offerComparables.rawCount, 6)
assert.equal(data.templateCase.offerComparables.canonicalCount, 5)
assert.equal(data.templateCase.offerComparables.presentInCurrentPortalSnapshot, 0)
assert.equal(data.templateCase.registeredComparables.exactInCurrentCbrs, 2)
assert.equal(data.templateCase.sourceCalculation.commercialValueUf, 15890)
assert.deepEqual(data.templateCase.sourceCalculation.scenarios.map((scenario) => scenario.publicationUf), [15890, 16726, 17656])
assert.equal(data.templateCase.laterRegisteredEvent.status, 'NOT_COMPARABLE_TEMPORALLY')
assert.equal(data.qualityIssues.filter((issue) => issue.severity === 'critical').length, 2)
assert.equal(data.privacy.rawTransactionRowsCommitted, false)

console.log('Valuation intelligence verified: 2 workbooks, 122 formulas, 5,197 Portal listings, 40,843 CBRS rows.')
