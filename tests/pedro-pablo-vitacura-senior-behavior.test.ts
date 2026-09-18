import test from 'node:test'
import assert from 'node:assert/strict'
import { detectOutOfScopeMarket, expertiseCardsForPrompt } from '../lib/pedro-pablo/vitacura-expertise'
import { routePedroPabloPrompt } from '../lib/pedro-pablo/agentic-router'

const topics = (prompt: string) => expertiseCardsForPrompt(prompt).map((card) => card.topic)

test('pricing question activates valuation + pricing expertise', () => {
  const active = topics('¿Qué precio de salida recomiendas para una casa en Lo Curro?')
  assert.ok(active.includes('commercial_valuation'))
  assert.ok(active.includes('pricing_strategy'))
  assert.equal(routePedroPabloPrompt('¿Qué precio de salida recomiendas para una casa en Lo Curro?').route, 'full-agentic')
})

test('marketability question activates senior liquidity expertise', () => {
  const active = topics('Analiza la marketability y liquidez de esta propiedad')
  assert.ok(active.includes('marketability'))
})

test('commercial due diligence question activates evidence review', () => {
  const active = topics('¿Qué falta revisar de recepción final, superficie y regularización?')
  assert.ok(active.includes('due_diligence'))
})

test('Las Condes is explicitly outside the approved canonical universe', () => {
  const conflict = detectOutOfScopeMarket('Compárame esta casa de Vitacura con Las Condes')
  assert.equal(conflict?.requestedCommune, 'las condes')
  assert.equal(conflict?.allowedCommune, 'Vitacura')
})

test('Vitacura-only prompts do not trigger a geographic conflict', () => {
  assert.equal(detectOutOfScopeMarket('Compara esta casa de Lo Curro con Vitacura'), null)
})
