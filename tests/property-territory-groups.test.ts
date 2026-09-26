import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'

const sql = readFileSync('supabase/migrations/20260926173000_property_territory_groups.sql','utf8')

test('territory ownership is bound to stable groups, not directly to a person', () => {
  assert.match(sql,/create table if not exists public\.property_territory_groups/i)
  assert.match(sql,/create table if not exists public\.property_territory_group_neighborhoods/i)
  assert.match(sql,/create table if not exists public\.property_territory_group_director_assignments/i)
  assert.match(sql,/group_id uuid not null references public\.property_territory_groups/i)
  assert.match(sql,/neighborhood_id uuid not null references public\.market_neighborhoods/i)
  assert.match(sql,/director_key text not null references public\.property_director_directory/i)
})

test('one neighborhood has one current group and one group has one current primary director', () => {
  assert.match(sql,/one_current_group_idx/i)
  assert.match(sql,/where active and valid_to is null/i)
  assert.match(sql,/one_primary_director_idx/i)
  assert.match(sql,/assignment_role='primary'/i)
})

test('changing a director operates at group scope and can reassign active leads without moving barrios', () => {
  assert.match(sql,/assign_property_territory_group_director_v1/i)
  assert.match(sql,/property_territory_group_neighborhoods gn/i)
  assert.match(sql,/join neighborhood_scope n on n\.neighborhood_id=l\.neighborhood_id/i)
  assert.doesNotMatch(sql,/update public\.property_territory_group_neighborhoods[\s\S]*p_director_key/i)
})

test('current people are seeded independently from future barrio membership', () => {
  assert.match(sql,/\('santa-maria','maria-luz-barbosa'\)/i)
  assert.match(sql,/\('lo-beltran','isabel-steverlynck'\)/i)
  assert.match(sql,/\('nueva-costanera','claudia-stark'\)/i)
  assert.doesNotMatch(sql,/insert into public\.property_territory_group_neighborhoods/i)
})
