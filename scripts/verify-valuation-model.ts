import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { apartmentOfferWeightedUfM2, calculateDeterministicValuation, houseWeightedUfM2 } from '../lib/valuation-model'
import { calculateContractualValuation } from '../lib/valuation-contract'

const apartment = calculateDeterministicValuation({
  propertyType: 'Departamento', usefulAreaM2: 227, terraceAreaM2: 53, appliedUsefulUfM2: 70,
})
assert.equal(apartment.effectiveAreaM2, 253.5)
assert.equal(apartment.commercialValueUf, 15890)
assert.equal(apartment.commercialWeightedUfM2, 62.7)
assert.deepEqual(apartment.scenarios.map((scenario) => scenario.publicationUf), [15890, 16726])
assert.equal(Number(apartmentOfferWeightedUfM2(14200, 220, 250).toFixed(6)), 60.425532)

const house = calculateDeterministicValuation({
  propertyType: 'Casa', builtAreaM2: 200, landAreaM2: 800, builtUfM2: 50, landUfM2: 10,
})
assert.equal(house.effectiveAreaM2, 400)
assert.equal(house.commercialValueUf, 18000)
assert.equal(house.commercialWeightedUfM2, 45)
assert.equal(houseWeightedUfM2(18000, 200, 800), 45)

const factors = { condition: 0, remodeling: 0, orientation: 0, floor: 0, light: 0, view: 0, noise: 0, commercialPotential: 0 }
const subject = { propertyType: 'Departamento' as const, address: 'Caso de prueba', neighborhood: 'Vitacura', latitude: -33.38, longitude: -70.57, usefulAreaM2: 100, terraceAreaM2: 0, usefulRateUfM2: 70 }
const comparables = [
  { id: 'a', sourceType: 'Portal' as const, sourceReference: 'a', address: 'a', neighborhood: 'Vitacura', propertyType: 'Departamento' as const, transactionDate: '2026-01-10', distanceMeters: 300, usefulAreaM2: 100, totalAreaM2: 120, priceUf: 5000, priceUfM2: 50, similarityScore: 0.95, selected: true, adjustmentPct: 0 },
  { id: 'b', sourceType: 'Portal' as const, sourceReference: 'b', address: 'b', neighborhood: 'Vitacura', propertyType: 'Departamento' as const, transactionDate: '2026-02-10', distanceMeters: 500, usefulAreaM2: 100, totalAreaM2: 120, priceUf: 7000, priceUfM2: 70, similarityScore: 0.78, selected: true, adjustmentPct: 0 },
  { id: 'c', sourceType: 'Portal' as const, sourceReference: 'c', address: 'c', neighborhood: 'Vitacura', propertyType: 'Departamento' as const, transactionDate: '2026-03-10', distanceMeters: 700, usefulAreaM2: 100, totalAreaM2: 120, priceUf: 9000, priceUfM2: 90, similarityScore: 0.62, selected: true, adjustmentPct: 0 },
]
const weighted = calculateContractualValuation(subject, comparables, factors)
assert.equal(weighted.baseUfM2, 70)
assert.equal(weighted.baseValueUf, 7000)
assert.throws(() => calculateContractualValuation(subject, comparables.slice(0, 2), factors), /al menos tres comparables/)

const valuationPage = readFileSync('app/dashboard/valuation/page.tsx', 'utf8')
const valuationWorkspace = readFileSync('app/dashboard/valuations/[id]/page.tsx', 'utf8')
const valuationApi = readFileSync('app/api/valuation/cases/route.ts', 'utf8')
const valuationReport = readFileSync('components/valuation/valuation-evidence-report.tsx', 'utf8')
const marketPage = readFileSync('app/dashboard/market/page.tsx', 'utf8')
const marketExport = readFileSync('app/api/market/export/route.ts', 'utf8')
const marketPrint = readFileSync('app/dashboard/market/export/page.tsx', 'utf8')
const marketPrintButton = readFileSync('components/market/market-print-button.tsx', 'utf8')
const scopeMatrix = readFileSync('docs/CONTRACTUAL_SCOPE_MATRIX.md', 'utf8')

assert.match(valuationPage, /latitude: subject\.latitude/, 'Guided valuation flow must preserve subject latitude in market analysis.')
assert.match(valuationPage, /longitude: subject\.longitude/, 'Guided valuation flow must preserve subject longitude in market analysis.')
assert.match(valuationPage, /Fecha venta/, 'Valuation form must expose comparable transaction date when details are expanded.')
assert.match(valuationPage, /item\.distanceMeters/, 'Guided valuation flow must render comparable distance from canonical evidence.')
assert.match(valuationPage, /similarityScore: 0,/, 'Blank comparables must start without an assumed similarity.')
assert.match(valuationPage, /selected: false,/, 'Blank comparables must not start selected.')
assert.match(valuationPage, /useState<ValuationComparable\[]>\(\[\]\)/, 'Valuation form must not create placeholder comparables.')
assert.doesNotMatch(valuationPage, /similarityScore: 0\.7/, 'Valuation form must not contain the historical simulated 70% score.')
assert.match(valuationWorkspace, /similarity_score \* 100/, 'Workspace must render canonical 0-1 similarity as a percentage.')
assert.match(valuationWorkspace, /min=\{-35\} max=\{35\}/, 'Workspace adjustment range must match the canonical API range.')
assert.match(valuationWorkspace, /Resultado preliminar/, 'Draft and review values must be clearly marked as preliminary.')
assert.match(valuationApi, /distance_meters: item\.distanceMeters \?\? null/, 'Valuation API must persist comparable distance.')
assert.match(valuationApi, /transaction_date: item\.transactionDate \?\? null/, 'Valuation API must persist transaction date.')
assert.match(valuationReport, /transaction_date/, 'Printable valuation report must include transaction date.')
assert.match(valuationReport, /distance_meters/, 'Printable valuation report must include distance.')
assert.match(marketExport, /requireCapability\('market\.read'\)/, 'Market exports must require centralized authorization.')
assert.match(marketExport, /XLSX\.utils\.book_new/, 'Market export must generate XLSX from the operational dataset.')
assert.match(marketExport, /market_current_listings/, 'Market export must use operational listings.')
assert.match(marketExport, /market_transactions/, 'Market export must use persisted transactions.')
assert.match(marketPage, /dataset=listings&format=xlsx/, 'Market dashboard must expose XLSX export.')
assert.match(marketPage, /\/dashboard\/market\/export/, 'Market dashboard must expose printable report.')
assert.match(marketPrint, /MarketPrintButton/, 'Market report must mount the browser print control.')
assert.match(marketPrintButton, /Imprimir o guardar PDF/, 'Market print control must expose browser PDF output.')
assert.doesNotMatch(scopeMatrix, /Estado inicial/, 'Contractual matrix must not retain historical initial-state labels.')
assert.match(scopeMatrix, /MKT-15/, 'Contractual matrix must track export completion explicitly.')
assert.match(scopeMatrix, /VAL-01/, 'Contractual matrix must track objective valuation fields explicitly.')

console.log('Valuation model, canonical evidence and non-mock invariants verified.')
