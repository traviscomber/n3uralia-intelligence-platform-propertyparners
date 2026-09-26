import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'

test('bulk territory assignment stores barrio to stable group atomically and service-role only', () => {
  const sql = readFileSync('supabase/migrations/20260926173000_property_territory_groups.sql','utf8')
  assert.match(sql,/assign_property_neighborhood_groups_bulk_v1/i)
  assert.match(sql,/security invoker/i)
  assert.match(sql,/set search_path=''/i)
  assert.match(sql,/property_territory_group_neighborhoods/i)
  assert.match(sql,/DUPLICATE_NEIGHBORHOOD_ASSIGNMENT/i)
  assert.match(sql,/TERRITORY_GROUP_PRIMARY_DIRECTOR_MISSING/i)
  assert.match(sql,/grant execute on function public\.assign_property_neighborhood_groups_bulk_v1[\s\S]*to service_role/i)
  assert.match(sql,/revoke all on function public\.assign_property_neighborhood_groups_bulk_v1[\s\S]*from public,anon,authenticated/i)
})

test('prospect matrix requires explicit confirmation and posts groupKey instead of directorKey', () => {
  const page = readFileSync('app/dashboard/properties/prospects/page.tsx','utf8')
  const route = readFileSync('app/api/prospects/territory/route.ts','utf8')
  assert.match(page,/Confirmación de matriz territorial/i)
  assert.match(page,/confirmMatrix/i)
  assert.match(page,/groupKey:territoryDraft/i)
  assert.match(page,/Santa María \/ Lo Beltrán \/ Nueva Costanera/i)
  assert.match(route,/groupKey/i)
  assert.doesNotMatch(route,/directorKey/)
  assert.match(route,/assign_property_neighborhood_groups_bulk_v1/i)
})
