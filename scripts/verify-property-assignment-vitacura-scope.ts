import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const page = readFileSync('app/dashboard/properties/admin/page.tsx', 'utf8')

assert.match(page, /requireAnyPageCapability\(\['properties\.global\.assign', 'properties\.office\.assign'\]\)/)
assert.match(page, /\.eq\('property_type', 'Casa'\)/)
assert.match(page, /\.ilike\('normalized_address', '%Vitacura%'\)/)
assert.match(page, /select\('id,property_type,normalized_address'\)/)
assert.match(page, /isExplicitVitacuraAddress\(property\.normalized_address\)/)
assert.match(page, /sólo permite asignar casas con evidencia territorial explícita de Vitacura/)
assert.match(page, /formatPropertyPartnersDateTime/)
assert.match(page, /Casas de Vitacura disponibles para asignación/)

assert.doesNotMatch(
  page,
  /from\('market_properties'\)\.select\([^\n]+\)\.eq\('property_type', 'Casa'\)\.order/,
  'Assignment candidates must not expose every house regardless of Vitacura evidence.',
)

console.log('Property assignment Vitacura scope verification passed.')
