import assert from 'node:assert/strict'
import { test } from 'node:test'
import { comparisonPeriod, verifiedChange } from '../lib/executive-dashboard-comparisons'

test('calendar comparisons require the exact preceding month and year', () => {
  assert.equal(comparisonPeriod('2026-01', 1), '2025-12')
  assert.equal(comparisonPeriod('2026-09', 12), '2025-09')
  const available = new Map([['2026-07', { value: 8, formulaVersion: 1 }]])
  assert.equal(verifiedChange({ value: 12, formulaVersion: 1 }, available.get(comparisonPeriod('2026-09', 1)!) ?? null), null)
})

test('verified comparisons reject changed formulas and unknown baselines', () => {
  assert.equal(verifiedChange({ value: 12, formulaVersion: 2 }, { value: 10, formulaVersion: 1 }), null)
  assert.equal(verifiedChange({ value: 12, formulaVersion: 1 }, { value: 0, formulaVersion: 1 }), null)
  assert.ok(Math.abs(verifiedChange({ value: 12, formulaVersion: 1 }, { value: 10, formulaVersion: 1 })! - 0.2) < 1e-10)
})
