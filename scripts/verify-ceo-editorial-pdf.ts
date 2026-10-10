import assert from 'node:assert/strict'
import { PDFDocument } from 'pdf-lib'
import { buildCeoEditorialPdf, type CeoEditorialSnapshot } from '../lib/property-partners-ceo-editorial-pdf'

async function main() {
  // Synthetic QA fixture: not an approved client report.
  const operations = [
    ['Agente Uno','Nueva Costanera',16400,false],['Agente Dos','Nueva Costanera',15100,false],
    ['Agente Tres','Lo Beltrán',11800,false],['Agente Cuatro','Lo Beltrán',11400,false],
    ['Agente Cinco','Nueva Costanera',8860,false],['Agente Seis','Nueva Costanera',8000,false],
    ['Agente Ajuste','Lo Beltrán',-22000,true],
  ].map(([partner,office,uf,adjustment])=>({
    partner:String(partner), office:String(office), uf:Number(uf), closureCount:adjustment?-1:1,
    adjustment:Boolean(adjustment), originPeriod:adjustment?'2026-07':'2026-09',
  }))
  const payload:CeoEditorialSnapshot={
    period:'2026-09',cutoff:'2026-09-30',sourceVersion:'synthetic-test-only',
    closuresActive:6,ufActive:71560,closuresAdjustment:-1,ufAdjustment:-22000,
    leads:1470,leadsPrevious:1228,visitsScheduled:238,visitsScheduledPrevious:324,
    visitsRealized:140,visitsRealizedPrevious:189,stock:340,stockPrevious:324,
    offices:[
      {name:'Santa María',closures:0,uf:0,leads:500,classified:300,stale90:96,realized:48,scheduled:73,stock:143},
      {name:'Nueva Costanera',closures:4,uf:48360,leads:654,classified:370,stale90:390,realized:46,scheduled:86,stock:94},
      {name:'Lo Beltrán',closures:1,uf:1200,leads:286,classified:176,stale90:15,realized:46,scheduled:79,stock:101},
    ],
    operations,sources:[{name:'Synthetic source - no customer evidence',sha256:'a'.repeat(64)}],
  }
  const output=await buildCeoEditorialPdf(payload)
  const doc=await PDFDocument.load(output.bytes)
  assert.equal(doc.getPageCount(),5)
  assert.ok(doc.getPages().every(p=>Math.abs(p.getWidth()-595.28)<1 && Math.abs(p.getHeight()-841.89)<1))
  assert.match(doc.getTitle()??'',/CEO/)
  assert.match(doc.getSubject()??'',/2026-09/)
  await assert.rejects(()=>buildCeoEditorialPdf({...payload,ufAdjustment:-21000}),/CEO_OFFICE_TOTAL_MISMATCH/)
  await assert.rejects(()=>buildCeoEditorialPdf({...payload,operations:operations.slice(1)}),/REPORT_OPERATIONS_RECONCILIATION_FAILED/)
  console.log('CEO editorial PDF: five real A4 pages, signed source reconciliation PASS')
}
main().catch(err=>{console.error(err);process.exitCode=1})
