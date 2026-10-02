import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'

test('stale apartment reference cannot drive current market signals', () => {
  const page = readFileSync('app/dashboard/market/inteligencia/page.tsx', 'utf8')
  const supply = readFileSync('lib/market-supply-sales-intelligence.ts', 'utf8')

  assert.match(supply, /asOfPortal: row\.as_of_portal/)
  assert.match(page, /function isRecent\(value: string \| null, maxAgeDays = 45\)/)
  assert.match(page, /const apartmentReferenceFresh = isRecent\(apartmentPortalCut\)/)
  assert.match(page, /const apartments = apartmentReferenceFresh \? apartmentReference : \[\]/)
  assert.match(page, /queda excluida de señales, mapa y prioridades actuales/)
})

test('apartment opportunity pulse fails closed on unresolved territory', () => {
  const opportunity = readFileSync('lib/market-opportunity-intelligence.ts', 'utf8')

  assert.match(opportunity, /propertyType !== 'Casa'/)
  assert.match(opportunity, /const neighborhoodId = propertyType === 'Casa' \? rawNeighborhoodId : null/)
  assert.match(opportunity, /Para departamentos se mantiene desactivada hasta resolver el barrio canónico/)
})
