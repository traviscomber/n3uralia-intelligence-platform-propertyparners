import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('landing stays a territorial portal entry and does not mix product views', () => {
  const page = readFileSync('app/page.tsx', 'utf8')
  const territory = readFileSync('lib/vitacura-public-territory.ts', 'utf8')

  assert.doesNotMatch(page, /PublicValuationEstimator/)
  assert.match(page, /VitacuraTerritoryLanding/)
  assert.match(page, /href="\/auth\/login"/)

  assert.doesNotMatch(page, /\/dashboard\/market/)
  assert.doesNotMatch(page, /\/dashboard\/properties/)
  assert.doesNotMatch(page, /\/dashboard\/valuations/)
  assert.doesNotMatch(page, /Acceso rápido/)

  assert.match(page, /Mercado no se mezcla con control ejecutivo ni con Property 360/)
  assert.match(territory, /Public-safe static projection/)
  assert.doesNotMatch(territory, /partners:/)
  assert.doesNotMatch(territory, /assigned_to/)
  assert.doesNotMatch(territory, /price_uf/)
})
