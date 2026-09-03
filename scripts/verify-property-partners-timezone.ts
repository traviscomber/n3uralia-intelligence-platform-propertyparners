import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  PROPERTY_PARTNERS_TIME_ZONE,
  formatPropertyPartnersDateTime,
  propertyPartnersCalendarDayAge,
  propertyPartnersTimeZoneLabel,
} from '../lib/property-partners-time'

assert.equal(PROPERTY_PARTNERS_TIME_ZONE, 'America/Santiago')
assert.equal(propertyPartnersTimeZoneLabel(), 'Hora Chile · America/Santiago')

const winter = formatPropertyPartnersDateTime('2026-09-03T20:22:07.000Z')
assert.match(winter, /16:22/)
assert.doesNotMatch(winter, /20:22/)

const summer = formatPropertyPartnersDateTime('2026-01-15T15:00:00.000Z')
assert.match(summer, /12:00/)
assert.doesNotMatch(summer, /15:00/)

assert.equal(
  propertyPartnersCalendarDayAge('2026-09-03T02:30:00.000Z', '2026-09-03T20:30:00.000Z'),
  1,
  'Crossing midnight in Santiago must count as one business calendar day even when less than 24 hours elapsed.',
)
assert.equal(
  propertyPartnersCalendarDayAge('2026-09-03T12:00:00.000Z', '2026-09-03T20:30:00.000Z'),
  0,
  'Instants on the same Santiago calendar date must remain age zero.',
)

const propertiesPage = readFileSync('app/dashboard/properties/page.tsx', 'utf8')
assert.match(propertiesPage, /requireUserScope\(\)/)
assert.match(propertiesPage, /properties\.global\.assign/)
assert.match(propertiesPage, /properties\.office\.assign/)
assert.match(propertiesPage, /redirect\('\/dashboard\/properties\/admin'\)/)
assert.match(propertiesPage, /propertyPartnersCalendarDayAge\(property\.last_seen_at\)/)
assert.match(propertiesPage, /\.eq\('assigned_to', scope\.profileId\)/)

const marketOperational = readFileSync('lib/market-operational.ts', 'utf8')
assert.match(marketOperational, /propertyPartnersCalendarDayAge\(value\)/)
assert.doesNotMatch(marketOperational, /Date\.now\(\) - observedAt\.getTime\(\)/)

console.log('Property Partners timezone, freshness and portfolio-routing verification passed.')
