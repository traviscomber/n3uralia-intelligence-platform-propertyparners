import test from 'node:test'
import assert from 'node:assert/strict'
import { portalListingMatchesVitacuraScope } from '../../lib/market-source-import'

test('accepts explicit Vitacura evidence', () => {
  assert.deepEqual(
    portalListingMatchesVitacuraScope({
      address: 'Luis Carrera 2400, Vitacura, Región Metropolitana',
      normalized_address: 'luis carrera 2400, vitacura, region metropolitana',
      title: 'Departamento Club de Polo',
    }),
    { accepted: true, reason: 'vitacura_explicit' },
  )
})

test('rejects adjacent communes leaked by Portal search', () => {
  for (const address of [
    'Av. Las Condes 7960, Las Condes, RM (Metropolitana)',
    'Av. Hernando de Aguirre 394, Providencia, RM (Metropolitana)',
  ]) {
    assert.deepEqual(
      portalListingMatchesVitacuraScope({
        address,
        normalized_address: address.toLowerCase(),
        title: 'Departamento en venta',
      }),
      { accepted: false, reason: 'missing_vitacura_evidence' },
    )
  }
})

test('fails closed when commune evidence is missing', () => {
  assert.equal(
    portalListingMatchesVitacuraScope({
      address: 'Nueva Costanera 1234',
      normalized_address: 'nueva costanera 1234',
      title: 'Departamento en venta',
    }).accepted,
    false,
  )
})
