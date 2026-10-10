import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { verifyPdfinoReport } from './pdfino-report-quality'
import { verifyAudienceOperations, type SignedOperation } from './property-partners-audience-snapshot'

export type CeoOffice = { name: string; closures: number; uf: number; leads: number; classified: number; stale90: number; realized: number; scheduled: number; stock: number }
export type CeoEditorialSnapshot = {
  period: string; cutoff: string; sourceVersion: string
  closuresActive: number; ufActive: number; closuresAdjustment: number; ufAdjustment: number
  leads: number; leadsPrevious: number; visitsScheduled: number; visitsScheduledPrevious: number
  visitsRealized: number; visitsRealizedPrevious: number; stock: number; stockPrevious: number
  offices: CeoOffice[]; operations: SignedOperation[]
  sources: { name: string; sha256: string }[]
}
const W=595.28, H=841.89, M=46
const K=rgb(0.075,0.08,0.08), RED=rgb(0.69,0.15,0.17), GREY=rgb(0.34,0.37,0.37), WHITE=rgb(1,1,1), PALE=rgb(0.965,0.96,0.95)
function safe(s: string) { return s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[–—−]/g,'-').replace(/[^\x20-\x7E]/g,' ') }
function fmt(n:number) { return n.toLocaleString('es-CL') }
export function verifyCeoEditorialSnapshot(d:CeoEditorialSnapshot) {
  if (!/^\d{4}-\d{2}$/.test(d.period) || !d.cutoff.startsWith(d.period) || !d.sourceVersion.trim()) throw new Error('CEO_PERIOD_OR_SOURCE_INVALID')
  if (d.offices.length!==3 || new Set(d.offices.map(o=>o.name)).size!==3) throw new Error('CEO_OFFICE_COVERAGE')
  const netC=d.closuresActive+d.closuresAdjustment, netUf=d.ufActive+d.ufAdjustment
  if(d.offices.reduce((s,o)=>s+o.closures,0)!==netC || d.offices.reduce((s,o)=>s+o.uf,0)!==netUf) throw new Error('CEO_OFFICE_TOTAL_MISMATCH')
  verifyAudienceOperations(d.period,d.operations,{netClosures:netC,netUf})
  if(!d.sources.length || d.sources.some(s=>!s.name || !/^[a-f\d]{64}$/i.test(s.sha256))) throw new Error('CEO_SOURCES_MISSING')
  if(![d.leads,d.leadsPrevious,d.visitsScheduled,d.visitsScheduledPrevious,d.visitsRealized,d.visitsRealizedPrevious,d.stock,d.stockPrevious].every(Number.isFinite)) throw new Error('CEO_COMPARISON_INVALID')
}
export async function buildCeoEditorialPdf(d:CeoEditorialSnapshot) {
  verifyCeoEditorialSnapshot(d)
  const pdf=await PDFDocument.create()
  const regular=await pdf.embedFont(StandardFonts.Helvetica), bold=await pdf.embedFont(StandardFonts.HelveticaBold)
  const logoBytes=await readFile(join(process.cwd(),'public/brand/property-partners-vitacura.png'))
  const logo=logoBytes[0]===255&&logoBytes[1]===216?await pdf.embedJpg(logoBytes):await pdf.embedPng(logoBytes)
  const title='Property Partners Vitacura - CEO / Directorio - '+d.period
  pdf.setTitle(title);pdf.setSubject('PP_CEO|'+d.period+'|'+d.sourceVersion);pdf.setProducer('Property Partners Vitacura / Reportin')
  function text(p:PDFPage,s:string,x:number,y:number,size=9,color=K,font:PDFFont=regular){p.drawText(safe(s),{x,y,size,color,font})}
  function line(p:PDFPage,y:number){p.drawLine({start:{x:M,y},end:{x:W-M,y},thickness:0.7,color:rgb(0.83,0.84,0.84)})}
  function base(n:number,section:string) {
    const p=pdf.addPage([W,H]);p.drawRectangle({x:0,y:0,width:W,height:H,color:WHITE})
    p.drawRectangle({x:0,y:H-42,width:W,height:42,color:K})
    text(p,'PROPERTY PARTNERS / CONTROL DE GESTION',M,H-26,9,WHITE,bold)
    text(p,'CEO / '+d.period,W-147,H-26,8,WHITE)
    p.drawRectangle({x:M,y:H-47,width:W-2*M,height:2,color:RED})
    text(p,section,M,748,10,RED,bold);line(p,56)
    text(p,'Fuente: CRM canonico y cierres validados | corte '+d.cutoff,M,36,7,GREY)
    text(p,String(n).padStart(2,'0')+' / 05',W-M-35,36,7,GREY,bold)
    return p
  }
  function heading(p:PDFPage,t:string,sub:string) { text(p,t,M,711,24,K,bold);text(p,sub,M,687,9,GREY) }
  function metric(p:PDFPage,label:string,val:string,x:number,y:number,w:number=114) {
    p.drawRectangle({x,y,width:w,height:73,borderColor:rgb(.8,.8,.8),borderWidth:.65,color:PALE})
    text(p,label,x+9,y+52,7,GREY,bold);text(p,val,x+9,y+22,17,K,bold)
  }
  // 01 / cover: official asset, A4 white interior language, cut and audience.
  let p=pdf.addPage([W,H]);p.drawRectangle({x:0,y:0,width:W,height:H,color:WHITE})
  p.drawRectangle({x:0,y:0,width:157,height:H,color:K})
  p.drawRectangle({x:157,y:0,width:7,height:H,color:RED})
  const dims=logo.scaleToFit(128,100);p.drawImage(logo,{x:15,y:700,width:dims.width,height:dims.height})
  text(p,'CONTROL DE GESTION',201,714,12,K,bold);text(p,d.period,201,664,35,K,bold)
  text(p,'CEO / DIRECTORIO',201,624,12,RED,bold)
  text(p,'Resultado, operacion y trazabilidad',201,596,10,GREY)
  p.drawRectangle({x:201,y:115,width:340,height:103,color:PALE})
  text(p,'CORTE DE DATOS',218,192,9,RED,bold);text(p,d.cutoff,218,161,17,K,bold)
  text(p,'Origen: '+d.sourceVersion.slice(0,35),218,138,8,GREY)
  // 02 / executive snapshot
  p=base(2,'01 / RESULTADO DEL MES');heading(p,'Resumen ejecutivo','Cierres netos, actividad y focos por oficina')
  const net=d.closuresActive+d.closuresAdjustment, netUF=d.ufActive+d.ufAdjustment
  metric(p,'CIERRES NETOS',fmt(net),M,583);metric(p,'UF NETAS',fmt(netUF)+' UF',M+123,583,134)
  metric(p,'LEADS ACTIVOS',fmt(d.leads),M+267,583);metric(p,'VISITAS',fmt(d.visitsRealized),M+390,583,113)
  text(p,'Puente comercial',M,536,13,K,bold)
  for(const [i,entry] of [[ 'Activos',d.closuresActive,d.ufActive],['Ajuste historico',d.closuresAdjustment,d.ufAdjustment],['Neto',net,netUF]].entries()){
    const y=506-i*31;line(p,y-10);text(p,String(entry[0]),M,y,9,i===2?RED:K,i===2?bold:regular);text(p,fmt(Number(entry[1])),330,y,9,K,bold);text(p,fmt(Number(entry[2]))+' UF',412,y,9,K,bold)
  }
  text(p,'Comparacion de actividad (mes anterior / actual)',M,378,12,K,bold)
  for(const [i,a] of [['Leads',d.leadsPrevious,d.leads],['Visitas agendadas',d.visitsScheduledPrevious,d.visitsScheduled],['Visitas realizadas',d.visitsRealizedPrevious,d.visitsRealized],['Stock',d.stockPrevious,d.stock]].entries()){
    const y=347-i*34;line(p,y-10);text(p,String(a[0]),M,y,9);text(p,fmt(Number(a[1])),300,y,9,GREY);text(p,fmt(Number(a[2])),410,y,9,K,bold)
  }
  // 03 / signed operations, no truncated rows
  p=base(3,'02 / RESULTADO COMERCIAL');heading(p,'Detalle de operaciones','Operaciones nominales y ajuste historico con signo')
  for(const [i,op] of d.operations.entries()){
    const y=646-i*58
    text(p,op.partner,M,y,10,K,bold);text(p,op.office,M,y-16,8,GREY)
    text(p,(op.adjustment?'AJUSTE '+op.originPeriod:'ACTIVO '+op.originPeriod),307,y,7,op.adjustment?RED:GREY,bold)
    text(p,fmt(op.closureCount)+' / '+fmt(op.uf)+' UF',407,y-16,9,op.adjustment?RED:K,bold)
    line(p,y-30)
  }
  // 04 / office comparison
  p=base(4,'03 / OPERACION');heading(p,'Comparacion por oficina','Universos, visitas y resultados declarados')
  text(p,'Oficina',M,641,9,K,bold);text(p,'Leads',210,641,8,K,bold);text(p,'Visitas',285,641,8,K,bold);text(p,'Cierres',390,641,8,K,bold);text(p,'UF',470,641,8,K,bold)
  for(const [i,o] of d.offices.entries()){
    const y=604-i*70;line(p,y-18);text(p,o.name,M,y,10,K,bold);text(p,fmt(o.leads),210,y,9);text(p,fmt(o.realized)+'/'+fmt(o.scheduled),285,y,9);text(p,fmt(o.closures),390,y,9);text(p,fmt(o.uf),470,y,9)
    text(p,'Clasificados '+fmt(o.classified)+'  |  >90 dias '+fmt(o.stale90)+'  |  Stock '+fmt(o.stock),M,y-21,8,GREY)
  }
  text(p,'Evolucion corporativa',M,326,12,K,bold)
  for(const [i,a] of [['Leads',d.leadsPrevious,d.leads],['Stock',d.stockPrevious,d.stock],['Agendadas',d.visitsScheduledPrevious,d.visitsScheduled],['Realizadas',d.visitsRealizedPrevious,d.visitsRealized]].entries()){
    const y=293-i*43; const max=Math.max(Number(a[1]),Number(a[2]),1)
    text(p,String(a[0]),M,y,8,K,bold)
    p.drawRectangle({x:170,y:y+3,width:210*Number(a[1])/max,height:5,color:rgb(.73,.74,.74)})
    p.drawRectangle({x:170,y:y-7,width:210*Number(a[2])/max,height:5,color:RED})
    text(p,fmt(Number(a[1]))+' / '+fmt(Number(a[2])),404,y-3,8,K)
  }
  // 05 / provenance
  p=base(5,'04 / TRAZABILIDAD');heading(p,'Fuentes y metodologia','Evidencia y limites de interpretacion')
  text(p,'Fuentes canónicas con SHA-256',M,638,12,K,bold)
  for(const [i,s] of d.sources.entries()){
    const y=610-i*47;if(y<124)throw new Error('CEO_SOURCES_EXCEED_PAGE')
    text(p,s.name.slice(0,78),M,y,8,K,bold);text(p,s.sha256.slice(0,32)+'...',M,y-14,7,GREY);line(p,y-24)
  }
  text(p,'No se calcula score global sin requerimientos, pricing y metas verificadas.',M,96,8,RED,bold)
  const bytes=await pdf.save();await verifyPdfinoReport(bytes,{title,minPages:5,requireA4:true})
  return {bytes,filename:'property-partners-ceo-'+d.period+'.pdf'}
}
