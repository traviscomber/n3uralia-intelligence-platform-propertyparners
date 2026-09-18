import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const expertise = fs.readFileSync('lib/pedro-pablo/vitacura-expertise.ts', 'utf8')
const router = fs.readFileSync('lib/pedro-pablo/agentic-router.ts', 'utf8')
const support = fs.readFileSync('app/api/pedro-pablo/decision-support/route.ts', 'utf8')

test('Senior Real Estate Vitacura uses governed decision frame', () => {
  for (const token of [
    'canonical_fact',
    'professional_interpretation',
    'hypothesis_to_review',
    'evidence_for',
    'evidence_against',
    'missing_evidence',
    'next_best_action',
    'human_checkpoint',
  ]) assert.match(expertise, new RegExp(token))
})

test('expertise covers pricing, marketability and due diligence without replacing valuation', () => {
  assert.match(expertise, /pricing_strategy/)
  assert.match(expertise, /marketability/)
  assert.match(expertise, /due_diligence/)
  assert.match(expertise, /No recomendar rebajas automáticas/)
  assert.match(expertise, /No emitir opinión legal/)
})

test('senior expertise is attached invisibly to decision support', () => {
  assert.match(support, /invisibleSpecialist: true/)
  assert.match(support, /expertiseCardsForPrompt\(prompt\)/)
  assert.match(support, /writesPerformed: 0/)
})

test('senior commercial questions route to FullAgentic synthesis', () => {
  assert.match(router, /precio de salida/)
  assert.match(router, /liquidez/)
  assert.match(router, /microzona/)
  assert.match(router, /due diligence/)
})


test('Pedro Pablo alignment contract locks V1 to Vitacura and approved source semantics', () => {
  assert.match(expertise, /geographicScope: 'Vitacura only'/)
  assert.match(expertise, /Portal Inmobiliario/)
  assert.match(expertise, /CBRS Vitacura/)
  assert.match(expertise, /KML de barrios entregado/)
  assert.match(expertise, /nunca ventas confirmadas/)
  assert.match(expertise, /requiere control de identidad y comparabilidad/)
  assert.match(expertise, /metodología contractual de valorización tiene precedencia/)
  assert.match(expertise, /No crear KPI, rankings, umbrales, absorción, velocidad de venta/)
})

test('out-of-scope communes are blocked from canonical comparison', () => {
  assert.match(expertise, /las condes/)
  assert.match(expertise, /lo barnechea/)
  assert.match(support, /detectOutOfScopeMarket\(prompt\)/)
  assert.match(support, /No incorporaré \$\{scopeConflict\.requestedCommune\} como universo canónico/)
  assert.match(support, /client-response-pedro-pablo-2026-08-12/)
})

test('decision support exposes the Pedro Pablo alignment contract to the senior layer', () => {
  assert.match(support, /alignmentContract: PEDRO_PABLO_ALIGNMENT_CONTRACT/)
  assert.match(support, /scopeConflict,/)
})


test('senior expertise changes the visible answer, not only metadata', () => {
  assert.match(support, /function seniorResponse\(/)
  assert.match(support, /Lectura senior inmobiliaria · Vitacura/)
  assert.match(support, /response = seniorResponse\(response, prompt, seniorExpertise\)/)
  assert.match(support, /Portal representa oferta y CBRS evidencia transaccional/)
})

test('every recognized senior topic is forced through FullAgentic', () => {
  assert.match(support, /seniorExpertise\.length > 0/)
  assert.match(support, /route: 'full-agentic'/)
  assert.match(support, /La consulta activa criterio inmobiliario senior/)
})
