import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'

test('Pedro Pablo intelligence composes explicit memory and verified operational outcomes separately', () => {
  const route=readFileSync('app/api/pedro-pablo/intelligence/route.ts','utf8')
  assert.match(route,/\/api\/pedro-pablo\/memory/)
  assert.match(route,/\/api\/pedro-pablo\/operational-memory/)
  assert.match(route,/operationalMemoryContext/)
  assert.match(route,/verified_operational_outcomes/)
  assert.match(route,/no autonomous canonical rewrite/)
})

test('operational memory remains read-only and outcome-backed', () => {
  const route=readFileSync('app/api/pedro-pablo/operational-memory/route.ts','utf8')
  assert.match(route,/verified-task-history-only/)
  assert.match(route,/outcomeRecorded/)
  assert.match(route,/learningClaim: 'none'/)
  assert.match(route,/writesPerformed: 0/)
})
