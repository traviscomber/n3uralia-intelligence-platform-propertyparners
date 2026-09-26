import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('Property360 restores the existing next follow-up into the form', () => {
  const component = readFileSync('components/market/property360-prospect-workflow.tsx', 'utf8')
  assert.match(component, /setNextFollowUpAt\(payload\.lead\?\.next_follow_up_at/)
  assert.match(component, /toISOString\(\)\.slice\(0,16\)/)
})

test('follow-up API preserves schedule when omitted and clears it for terminal states', () => {
  const route = readFileSync('app/api/prospects/property/[id]/route.ts', 'utf8')
  assert.match(route, /Object\.prototype\.hasOwnProperty\.call\(body, 'nextFollowUpAt'\)/)
  assert.match(route, /: lead\.next_follow_up_at/)
  assert.match(route, /\['won','lost','archived'\]\.includes\(nextStatus\)/)
  assert.match(route, /next_follow_up_at: nextFollowUpAt/)
})
