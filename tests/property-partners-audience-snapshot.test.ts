import assert from 'node:assert/strict'
import { test } from 'node:test'
import { verifyAudienceSnapshot, verifyAudienceOperations, type AudienceSnapshot } from '../lib/property-partners-audience-snapshot'

const closure = (entity: string, sales: number, uf: number) => [
  {id: entity + '_sales', label:'sales', value:sales, status:'verified', evidenceRefs:['ev_closures']},
  {id: entity + '_sales_uf', label:'sales_uf', value:uf, status:'verified', evidenceRefs:['ev_closures']},
]
function snapshot(): AudienceSnapshot {
  return {
    period: { start: '2026-09-01', end: '2026-09-30' },
    evidence: [{id:'ev_closures',status:'verified',source:'Cierres_septiembre_2026.xlsx#sha256=abcdef'}],
    metrics: [
      ...closure('Property Partners Vitacura',5,49560),
      ...closure('Santa María',0,0),
      ...closure('Nueva Costanera',4,48360),
      ...closure('Lo Beltrán',1,1200),
    ],
  }
}
test('net closures and UF reconcile across offices, preserving the historical signed correction', () => {
  assert.deepEqual(verifyAudienceSnapshot(snapshot()), {
    period:'2026-09',netClosures:5,netUf:49560,officeClosures:5,officeUf:49560,
  })
})
test('UF mismatch prevents release', () => {
  const s=snapshot();s.metrics.find(m=>m.id==='Lo Beltrán_sales_uf')!.value=23200
  assert.throws(()=>verifyAudienceSnapshot(s),/RECONCILIATION_FAILED/)
})
test('missing verified provenance prevents release', () => {
  const s=snapshot();s.metrics[0].evidenceRefs=['unverified']
  assert.throws(()=>verifyAudienceSnapshot(s),/EVIDENCE_INVALID/)
})
test('missing a required office prevents release', () => {
  const s=snapshot();s.metrics=s.metrics.filter(m=>m.id!=='Santa María_sales')
  assert.throws(()=>verifyAudienceSnapshot(s),/METRIC_MISSING/)
})

test('the seven September signed operations reconcile to five closures and 49,560 UF', () => {
  const operations = [
    ['Soledad Fernandez','Nueva Costanera',16400,false],
    ['María Ignacia Labbé Krinfokai','Nueva Costanera',15100,false],
    ['Jorge Zurob','Lo Beltrán',11800,false],
    ['Mary Canale Montenegro','Lo Beltrán',11400,false],
    ['María Ignacia Labbé Krinfokai','Nueva Costanera',8860,false],
    ['Sebastián Zlatar Ayuso','Nueva Costanera',8000,false],
    ['Maria de los angeles Carcavilla','Lo Beltrán',-22000,true],
  ].map(([partner,office,uf,adjustment]) => ({
    partner: String(partner), office: String(office), uf: Number(uf),
    closureCount: adjustment ? -1 : 1, originPeriod: adjustment ? '2026-07' : '2026-09',
    adjustment: Boolean(adjustment),
  }))
  assert.doesNotThrow(() => verifyAudienceOperations('2026-09',operations,{netClosures:5,netUf:49560}))
  operations.pop()
  assert.throws(() => verifyAudienceOperations('2026-09',operations,{netClosures:5,netUf:49560}),/RECONCILIATION_FAILED/)
})
