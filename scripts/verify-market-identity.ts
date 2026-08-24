import assert from 'node:assert/strict'
import { buildCanonicalPropertyKey, normalizeMarketText, normalizeRol, scorePropertyMatch } from '../lib/market-identity-engine'

assert.equal(normalizeMarketText('Av. Nueva Costanera 4.021, Depto 12'), 'av nueva costanera 4 021 dpto 12')
assert.equal(normalizeRol(' 1234-56 '), '1234-56')

const portal = {
  source: 'portal' as const,
  sourceId: 'MLC-1',
  propertyType: 'Departamento',
  address: 'Avenida Nueva Costanera 4021 departamento 12',
  rol: '1234-56',
  latitude: -33.40001,
  longitude: -70.60001,
  neighborhood: 'Nueva Costanera',
  usefulAreaM2: 120,
}

const cbrs = {
  source: 'cbrs' as const,
  sourceId: 'CBRS-1',
  propertyType: 'Departamento',
  address: 'Av Nueva Costanera 4021 dpto 12',
  rol: '1234-56',
  latitude: -33.40002,
  longitude: -70.60002,
  neighborhood: 'Nueva Costanera',
  usefulAreaM2: 118,
}

const match = scorePropertyMatch(portal, cbrs)
assert.equal(match.status, 'candidate_high')
assert.ok(match.score >= 0.8)
assert.ok(match.evidence.some((item) => item.field === 'neighborhood' && item.matched))
assert.equal(buildCanonicalPropertyKey(portal), buildCanonicalPropertyKey(cbrs))

const neighborhoodMismatch = scorePropertyMatch(portal, { ...cbrs, neighborhood: 'Santa María' })
assert.ok(neighborhoodMismatch.evidence.some((item) => item.field === 'neighborhood' && !item.matched))
assert.notEqual(neighborhoodMismatch.status, 'candidate_high')

const contradiction = scorePropertyMatch(portal, { ...cbrs, rol: '9999-99' })
assert.equal(contradiction.status, 'rejected')
assert.ok(contradiction.contradictions.length > 0)

console.log(JSON.stringify({ status: 'ok', highMatchScore: match.score, neighborhoodMismatchStatus: neighborhoodMismatch.status, contradictionStatus: contradiction.status }, null, 2))
