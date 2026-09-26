import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('landing is an internal territorial entry point without public valuation', () => {
  const page = readFileSync('app/page.tsx', 'utf8')
  const territory = readFileSync('lib/vitacura-public-territory.ts', 'utf8')

  assert.doesNotMatch(page, /PublicValuationEstimator/)
  assert.match(page, /VitacuraTerritoryLanding/)
  assert.match(page, /\/dashboard\/market\/mapa\/oferta/)
  assert.match(page, /\/dashboard\/properties/)
  assert.match(page, /\/dashboard\/valuations/)
  assert.match(territory, /Public-safe static projection/)
  assert.doesNotMatch(territory, /partners:/)
  assert.doesNotMatch(territory, /assigned_to/)
  assert.doesNotMatch(territory, /price_uf/)
})
