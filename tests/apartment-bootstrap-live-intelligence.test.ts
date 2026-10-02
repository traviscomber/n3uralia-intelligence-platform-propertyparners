import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'

test('apartment bootstrap stays bounded while increasing throughput', () => {
  const route = readFileSync('app/api/cron/market-refresh/route.ts', 'utf8')
  const vercel = readFileSync('vercel.json', 'utf8')

  assert.match(route, /const chunkSize = brightDataOnly \? 24 : 18/)
  assert.match(route, /queue\.slice\(0, chunkSize\)/)
  assert.match(route, /concurrency: 8/)
  assert.match(route, /requestTimeoutMs: 35_000/)
  assert.match(route, /maxAttempts: 1/)
  assert.match(vercel, /market-apartment-bootstrap"[\s\S]*"\*\/5 \* \* \* \*"/)
})

test('live apartment baseline is current and territory-neutral', () => {
  const sql = readFileSync('supabase/migrations/20261002205500_market_apartment_live_baseline.sql', 'utf8')
  const page = readFileSync('app/dashboard/market/inteligencia/page.tsx', 'utf8')

  assert.match(sql, /portal-inmobiliario-vitacura-portal-apartments/)
  assert.match(sql, /market_current_listings/)
  assert.match(sql, /last 24 months|24 months/i)
  assert.match(sql, /market_cbrs_reference_transactions/)
  assert.doesNotMatch(sql, /market_neighborhoods/)
  assert.match(page, /Mercado actual sin inferir barrio/)
  assert.match(page, /no se interpreta esta muestra como el universo completo/)
})
