import { PDFDocument,StandardFonts,rgb,type PDFPage,type PDFFont } from 'pdf-lib'
import {readFile} from 'node:fs/promises'
import {join} from 'node:path'
import {verifyPdfinoReport} from './pdfino-report-quality'
import {verifyPartnerReportRows,type PartnerReportRow} from './property-partners-audience-snapshot'
export type PartnerEditorialInput={period:string;cutoff:string;sourceId:string;rows:PartnerReportRow[];roster:Record<string,string[]>;sources:{name:string;sha256:string}[]}
const W=595.28,H=841.89,M=41,INK=rgb(.09,.09,.09),RED=rgb(.65,.13,.16),GREY=rgb(.34,.35,.35),PAPER=rgb(1,1,1),TINT=rgb(.967,.966,.958)
const norm=(s:string)=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7e]/g,' ')
const fmt=(n:number|null)=>n===null?'N/D':n.toLocaleString('es-CL',{maximumFractionDigits:1})
export async function buildPartnerEditorialPdf(input:PartnerEditorialInput){
 if(!/^\d{4}-\d{2}$/.test(input.period)||!input.cutoff.startsWith(input.period)||!input.sourceId.trim())throw new Error('PARTNER_SOURCE_INVALID')
 verifyPartnerReportRows(input.rows,input.roster)
 if(!input.sources.length||input.sources.some(s=>!s.name||!/^[a-f\d]{64}$/i.test(s.sha256)))throw new Error('PARTNER_EVIDENCE_INVALID')
 const offices=['Santa María','Nueva Costanera','Lo Beltrán'] as const
 if(Object.keys(input.roster).length!==3||offices.some(o=>!input.roster[o]?.length))throw new Error('PARTNER_OFFICE_COVERAGE')
 const pdf=await PDFDocument.create()
 const regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold)
 const img=await readFile(join(process.cwd(),'public/brand/property-partners-vitacura.png'))
 const logo=img[0]===255&&img[1]===216?await pdf.embedJpg(img):await pdf.embedPng(img)
 const title='Property Partners - Partners - '+input.period
 pdf.setTitle(title);pdf.setSubject('PP_PARTNERS|'+input.period+'|'+input.sourceId)
 const tx=(p:PDFPage,s:string,x:number,y:number,z=9,font:PDFFont=regular,color=INK)=>p.drawText(norm(s),{x,y,size:z,font,color})
 const ln=(p:PDFPage,y:number)=>p.drawLine({start:{x:M,y},end:{x:W-M,y},color:rgb(.83,.83,.82),thickness:.65})
 const totalPages=2+offices.reduce((n,o)=>n+Math.ceil(input.rows.filter(r=>r.office===o).length/13),0)
 const page=(num:number,section:string)=>{
  const p=pdf.addPage([W,H]);p.drawRectangle({x:0,y:0,width:W,height:H,color:PAPER})
  p.drawRectangle({x:0,y:H-48,width:W,height:48,color:INK})
  tx(p,'PROPERTY PARTNERS  /  CONTROL DE GESTION',M,H-28,9,bold,PAPER)
  tx(p,'PARTNERS',W-95,H-28,8,regular,PAPER)
  p.drawRectangle({x:M,y:H-53,width:W-2*M,height:2,color:RED})
  tx(p,section,M,747,11,bold,RED)
  ln(p,53);tx(p,'Corte '+input.cutoff+'  |  Fuente '+input.sourceId.slice(0,25),M,35,7,regular,GREY)
  tx(p,String(num).padStart(2,'0')+' / '+String(totalPages).padStart(2,'0'),W-82,35,8,bold,GREY)
  return p
 }
 let n=1,p=page(n++,'01 / RESUMEN NOMINAL')
 const d=logo.scaleToFit(150,66);p.drawImage(logo,{x:M,y:644,width:d.width,height:d.height})
 tx(p,'Informe nominal / '+input.period,M,612,23,bold)
 tx(p,'Actividad comercial por oficina, sin rankings ni scores individuales.',M,586,9,regular,GREY)
 tx(p,'COBERTURA VERIFICADA',M,530,10,bold,RED)
 offices.forEach((o,i)=>{const y=493-i*70;p.drawRectangle({x:M,y:y-25,width:W-2*M,height:57,color:TINT});tx(p,o,M+14,y+6,12,bold);tx(p,fmt(input.rows.filter(r=>r.office===o).length)+' partners',W-144,y+6,11,bold)})
 tx(p,'Regla de lectura',M,235,12,bold)
 tx(p,'Cierres y UF con signo. Un ajuste historico no es una venta nueva.',M,208,9)
 tx(p,'Ceros conservados; ausencia de datos como N/D.',M,188,9)
 tx(p,'No sumar leads de oficinas para reemplazar el total corporativo.',M,168,9,regular,RED)
 for(const office of offices){
  const rows=input.rows.filter(row=>row.office===office)
  for(let offset=0;offset<rows.length;offset+=13){
   p=page(n++,'02 / '+office.toUpperCase())
   tx(p,office,M,716,24,bold);tx(p,'Detalle por partner / '+input.period,M,691,9,regular,GREY)
   tx(p,'Partner',M,661,8,bold);tx(p,'Leads',254,661,8,bold);tx(p,'Clasif.',300,661,8,bold);tx(p,'Visitas',356,661,8,bold);tx(p,'Stock',422,661,8,bold);tx(p,'UF netas',469,661,8,bold)
   for(const [i,row] of rows.slice(offset,offset+13).entries()){
    const y=630-i*43
    if(i%2===0)p.drawRectangle({x:M,y:y-26,width:W-2*M,height:40,color:TINT})
    tx(p,row.name.slice(0,39),M+5,y+2,8,bold)
    tx(p,fmt(row.leads),254,y+2,8)
    tx(p,row.classifiedPercent===null?'N/D':fmt(row.classifiedPercent)+'%',300,y+2,8)
    tx(p,fmt(row.visitsRealized)+'/'+fmt(row.visitsScheduled),356,y+2,8)
    tx(p,fmt(row.stock),422,y+2,8)
    tx(p,fmt(row.netUf),469,y+2,8,bold,row.netUf!==null&&row.netUf<0?RED:INK)
    tx(p,'>90d '+fmt(row.stale90)+'  |  Capt./Susp. '+fmt(row.captures)+'/'+fmt(row.suspended)+'  |  Cierres '+fmt(row.netClosures),M+5,y-15,7,regular,GREY)
   }
  }
 }
 p=page(n++,'03 / TRAZABILIDAD Y DEFINICIONES')
 tx(p,'Criterios y fuentes',M,705,24,bold)
 tx(p,'Visitas realizadas/agendadas, identificador unico; atribucion segun CRM.',M,669,9)
 tx(p,'Las operaciones historicas negativas se mantienen firmadas.',M,649,9)
 input.sources.forEach((src,i)=>{const y=602-i*38;if(y<115)throw new Error('PARTNER_SOURCE_PAGE_OVERFLOW');tx(p,src.name.slice(0,78),M,y,8,bold);tx(p,src.sha256.slice(0,40)+'...',M,y-14,7,regular,GREY);ln(p,y-19)})
 const bytes=await pdf.save();await verifyPdfinoReport(bytes,{title,minPages:5,requireA4:true})
 return {bytes,filename:'property-partners-partners-'+input.period+'.pdf'}
}
