import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isClosedMonthlyPeriod, previousMonthBounds } from '../lib/management-report-schedule'
import { propertyPartnersMonthKey } from '../lib/property-partners-time'

test('monthly close follows Santiago calendar across a UTC month boundary', () => {
  const beforeChileMidnight = new Date('2026-10-01T02:30:00.000Z')
  const afterChileMidnight = new Date('2026-10-01T03:30:00.000Z')

  assert.equal(propertyPartnersMonthKey(beforeChileMidnight), '2026-09')
  assert.deepEqual(previousMonthBounds(beforeChileMidnight), {
    start: '2026-08-01',
    end: '2026-08-31',
  })
  assert.equal(isClosedMonthlyPeriod('2026-09', beforeChileMidnight), false)

  assert.equal(propertyPartnersMonthKey(afterChileMidnight), '2026-10')
  assert.deepEqual(previousMonthBounds(afterChileMidnight), {
    start: '2026-09-01',
    end: '2026-09-30',
  })
  assert.equal(isClosedMonthlyPeriod('2026-09', afterChileMidnight), true)
})

test('Santiago month close handles year rollover without UTC leakage', () => {
  const beforeChileNewYear = new Date('2027-01-01T02:30:00.000Z')
  const afterChileNewYear = new Date('2027-01-01T03:30:00.000Z')

  assert.equal(propertyPartnersMonthKey(beforeChileNewYear), '2026-12')
  assert.deepEqual(previousMonthBounds(beforeChileNewYear), {
    start: '2026-11-01',
    end: '2026-11-30',
  })
  assert.equal(isClosedMonthlyPeriod('2026-12', beforeChileNewYear), false)

  assert.equal(propertyPartnersMonthKey(afterChileNewYear), '2027-01')
  assert.deepEqual(previousMonthBounds(afterChileNewYear), {
    start: '2026-12-01',
    end: '2026-12-31',
  })
  assert.equal(isClosedMonthlyPeriod('2026-12', afterChileNewYear), true)
})
