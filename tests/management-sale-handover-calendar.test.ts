import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'

const migration=readFileSync('supabase/migrations/20260926193000_management_sale_handover_calendar.sql','utf8')
const api=readFileSync('app/api/management/sales-calendar/route.ts','utf8')
const ui=readFileSync('components/management/sale-handover-calendar.tsx','utf8')
const page=readFileSync('app/dashboard/control/calendar/page.tsx','utf8')

test('sale handover model creates an explicit case and eight milestones',()=>{
  assert.match(migration,/create table if not exists public\.management_sale_cases/i)
  assert.match(migration,/sale_case_id uuid references public\.management_sale_cases/i)
  assert.match(migration,/create_management_sale_case_v1/i)
  for(const code of ['document_pack','legal_instruction','title_study','deed_draft','deed_signing','registration','pre_handover','handover']){
    assert.match(migration,new RegExp("'"+code+"'"))
  }
  assert.match(migration,/interval '4 months'/i)
  assert.match(migration,/p_sale_date \+ 4/)
  assert.match(migration,/p_sale_date \+ 7/)
})

test('sale handover case is server mediated and does not expose the new table to authenticated clients',()=>{
  assert.match(migration,/revoke all on table public\.management_sale_cases from public,anon,authenticated/i)
  assert.match(migration,/grant all on table public\.management_sale_cases to service_role/i)
  assert.match(api,/createServiceClient/)
  assert.match(api,/requireAnyCapability\(writeCapabilities\)/)
  assert.match(api,/property_territory_groups/)
})

test('management calendar borrows the operational timeline pattern without changing historical sales evidence',()=>{
  assert.match(ui,/Calendario operacional postventa/)
  assert.match(ui,/Agenda 14 días/)
  assert.match(ui,/Entregas 30 días/)
  assert.match(ui,/horizonte inicial: 4 meses/)
  assert.match(page,/Calendario venta → entrega/)
  assert.doesNotMatch(migration,/update public\.management_source_records/i)
  assert.doesNotMatch(migration,/delete from public\.management_source_records/i)
})
