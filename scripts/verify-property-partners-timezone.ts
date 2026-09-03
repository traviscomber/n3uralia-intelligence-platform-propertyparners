import assert from 'node:assert/strict'
import {
  PROPERTY_PARTNERS_TIME_ZONE,
  formatPropertyPartnersDateTime,
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

console.log('Property Partners timezone verification passed.')
