import data from '../data/market-source-intelligence.json' with { type: 'json' }

const failures = []
const expect = (condition, message) => { if (!condition) failures.push(message) }
expect(data.scope.commune === 'Vitacura' && data.scope.operation === 'Venta', 'Scope must be Vitacura sales')
expect(data.sourceInventory.fileCount === 5 && data.sourceInventory.files.length === 5, 'Expected five source files')
expect(data.kml.geometryAudit.polygonCount === 19, 'Expected 19 KML polygons')
expect(data.cross.portal.reduce((sum, item) => sum + item.listingIds.present, 0) === 5197, 'Expected 5,197 Portal rows')
expect(data.cross.portalCrossFileListingIds.uniqueAcrossFiles === 5197, 'Portal listing IDs are not globally unique')
expect(data.cross.cbrs.rows === 40843, 'Expected 40,843 CBRS rows')
expect(data.cross.cbrs.candidateKeyCardinality.event_plus_rol.unique === 40843, 'CBRS asset key is not unique')
expect(data.operatingModel.deterministicKeys.portalToCbrs === null, 'Portal-CBRS must remain non-deterministic')
expect(data.operatingModel.matchPolicy.currentConfirmedMatches === 0, 'No Portal-CBRS match may be pre-confirmed')
expect(data.sourceInventory.cellManifest.cellCount === 1402056, `Expected 1,402,056 manifested cells, got ${data.sourceInventory.cellManifest.cellCount}`)
if (failures.length) { console.error(failures.map((item) => `- ${item}`).join('\n')); process.exit(1) }
console.log('Market source intelligence verified: 5 sources, 5,197 Portal listings, 40,843 CBRS rows, 19 polygons.')
