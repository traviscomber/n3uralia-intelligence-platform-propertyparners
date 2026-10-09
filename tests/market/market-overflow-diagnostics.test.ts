import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

test('legacy GitHub Chrome Portal capture is manual, not a redundant push trigger', () => {
  const yaml = readFileSync('.github/workflows/portal-daily-snapshot.yml','utf8')
  assert.match(yaml,/workflow_dispatch:/)
  assert.doesNotMatch(yaml,/\n\s+push:\s*\n/)
  assert.match(yaml,/Production updates use Bright Data/)
})

test('overflow telemetry is opt-in and restricted to an authenticated Mercado layout', () => {
  const code = readFileSync('components/market/market-overflow-probe.tsx','utf8')
  const layout = readFileSync('app/dashboard/market/layout.tsx','utf8')
  assert.match(code,/new URLSearchParams\(window\.location\.search\)\.has\('_market_diag'\)/)
  assert.match(code,/document\.documentElement\.clientWidth/)
  assert.match(code,/getBoundingClientRect/)
  assert.match(layout,/<MarketOverflowProbe \/>/)
})
