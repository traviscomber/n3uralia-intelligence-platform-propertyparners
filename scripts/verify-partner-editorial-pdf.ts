import assert from 'node:assert/strict'
import {PDFDocument} from 'pdf-lib'
import {buildPartnerEditorialPdf} from '../lib/property-partners-partner-editorial-pdf'
import type {PartnerReportRow} from '../lib/property-partners-audience-snapshot'
async function main(){
 const roster={'Santa María':Array.from({length:15},(_,i)=>'SM Partner '+i),'Nueva Costanera':Array.from({length:13},(_,i)=>'NC Partner '+i),'Lo Beltrán':Array.from({length:9},(_,i)=>'LB Partner '+i)}
 const rows:PartnerReportRow[]=Object.entries(roster).flatMap(([office,names])=>names.map(name=>({office,name,leads:0,classifiedPercent:0,stale90:0,visitsRealized:0,visitsScheduled:0,stock:0,captures:0,suspended:0,netClosures:0,netUf:0})))
 rows[rows.length-1].netClosures=-1;rows[rows.length-1].netUf=-22000
 const input={period:'2026-09',cutoff:'2026-09-30',sourceId:'synthetic-render-qa',roster,rows,sources:[{name:'synthetic evidence for layout QA only',sha256:'a'.repeat(64)}]}
 const result=await buildPartnerEditorialPdf(input)
 const pdf=await PDFDocument.load(result.bytes)
 assert.equal(pdf.getPageCount(),6,'15 + 13 + 9 rows require 4 detail pages plus summary/provenance')
 assert.ok(pdf.getPages().every(p=>Math.abs(p.getWidth()-595.28)<1&&Math.abs(p.getHeight()-841.89)<1))
 assert.match(pdf.getSubject()??'',/^PP_PARTNERS\|2026-09\|/)
 await assert.rejects(()=>buildPartnerEditorialPdf({...input,rows:rows.slice(1)}),/REPORT_PARTNER_ROW_COUNT_MISMATCH/)
 console.log('Partner editorial: 37 nominal rows in six real A4 pages PASS')
}
main().catch(e=>{console.error(e);process.exitCode=1})
