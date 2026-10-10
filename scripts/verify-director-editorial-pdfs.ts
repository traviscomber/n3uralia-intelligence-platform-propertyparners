import assert from 'node:assert/strict'
import { PDFDocument } from 'pdf-lib'
import { buildDirectorOfficeEditorialPdf } from '../lib/property-partners-director-editorial-pdf'
import { mapVerifiedDirectorOffice } from '../lib/property-partners-director-canonical-mapper'
import type { AudienceSnapshot } from '../lib/property-partners-audience-snapshot'

async function main() {
  // Numeric baseline is the approved September report. This fixture is not a
  // persisted CRM snapshot and its output must not be sent to a customer.
  const offices=[
    {name:'Santa María',sales:0,sales_uf:0,active:500,stock:143,classified:300,stale90:96,realized:48,scheduled:73,captures:6,suspended:6,activeA:34,stale15A:1,previous:{leads:532,stock:134,visitsScheduled:94,visitsRealized:65}},
    {name:'Nueva Costanera',sales:4,sales_uf:48360,active:654,stock:94,classified:370,stale90:390,realized:46,scheduled:86,captures:7,suspended:13,activeA:39,stale15A:9,previous:{leads:373,stock:95,visitsScheduled:118,visitsRealized:62}},
    {name:'Lo Beltrán',sales:1,sales_uf:1200,active:286,stock:101,classified:176,stale90:15,realized:46,scheduled:79,captures:14,suspended:5,activeA:21,stale15A:11,previous:{leads:323,stock:95,visitsScheduled:112,visitsRealized:62}},
  ]
  const snapshot:AudienceSnapshot & {sourceSnapshotId:string}={
    sourceSnapshotId:'pp-2026-09-1ceb7a8b4eb1',
    period:{start:'2026-09-01',end:'2026-09-30'},
    evidence:[{id:'reference',status:'verified',source:'reference.xlsx#sha256='+'a'.repeat(64)}],
    metrics:offices.flatMap(o=>Object.entries(o).filter(([key])=>!['name','previous'].includes(key)).map(([key,value])=>({
      id:o.name+'_'+key,label:key,value:value as number,status:'verified',evidenceRefs:['reference'],
    }))),
  }
  for(const office of offices){
    const mapped=mapVerifiedDirectorOffice(snapshot,office.name,office.previous)
    const artifact=await buildDirectorOfficeEditorialPdf(mapped)
    const pdf=await PDFDocument.load(artifact.bytes)
    assert.equal(pdf.getPageCount(),2,'Each directora receives exactly two editorial A4 pages')
    for(const page of pdf.getPages()){
      assert.ok(Math.abs(page.getWidth()-595.28)<1)
      assert.ok(Math.abs(page.getHeight()-841.89)<1)
    }
    assert.match(pdf.getSubject()??'',new RegExp('PP_DIRECTOR\\|2026-09'))
    assert.ok(artifact.bytes.byteLength>1500)
  }
  console.log('Director September report rendering: three office-specific PDFs, two A4 pages each PASS')
}
main().catch(error=>{console.error(error);process.exitCode=1})
