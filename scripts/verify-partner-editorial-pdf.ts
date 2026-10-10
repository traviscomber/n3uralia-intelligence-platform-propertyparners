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

 // Independent transcription of the 37 nominal rows in Pedro Pablo's approved
 // September 2026 PDF. Not a substitute for the CRM snapshot at download time.
 const approved:Record<string,Array<[string,number,number,number,number,number,number,number,number,number,number]>>={
  'Santa María':[
   ['Alejandra Cambiaso',12,83.3,1,1,1,16,0,4,0,0],
   ['Catalina Iglesis Díaz',2,0,2,0,0,0,0,0,0,0],
   ['Fernanda Cortés Pradenas',28,100,0,3,8,25,4,1,0,0],
   ['Francisca Santos',84,21.4,0,4,10,11,0,1,0,0],
   ['Francisca Vergara Delorenzo',14,50,0,1,2,1,0,0,0,0],
   ['Gabriela Monros Bravo',1,100,1,0,0,0,0,0,0,0],
   ['Josefina Merello Sologuren',2,0,2,0,0,0,0,0,0,0],
   ['Luz Barbosa',83,31.3,83,0,0,4,0,0,0,0],
   ['Maria Paz Larrain',3,33.3,3,0,0,0,0,0,0,0],
   ['Maria de los angeles Tagle',129,82.2,0,7,12,8,0,0,0,0],
   ['María Javiera Celedón Correa',1,100,1,0,0,0,0,0,0,0],
   ['María José Del Río',1,0,1,0,0,0,0,0,0,0],
   ['Paula Alvarado Baigorria',43,48.8,0,12,15,26,0,0,0,0],
   ['Paula Villarroel',23,30.4,2,6,6,16,2,0,0,0],
   ['Veronica Lagos',74,100,0,14,19,28,0,0,0,0],
  ],
  'Nueva Costanera':[
   ['Alejandra Montt Siegmund',8,50,0,4,9,5,0,2,0,0],
   ['Carolina Paolini Cuadra',1,100,1,0,0,0,0,0,0,0],
   ['Claudia Stark Faundez',22,81.8,19,0,1,4,0,0,0,0],
   ['Elvira Aguirre Barros',1,100,0,2,2,0,0,0,0,0],
   ['Greta Greene Acosta',5,100,0,2,3,1,1,0,0,0],
   ['Juan Luis Beaumont H.',261,20.7,251,0,6,5,0,0,0,0],
   ['Maria Alejandra Garcia',76,64.5,31,3,5,15,2,4,0,0],
   ['María Ignacia Labbé Krinfokai',44,97.7,3,23,27,10,1,3,2,23960],
   ['María Sol Marsiglia Ventura',64,95.3,26,3,13,21,2,3,0,0],
   ['Rossana Lampasona',10,90,7,0,1,2,1,0,0,0],
   ['Sandra Cuevas Leiva',1,100,0,0,0,0,0,0,0,0],
   ['Sebastián Zlatar Ayuso',63,96.8,7,8,16,13,0,1,1,8000],
   ['Soledad Fernandez',98,64.3,45,1,3,18,0,0,1,16400],
  ],
  'Lo Beltrán':[
   ['Claudia Esposito Palma',5,60,0,0,0,0,0,0,0,0],
   ['Fernanda Motta',16,37.5,0,1,1,12,7,0,0,0],
   ['Francisca Rossetti Ossa',64,93.8,0,2,4,6,0,0,0,0],
   ['Isabel Steverlynck Vanherpe',68,60.3,5,13,31,15,1,1,0,0],
   ['Jorge Zurob',50,40,2,5,7,25,0,1,1,11800],
   ['Maria de los angeles Carcavilla',34,35.3,1,3,7,18,3,1,-1,-22000],
   ['Marta Sotomayor Bulnes',9,88.9,0,5,5,8,2,1,0,0],
   ['Mary Canale Montenegro',27,66.7,6,17,23,13,1,1,1,11400],
   ['Miguel Maldonado Aguila',13,61.5,1,0,1,4,0,0,0,0],
  ],
 }
 const approvedRows:PartnerReportRow[]=Object.entries(approved).flatMap(([office,entries])=>entries.map(([name,leads,classifiedPercent,stale90,visitsRealized,visitsScheduled,stock,captures,suspended,netClosures,netUf])=>({office,name,leads,classifiedPercent,stale90,visitsRealized,visitsScheduled,stock,captures,suspended,netClosures,netUf})))
 const approvedRoster=Object.fromEntries(Object.entries(approved).map(([office,entries])=>[office,entries.map(row=>row[0])]))
 assert.equal(approvedRows.length,37)
 assert.equal(approvedRows.reduce((a,row)=>a+(row.netClosures??0),0),5)
 assert.equal(approvedRows.reduce((a,row)=>a+(row.netUf??0),0),49560)
 const approvedPdf=await buildPartnerEditorialPdf({...input,rows:approvedRows,roster:approvedRoster,sourceId:'approved-pdf-2026-09-transcription'})
 const actual=await PDFDocument.load(approvedPdf.bytes)
 assert.equal(actual.getPageCount(),6)
 assert.equal(actual.getSubject(),'PP_PARTNERS|2026-09|approved-pdf-2026-09-transcription')
 console.log('Partner editorial: 37 nominal rows in six real A4 pages PASS')
}
main().catch(e=>{console.error(e);process.exitCode=1})
