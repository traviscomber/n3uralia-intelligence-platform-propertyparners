import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildMarketOpportunitySignals } from '../lib/market-opportunity-intelligence'

test('market opportunity pulse exposes only explicit observable evidence', () => {
  const result = buildMarketOpportunitySignals({
    priceUf: 9000,
    historicalMaxPriceUf: 10000,
    daysObserved: 125,
    priceUfM2: 90,
    neighborhoodMedianUfM2: 110,
    observationCount: 4,
  })
  assert.ok(result.signals.some((signal) => signal.type === 'price_reduction'))
  assert.ok(result.signals.some((signal) => signal.type === 'long_exposure'))
  assert.ok(result.signals.some((signal) => signal.type === 'below_neighborhood_median'))
  assert.ok(result.signals.some((signal) => signal.type === 'repeated_observation'))
})

test('market opportunity pulse does not invent signals without evidence', () => {
  const result = buildMarketOpportunitySignals({
    priceUf: 10000,
    historicalMaxPriceUf: 10000,
    daysObserved: 5,
    priceUfM2: null,
    neighborhoodMedianUfM2: null,
    observationCount: 1,
  })
  assert.equal(result.signals.length, 0)
  assert.equal(result.priceReductionFromMaxPct, 0)
  assert.equal(result.relativeToNeighborhoodMedianPct, null)
})
