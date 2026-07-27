#!/usr/bin/env node

import assert from 'node:assert/strict'
import { rankEvidence } from '../lib/evidence-ranking'
import type { IntelligenceEvidence } from '../lib/n3uralia-intelligence-engine'

function evidence(overrides: Partial<IntelligenceEvidence> & Pick<IntelligenceEvidence, 'id'>): IntelligenceEvidence {
  return {
    id: overrides.id,
    domain: overrides.domain ?? 'crm',
    sourceClass: overrides.sourceClass ?? 'client_evidence',
    label: overrides.label ?? overrides.id,
    value: overrides.value ?? 1,
    period: overrides.period ?? '2026-01/2026-06',
    source: overrides.source ?? 'Fuente verificable',
    methodology: overrides.methodology ?? 'Metodología declarada',
  }
}

const tests: Array<{ name: string; run: () => void }> = [
  {
    name: 'does not mutate the original evidence array',
    run: () => {
      const input = [evidence({ id: 'a' }), evidence({ id: 'b', domain: 'documents' })]
      const originalIds = input.map((item) => item.id)

      rankEvidence({ question: 'ventas CRM', evidence: input, role: 'director' })

      assert.deepEqual(input.map((item) => item.id), originalIds)
    },
  },
  {
    name: 'returns every authorized evidence item exactly once',
    run: () => {
      const input = [evidence({ id: 'a' }), evidence({ id: 'b' }), evidence({ id: 'c' })]
      const ranked = rankEvidence({ question: 'ventas', evidence: input, role: 'ceo' })

      assert.equal(ranked.length, input.length)
      assert.deepEqual(new Set(ranked.map((item) => item.evidence.id)), new Set(input.map((item) => item.id)))
    },
  },
  {
    name: 'prioritizes direct question matches',
    run: () => {
      const ranked = rankEvidence({
        question: 'cumplimiento ventas',
        role: 'ceo',
        evidence: [
          evidence({ id: 'unrelated', label: 'Documentos disponibles', domain: 'documents' }),
          evidence({ id: 'matched', label: 'Cumplimiento acumulado de ventas', domain: 'executive' }),
        ],
      })

      assert.equal(ranked[0]?.evidence.id, 'matched')
      assert.ok(ranked[0]?.reasons.includes('question-match'))
    },
  },
  {
    name: 'uses role-domain weighting without bypassing access control',
    run: () => {
      const ranked = rankEvidence({
        question: '',
        role: 'partner',
        evidence: [
          evidence({ id: 'documents', domain: 'documents' }),
          evidence({ id: 'crm', domain: 'crm' }),
        ],
      })

      assert.equal(ranked[0]?.evidence.id, 'crm')
      assert.equal(ranked.length, 2)
    },
  },
  {
    name: 'prefers client evidence over inference when other factors match',
    run: () => {
      const ranked = rankEvidence({
        question: '',
        role: 'director',
        evidence: [
          evidence({ id: 'inference', sourceClass: 'n3uralia_inference' }),
          evidence({ id: 'client', sourceClass: 'client_evidence' }),
        ],
      })

      assert.equal(ranked[0]?.evidence.id, 'client')
    },
  },
  {
    name: 'preserves original order for equal scores',
    run: () => {
      const ranked = rankEvidence({
        question: '',
        role: 'director',
        evidence: [evidence({ id: 'first' }), evidence({ id: 'second' })],
      })

      assert.deepEqual(ranked.map((item) => item.evidence.id), ['first', 'second'])
    },
  },
  {
    name: 'keeps scores inside the documented zero-to-one range',
    run: () => {
      const ranked = rankEvidence({
        question: 'ventas acumuladas crm fuente verificable metodologia declarada 2026',
        role: 'ceo',
        evidence: [evidence({ id: 'full-match', label: 'Ventas acumuladas CRM' })],
      })

      assert.ok(ranked[0]!.score >= 0)
      assert.ok(ranked[0]!.score <= 1)
    },
  },
]

let passed = 0
for (const test of tests) {
  try {
    test.run()
    passed += 1
    console.log(`✓ ${test.name}`)
  } catch (error) {
    console.error(`✗ ${test.name}`)
    throw error
  }
}

console.log(`\n${passed}/${tests.length} evidence ranking tests passed.`)
