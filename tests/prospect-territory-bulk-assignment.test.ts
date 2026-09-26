import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'

test('bulk territory assignment stays atomic and service-role only', () => {
  const sql = readFileSync('supabase/migrations/20260926150000_bulk_neighborhood_director_assignment.sql','utf8')
  assert.match(sql,/security invoker/i)
  assert.match(sql,/set search_path = ''/i)
  assert.match(sql,/assign_property_neighborhood_director_v1/i)
  assert.match(sql,/DUPLICATE_NEIGHBORHOOD_ASSIGNMENT/i)
  assert.match(sql,/grant execute on function public\.assign_property_neighborhood_directors_bulk_v1[\s\S]*to service_role/i)
  assert.match(sql,/revoke all on function public\.assign_property_neighborhood_directors_bulk_v1[\s\S]*from authenticated/i)
})

test('prospect matrix requires explicit confirmation before save', () => {
  const page = readFileSync('app/dashboard/properties/prospects/page.tsx','utf8')
  assert.match(page,/Confirmación de autoridad territorial/i)
  assert.match(page,/confirmMatrix/i)
  assert.match(page,/\/api\/prospects\/territory/i)
  assert.match(page,/No asigna por ejecutiva/i)
})
