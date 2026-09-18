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
