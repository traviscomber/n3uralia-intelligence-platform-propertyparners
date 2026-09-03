import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { isReusableCeoIntelligenceDocument } from '../lib/ceo-intelligence-report-dedupe'

const currentSnapshot = 'pp-ceo:2026-07-01_2026-07-31:2026-09-03:81'
const oldSnapshot = 'pp-ceo:2026-07-01_2026-07-31:2026-08-02:81'
const base = {
  id: 'report-current',
  title: 'Property Partners Vitacura · CEO Intelligence · Julio 2026',
  created_at: '2026-09-03T20:00:00.000Z',
  tags: ['canonical', 'n3uralia-client-report', 'ceo-intelligence-report', 'scope-casas-vitacura-v1', 'draft'],
}

assert.equal(isReusableCeoIntelligenceDocument({
  ...base,
  content: JSON.stringify({ report_type: 'property_partners_ceo_intelligence', source_snapshot_id: currentSnapshot }),
}, currentSnapshot), true)

assert.equal(isReusableCeoIntelligenceDocument({
  ...base,
  id: 'report-old',
  content: JSON.stringify({ report_type: 'property_partners_ceo_intelligence', source_snapshot_id: oldSnapshot }),
}, currentSnapshot), false, 'A report from the same period but an older canonical snapshot must not be reused')

assert.equal(isReusableCeoIntelligenceDocument({
  ...base,
  tags: [...base.tags, 'superseded'],
  content: JSON.stringify({ report_type: 'property_partners_ceo_intelligence', source_snapshot_id: currentSnapshot }),
}, currentSnapshot), false)

assert.equal(isReusableCeoIntelligenceDocument({ ...base, content: '{invalid-json' }, currentSnapshot), false)

const routeSource = readFileSync('app/api/management/reports/ceo-intelligence/latest/route.ts', 'utf8')
assert.ok(routeSource.includes("select('id,title,created_at,tags,content')"), 'CEO report candidates must load persisted content for snapshot comparison')
assert.ok(routeSource.includes('isReusableCeoIntelligenceDocument(document, input.sourceSnapshotId)'), 'CEO report route must dedupe by the current immutable source snapshot')

console.log(JSON.stringify({ ok: true, currentSnapshot, oldSnapshot, staleReportReused: false }, null, 2))
