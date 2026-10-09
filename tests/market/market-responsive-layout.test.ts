import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const marketLayout = readFileSync('app/dashboard/market/layout.tsx','utf8')
const marketCss = readFileSync('app/dashboard/market/market-responsive.css','utf8')
const marketPage = readFileSync('app/dashboard/market/page.tsx','utf8')
const chart = readFileSync('components/market/cbrs-comparison-bars.tsx','utf8')
const offer = readFileSync('app/dashboard/market/oferta/page.tsx','utf8')

test('market module contains horizontal overflow without affecting other dashboards', () => {
  assert.match(marketLayout, /data-testid="market-responsive-shell"/)
  assert.match(marketLayout, /min-w-0 max-w-full overflow-x-clip/)
  assert.match(marketLayout, /print:overflow-visible/)
  assert.doesNotMatch(marketLayout, /overflow-y-hidden|overflow-hidden/)
  assert.match(marketPage, /contentClassName="w-full min-w-0 max-w-\[1250px\]"/)
})
test('market subnavigation wraps at tablet and remains touch accessible on mobile', () => {
  assert.match(marketLayout, /grid-cols-2/)
  assert.match(marketLayout, /min-\[520px\]:flex/)
  assert.match(marketLayout, /min-\[520px\]:flex-wrap/)
  assert.match(marketLayout, /min-h-11 min-w-0/)
  assert.match(marketLayout, /break-words/)
  for (const link of ['/dashboard/market/oferta','/dashboard/market/mapa','/dashboard/market/comparables']) {
    assert.ok(marketLayout.includes(link))
  }
})
test('market charts and listing rows shrink within their available content column', () => {
  assert.match(chart, /className="min-w-0 border-t/)
  assert.match(chart, /minmax\(0,1fr\)/)
  assert.match(marketPage, /xl:grid-cols-2/)
  assert.match(offer, /grid-cols-\[minmax\(0,1fr\)_44px\]/)
})

test('vertical dashboard scroller never exposes a global horizontal scrollbar in Mercado', () => {
  assert.match(marketLayout, /import '\.\/market-responsive\.css'/)
  assert.match(marketCss, /@media screen/)
  assert.match(marketCss, /\.dashboard-shell:has\(\.market-responsive-shell\)/)
  assert.match(marketCss, /\.dashboard-content\s*\{/)
  assert.match(marketCss, /overflow-x:\s*clip/)
  assert.match(marketCss, /max-width:\s*100vw/)
  assert.doesNotMatch(marketCss, /overflow-y:\s*hidden/)
})
