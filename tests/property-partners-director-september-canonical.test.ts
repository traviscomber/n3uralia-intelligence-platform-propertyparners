import assert from 'node:assert/strict'
import {test} from 'node:test'
import {mapVerifiedDirectorOffice} from '../lib/property-partners-director-canonical-mapper'
import type {AudienceSnapshot} from '../lib/property-partners-audience-snapshot'

const offices=['Santa María','Nueva Costanera','Lo Beltrán'] as const
const values=[
 {name:offices[0],sales:0,sales_uf:0,active:500,stock:143,classified:300,stale90:96,realized:48,scheduled:73,captures:6,suspended:6,activeA:34,stale15A:1,previous:{leads:532,stock:134,visitsScheduled:94,visitsRealized:65}},
 {name:offices[1],sales:4,sales_uf:48360,active:654,stock:94,classified:370,stale90:390,realized:46,scheduled:86,captures:7,suspended:13,activeA:39,stale15A:9,previous:{leads:373,stock:95,visitsScheduled:118,visitsRealized:62}},
 {name:offices[2],sales:1,sales_uf:1200,active:286,stock:101,classified:176,stale90:15,realized:46,scheduled:79,captures:14,suspended:5,activeA:21,stale15A:11,previous:{leads:323,stock:95,visitsScheduled:112,visitsRealized:62}},
]
const snapshot:AudienceSnapshot & {sourceSnapshotId:string}={
 sourceSnapshotId:'pp-2026-09-1ceb7a8b4eb1',
 period:{start:'2026-09-01',end:'2026-09-30'},
 evidence:[{id:'canonical',status:'verified',source:'approved.xlsx#sha256='+ 'a'.repeat(64)}],
 metrics:values.flatMap(row=>Object.entries(row).filter(([k])=>k!=='name'&&k!=='previous').map(([key,value])=>({
  id:row.name+'_'+key,label:key,value:value as number,status:'verified',evidenceRefs:['canonical']
 }))),
}
test('approved September director office figures and verified August changes map without aggregating office leads',()=>{
 for(const expected of values){
  const actual=mapVerifiedDirectorOffice(snapshot,expected.name,expected.previous)
  assert.equal(actual.uf,expected.sales_uf)
  assert.equal(actual.leads,expected.active)
  assert.equal(actual.gradeAStale15,expected.stale15A)
  assert.equal(actual.visitsScheduled-actual.previous.visitsScheduled,expected.scheduled-expected.previous.visitsScheduled)
 }
 assert.equal(values.reduce((sum,row)=>sum+row.active,0),1440)
})
test('missing verified August comparison or canonical field fails closed',()=>{
 assert.throws(()=>mapVerifiedDirectorOffice(snapshot,'Santa María',{...values[0].previous,leads:NaN}),/DIRECTOR_COMPARISON_MISSING/)
 const damaged={...snapshot,metrics:snapshot.metrics.filter(m=>m.id!=='Santa María_captures')}
 assert.throws(()=>mapVerifiedDirectorOffice(damaged,'Santa María',values[0].previous),/DIRECTOR_CANONICAL_METRIC_MISSING:captures/)
})
