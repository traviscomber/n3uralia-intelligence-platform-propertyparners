import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { nextOverduePortalDataset, withinPortalInventoryWindow } from '../../lib/portal-inventory-scheduler'
test('08 Chile works with UTC-3 and UTC-4 without twice firing',()=>{
 assert.equal(withinPortalInventoryWindow(new Date('2026-10-09T11:00:00Z')),true)
 assert.equal(withinPortalInventoryWindow(new Date('2026-10-09T12:00:00Z')),false)
 assert.equal(withinPortalInventoryWindow(new Date('2026-06-17T12:00:00Z')),true)
 assert.equal(withinPortalInventoryWindow(new Date('2026-06-17T11:00:00Z')),false)
})
test('only one stale dataset per day and retry until complete',()=>{
 const now=new Date('2026-10-09T11:00:00Z')
 const stale={portal_houses:'2026-10-02T20:49:35Z',portal_apartments:'2026-10-02T21:08:21Z'}
 assert.equal(nextOverduePortalDataset(now,stale),'portal_houses')
 assert.equal(nextOverduePortalDataset(now,{...stale,portal_houses:now.toISOString()}),'portal_apartments')
 assert.equal(nextOverduePortalDataset(now,{portal_houses:'2026-10-08T20:00:00Z',portal_apartments:'2026-10-08T20:00:00Z'}),null)
 assert.equal(nextOverduePortalDataset(now,{portal_houses:'2026-10-08T20:00:00Z',portal_apartments:null}),'portal_apartments')
})
test('scheduled reconciliation and daily retry declarations are in Vercel',()=>{
 const v=JSON.parse(readFileSync('vercel.json','utf8'))
 assert.equal(v.crons.find((x:{path:string})=>x.path==='/api/cron/market-refresh').schedule,'0 11,12 * * *')
 assert.equal(v.crons.find((x:{path:string})=>x.path==='/api/cron/market-delta').schedule,'30,45 10,11 * * *')
 const provider=readFileSync('lib/brightdata-portal-collector.ts','utf8')
 assert.match(provider,/Math\.min\(Math\.max\(options\.maxPages \?\? 1, 1\), 80\)/)
})
