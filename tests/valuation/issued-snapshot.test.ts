import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const comparableRoute = readFileSync('app/api/valuations/[id]/comparables/route.ts', 'utf8')
const migration = readFileSync('supabase/migrations/20260816_freeze_issued_valuation_snapshots.sql', 'utf8')

test('issued valuation reads the exact issued version snapshot and never falls back to live evidence', () => {
  assert.match(comparableRoute, /valuationCase\.status === 'issued'/)
  assert.match(comparableRoute, /from\('valuation_case_versions'\)/)
  assert.match(comparableRoute, /\.eq\('status', 'issued'\)/)
  assert.match(comparableRoute, /\.eq\('version_number', valuationCase\.version_number\)/)
  assert.match(comparableRoute, /ISSUED_SNAPSHOT_MISSING/)
  assert.match(comparableRoute, /ISSUED_SNAPSHOT_INVALID/)
  assert.match(comparableRoute, /valuationCase: frozenCase/)
  assert.match(comparableRoute, /comparables: frozenComparables/)
  assert.match(comparableRoute, /decisions: frozenDecisions/)
})

test('valuation version migration freezes complete traceable evidence with integrity hash', () => {
  assert.match(migration, /snapshotSchemaVersion', 'valuation-case-version-v2'/)
  assert.match(migration, /'valuationCase', case_payload/)
  assert.match(migration, /'comparables', coalesce\(comparable_payload/)
  assert.match(migration, /'decisionHistory', decision_payload/)
  assert.match(migration, /'actors', actor_payload/)
  assert.match(migration, /snapshotSha256/)
  assert.match(migration, /extensions\.digest\(core_snapshot::text, 'sha256'\)/)
  assert.match(migration, /protect_valuation_case_version_mutation/)
  assert.match(migration, /before update or delete on public\.valuation_case_versions/)
})

test('initial draft snapshot records case creation instead of a rejection transition', () => {
  assert.match(migration, /when new\.status = 'draft' and new\.snapshot \? 'fromStatus' then 'rejected'/)
  assert.match(migration, /when new\.status = 'draft' then 'case_created'/)
})
