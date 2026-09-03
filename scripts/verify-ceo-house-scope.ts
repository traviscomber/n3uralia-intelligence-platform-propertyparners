import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  PROPERTY_PARTNERS_HOUSE_SCOPE_TAG,
  applyPropertyPartnersHouseScope,
  assertPropertyPartnersHouseScope,
} from '../lib/property-partners-ceo-intelligence-contract-scope'
import type {
  CanonicalCeoIntelligenceInput,
  PropertyPartnersCeoIntelligenceReport,
} from '../lib/property-partners-ceo-intelligence-report'

const houseRow = {
  neighborhood: 'Test Casa',
  propertyType: 'Casa',
  portalListings: null,
  cbrsTransactions: 10,
  portalMedianPriceUf: null,
  cbrsMedianPriceUf: 9000,
  portalMedianUfM2: null,
  cbrsMedianUfM2: 90,
  gapPct: null,
  supplyDepthRatio: null,
  signal: 'insufficient_coverage',
  confidence: 'low',
  asOfPortal: '2026-03-09',
  asOfCbrs: '2026-01-09',
  evidenceRefs: ['market:house'],
}

const apartmentRow = {
  ...houseRow,
  neighborhood: 'Test Apartment',
  propertyType: 'Departamento',
  portalListings: 20,
  portalMedianUfM2: 110,
  gapPct: 0.2,
  evidenceRefs: ['market:apartment'],
}

const input = {
  reportId: 'scope-test',
  title: 'Scope test',
  client: 'Property Partners Vitacura',
  audience: 'CEO',
  purpose: 'Informe ejecutivo mensual.',
  period: { start: '2026-07-01', end: '2026-07-31', sourceCutoff: '2026-08-02', emittedAt: '2026-09-03T00:00:00.000Z' },
  evidence: [
    { id: 'market:house', claim: 'Casa', source: 'canonical', status: 'partial' },
    { id: 'market:apartment', claim: 'Apartment', source: 'canonical', status: 'verified' },
  ],
  headlineKpis: [],
  monthlySeries: { sales: [], salesUf: [] },
  funnel: [],
  offices: [],
  market: { polygons: [], rows: [houseRow, apartmentRow], portalCutoff: '2026-03-09', cbrsCutoff: '2026-01-09' },
  valuation: { totalCases: 0, byStatus: [], periodStart: '2026-07-01', periodEnd: '2026-07-31', evidenceRefs: [] },
  dependencies: [],
  delivery: { recipient: null, status: 'draft', purpose: 'Internal review', paymentStatus: 'not_applicable', deliveredAt: null },
  sourceSnapshotId: 'pp-ceo:test',
} satisfies CanonicalCeoIntelligenceInput

const scoped = applyPropertyPartnersHouseScope(input)
assert.equal(scoped.market.rows.length, 1)
assert.equal(scoped.market.rows[0]?.propertyType, 'Casa')
assert.equal(scoped.evidence.some((item) => item.id === 'market:apartment'), false)
assert.match(scoped.purpose, /exclusivamente ventas de casas en Vitacura/i)
assert.ok(scoped.sourceSnapshotId.endsWith(PROPERTY_PARTNERS_HOUSE_SCOPE_TAG))

const report = {
  report_type: 'property_partners_ceo_intelligence',
  standard_version: '1.0',
  title: 'CEO Intelligence casas',
  subtitle: 'Mercado y operación',
  client: scoped.client,
  audience: scoped.audience,
  purpose: scoped.purpose,
  executive_summary: 'Lectura ejecutiva de casas en Vitacura.',
  what_changed: ['Sin cambios fuera de alcance.'],
  what_matters: ['Mantener evidencia canónica.'],
  sections: [],
  decisions: [],
  limitations: [],
  period: { start: scoped.period.start, end: scoped.period.end, source_cutoff: scoped.period.sourceCutoff },
  delivery: scoped.delivery,
  source_snapshot_id: scoped.sourceSnapshotId,
  snapshot: {
    headline_kpis: [],
    monthly_series: scoped.monthlySeries,
    funnel: [],
    offices: [],
    market: scoped.market,
    valuation: scoped.valuation,
  },
  canonical_metadata: {
    provider: 'OpenAI',
    model: 'verification-model',
    api: 'responses',
    reasoning_effort: 'medium',
    reasoning_mode: 'standard',
    store: false,
    generated_at: '2026-09-03T00:00:00.000Z',
    source_policy: 'canonical_input_only',
    prompt_version: 'ceo-intelligence-1.0',
  },
} satisfies PropertyPartnersCeoIntelligenceReport

assert.doesNotThrow(() => assertPropertyPartnersHouseScope(report))
assert.throws(
  () => assertPropertyPartnersHouseScope({ ...report, snapshot: { ...report.snapshot, market: { ...report.snapshot.market, rows: [houseRow, apartmentRow] } } }),
  /CEO_INTELLIGENCE_OUT_OF_SCOPE_MARKET_ROW/,
)
assert.throws(
  () => assertPropertyPartnersHouseScope({ ...report, executive_summary: 'Incluye departamentos.' }),
  /CEO_INTELLIGENCE_OUT_OF_SCOPE_CONTENT/,
)

const pdfSource = fs.readFileSync(new URL('../lib/reportin-ceo-intelligence-pdf-house-only.ts', import.meta.url), 'utf8')
assert.doesNotMatch(pdfSource, /departamentos?/i, 'House-only artifact builder must not carry apartment labels in its page content.')
assert.doesNotMatch(pdfSource, /arriendos?/i, 'House-only artifact builder must not carry rental labels in its page content.')
assert.match(pdfSource, /replacePage\(pdf, 2\)/, 'House-only artifact must replace the legacy map page, not overlay it.')
assert.match(pdfSource, /replacePage\(pdf, 3\)/, 'House-only artifact must replace the legacy benchmark page, not overlay it.')
assert.match(pdfSource, /replacePage\(pdf, 6\)/, 'House-only artifact must replace the legacy decisions page, not overlay it.')

const artifactRouteSource = fs.readFileSync(new URL('../app/api/management/reports/ceo-intelligence/[id]/artifact/route.ts', import.meta.url), 'utf8')
assert.match(artifactRouteSource, /buildHouseOnlyCeoIntelligencePdf/, 'CEO artifact route must serve the semantic-clean house-only PDF builder.')

console.log('CEO Intelligence house-only contractual scope verified.')
