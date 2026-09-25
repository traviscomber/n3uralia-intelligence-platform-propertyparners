import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getCronAuthorizationFailure, advanceSchedule } from '../lib/management-report-schedule'

test('contractual reporting crons are registered and separated', () => {
  const vercel = JSON.parse(readFileSync('vercel.json','utf8')) as { crons?: Array<{path:string;schedule:string}> }
  const crons = new Map((vercel.crons ?? []).map((item)=>[item.path,item.schedule]))
  assert.equal(crons.get('/api/cron/management-monthly'),'0 9 1 * *')
  assert.equal(crons.get('/api/cron/management-delivery'),'0 * * * *')
  assert.notEqual(crons.get('/api/cron/management-monthly'),crons.get('/api/cron/management-delivery'))
})

test('reporting cron fails closed without the configured secret', () => {
  assert.equal(getCronAuthorizationFailure(null,undefined),'missing_secret')
  assert.equal(getCronAuthorizationFailure(null,'secret'),'missing_authorization')
  assert.equal(getCronAuthorizationFailure('Bearer wrong','secret'),'invalid_authorization')
  assert.equal(getCronAuthorizationFailure('Bearer secret','secret'),null)
})

test('monthly schedule advances deterministically into the future', () => {
  const now = new Date('2026-09-24T12:00:00.000Z')
  const next = advanceSchedule('2026-09-01T09:00:00.000Z','monthly',now)
  assert.equal(next,'2026-10-01T09:00:00.000Z')
})
