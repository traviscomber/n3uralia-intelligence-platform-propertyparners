import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  MIN_PROPERTY360_COMPARABLES,
  hasDecisionGradeComparableSample,
  isVitacuraComparableAddress,
} from '../lib/property360-comparables'

test('Property360 requires three valid comparables for decision metrics', () => {
  assert.equal(MIN_PROPERTY360_COMPARABLES, 3)
  assert.equal(hasDecisionGradeComparableSample(0), false)
  assert.equal(hasDecisionGradeComparableSample(2), false)
  assert.equal(hasDecisionGradeComparableSample(3), true)
  assert.equal(hasDecisionGradeComparableSample(5), true)
})

test('Property360 rejects obvious cross-commune comparable addresses', () => {
  assert.equal(isVitacuraComparableAddress('Las Hualtatas 1234, Vitacura'), true)
  assert.equal(isVitacuraComparableAddress('Estadio Manquehue, Vitacura'), true)
  assert.equal(isVitacuraComparableAddress('Av. Jose Rabat 9335, Colina'), false)
  assert.equal(isVitacuraComparableAddress('Los Trapenses, Lo Barnechea'), false)
  assert.equal(isVitacuraComparableAddress('Pueblo Nuevo, Temuco'), false)
})
