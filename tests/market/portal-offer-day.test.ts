import assert from 'node:assert/strict'
import { test } from 'node:test'
import { portalChileDayKey, portalChileToday, uniqueFirstSeenToday } from '../../lib/portal-offer-day'

test('Chile summer/winter daily boundaries use local time, not UTC day', () => {
  assert.deepEqual(portalChileToday(new Date('2026-10-09T14:00:00Z')), {
    day:'2026-10-09',start:'2026-10-09T03:00:00.000Z',end:'2026-10-10T03:00:00.000Z',
  })
  const winter=portalChileToday(new Date('2026-06-17T14:00:00Z'))
  assert.equal(winter.start,'2026-06-17T04:00:00.000Z')
  assert.equal(winter.end,'2026-06-18T04:00:00.000Z')
  assert.equal(portalChileDayKey(new Date('2026-10-09T02:59:59Z')),'2026-10-08')
  assert.equal(portalChileDayKey(new Date('2026-10-09T03:00:00Z')),'2026-10-09')
})
test('updated preexisting announcements are not counted as new', () => {
  const rows=[
    {source_listing_id:'new1',created_at:'2026-10-09T10:30:00Z'},
    {source_listing_id:'old',created_at:'2026-10-09T10:30:00Z'},
    {source_listing_id:'new1',created_at:'2026-10-09T10:31:00Z'},
    {source_listing_id:'new2',created_at:'2026-10-09T10:32:00Z'},
  ]
  const result=uniqueFirstSeenToday(rows,new Set(['old']))
  assert.equal(result.size,2)
  assert.equal(result.get('new1'),'2026-10-09T10:30:00Z')
  assert.equal(result.has('old'),false)
})
