import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildCommercialStrategy,
  type EvidenceAssessment,
  type PublicationScenario,
} from '../../lib/valuation-contract'

const scenarios: PublicationScenario[] = [
  {
    upliftPct: 0,
    suggestedPriceUf: 10_000,
    suggestedUfM2: 100,
    varianceVsOfferMaxPct: null,
    varianceVsOfferAveragePct: null,
    varianceUfM2VsOfferMaxPct: null,
    varianceUfM2VsOfferAveragePct: null,
  },
  {
    upliftPct: 5,
    suggestedPriceUf: 10_526.32,
    suggestedUfM2: 105.26,
    varianceVsOfferMaxPct: null,
    varianceVsOfferAveragePct: null,
    varianceUfM2VsOfferMaxPct: null,
    varianceUfM2VsOfferAveragePct: null,
  },
  {
    upliftPct: 10,
    suggestedPriceUf: 11_111.11,
    suggestedUfM2: 111.11,
    varianceVsOfferMaxPct: null,
    varianceVsOfferAveragePct: null,
    varianceUfM2VsOfferMaxPct: null,
    varianceUfM2VsOfferAveragePct: null,
  },
]

function evidence(grade: EvidenceAssessment['grade']): EvidenceAssessment {
  return {
    grade,
    score: grade === 'Alta' ? 90 : grade === 'Media' ? 70 : 45,
    comparableCount: 3,
    cbrsCount: 1,
    offerCount: 2,
    spreadPct: 20,
    traceabilityPct: 100,
    summary: 'evidence',
    risks: [],
  }
}

test('high-confidence evidence recommends a controlled five-percent publication margin', () => {
  const strategy = buildCommercialStrategy(scenarios, evidence('Alta'))

  assert.equal(strategy.posture, 'Defendible')
  assert.equal(strategy.objectivePriceUf, 10_000)
  assert.equal(strategy.recommendedPublicationUf, 10_526.32)
  assert.equal(strategy.aspirationalPublicationUf, 11_111.11)
  assert.equal(strategy.negotiationMarginUf, 526.32)
  assert.equal(strategy.negotiationMarginPct, 5.3)
  assert.match(strategy.ownerNarrative, /10\.526 UF/)
})

test('medium-confidence evidence keeps the margin but explicitly requires monitoring', () => {
  const strategy = buildCommercialStrategy(scenarios, evidence('Media'))

  assert.equal(strategy.posture, 'Cautela')
  assert.equal(strategy.recommendedPublicationUf, 10_526.32)
  assert.match(strategy.rationale, /seguimiento temprano/)
})

test('low-confidence evidence never invents negotiation headroom', () => {
  const strategy = buildCommercialStrategy(scenarios, evidence('Baja'))

  assert.equal(strategy.posture, 'Validar evidencia')
  assert.equal(strategy.recommendedPublicationUf, 10_000)
  assert.equal(strategy.negotiationMarginUf, 0)
  assert.match(strategy.ownerNarrative, /preliminarmente/)
  assert.match(strategy.ownerNarrative, /completar o depurar/)
})

test('commercial strategy requires the three canonical scenarios', () => {
  assert.throws(
    () => buildCommercialStrategy(scenarios.slice(0, 2), evidence('Alta')),
    /0%, 5% y 10%/,
  )
})
