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

test('the canonical operational groups are Santa Maria, Lo Beltran and Nueva Costanera', () => {
  assert.match(sql,/\('santa-maria','Santa María'/i)
  assert.match(sql,/\('lo-beltran','Lo Beltrán'/i)
  assert.match(sql,/\('nueva-costanera','Nueva Costanera'/i)
})

test('current people are derived from the directory office and ranked independently from barrio membership', () => {
  assert.match(sql,/join public\.property_director_directory d/i)
  assert.match(sql,/unaccent\(btrim\(d\.office_name\)\)/i)
  assert.match(sql,/row_number\(\) over/i)
  assert.match(sql,/case when lower\(coalesce\(d\.role,''\)\)='director' then 0 else 1 end/i)
  assert.doesNotMatch(sql,/insert into public\.property_territory_group_neighborhoods/i)
})

test('management source data is reorganized by stable territory group without rewriting source records', () => {
  assert.match(sql,/create or replace view public\.management_source_records_territory_v1/i)
  assert.match(sql,/from public\.management_source_records r/i)
  assert.match(sql,/territory_group_key/i)
  assert.match(sql,/territory_group_name/i)
})

test('one neighborhood has one current group and one group has one current primary routing owner', () => {
  assert.match(sql,/one_current_group_idx/i)
  assert.match(sql,/one_primary_director_idx/i)
  assert.match(sql,/assignment_role='primary'/i)
})

test('changing the routing owner operates at group scope and can reassign active leads without moving barrios', () => {
  assert.match(sql,/assign_property_territory_group_director_v1/i)
  assert.match(sql,/property_territory_group_neighborhoods gn/i)
  assert.match(sql,/join neighborhood_scope n on n\.neighborhood_id=l\.neighborhood_id/i)
  assert.doesNotMatch(sql,/update public\.property_territory_group_neighborhoods[\s\S]*p_director_key/i)
})
