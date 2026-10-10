import { PDFDocument,StandardFonts,rgb } from 'pdf-lib'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { verifyPdfinoReport } from './pdfino-report-quality'
export type DirectorOfficeEditorial={
 period:string;cutoff:string;sourceId:string;office:string;
 closures:number;uf:number;leads:number;stock:number;classified:number;stale90:number;
 visitsRealized:number;visitsScheduled:number;gradeATotal:number;gradeAStale15:number;
 captures:number;suspended:number;
 previous:{leads:number;stock:number;visitsScheduled:number;visitsRealized:number};
}
const W=595.28,H=841.89,M=46,K=rgb(.075,.08,.08),R=rgb(.69,.15,.17),G=rgb(.36,.38,.38),P=rgb(.97,.97,.96),WHITE=rgb(1,1,1)
const plain=(s:string)=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7e]/g,' ')
const fmt=(n:number)=>n.toLocaleString('es-CL')
export function verifyDirectorEditorial(d:DirectorOfficeEditorial){
 if(!/^\d{4}-\d{2}$/.test(d.period)||!d.cutoff.startsWith(d.period)||!d.sourceId.trim())throw new Error('DIRECTOR_SOURCE_MISSING')
 if(!['Santa María','Nueva Costanera','Lo Beltrán'].includes(d.office))throw new Error('DIRECTOR_INVALID_OFFICE')
 const numbers=[d.closures,d.uf,d.leads,d.stock,d.classified,d.stale90,d.visitsRealized,d.visitsScheduled,d.gradeATotal,d.gradeAStale15,d.captures,d.suspended,...Object.values(d.previous)]
 if(numbers.some(n=>typeof n!=='number'||!Number.isFinite(n)))throw new Error('DIRECTOR_METRIC_MISSING')
 if(d.classified>d.leads||d.stale90>d.leads||d.visitsRealized>d.visitsScheduled||d.gradeAStale15>d.gradeATotal)throw new Error('DIRECTOR_METRIC_INVALID')
}
export async function buildDirectorOfficeEditorialPdf(d:DirectorOfficeEditorial){
 verifyDirectorEditorial(d)
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold)
 const b=await readFile(join(process.cwd(),'public/brand/property-partners-vitacura.png'))
 const logo=b[0]===255&&b[1]===216?await pdf.embedJpg(b):await pdf.embedPng(b)
 pdf.setTitle('Property Partners / Directora / '+d.office+' / '+d.period)
 pdf.setSubject('PP_DIRECTOR|'+d.period+'|'+d.office+'|'+d.sourceId)
 function write(p:any,s:string,x:number,y:number,z=10,heavy=false,col=K){p.drawText(plain(s),{x,y,size:z,font:heavy?bold:font,color:col})}
 function page(n:number){
  const p=pdf.addPage([W,H]);p.drawRectangle({x:0,y:0,width:W,height:H,color:WHITE})
  p.drawRectangle({x:0,y:H-46,width:W,height:46,color:K})
  write(p,'PROPERTY PARTNERS / CONTROL DE GESTION',M,H-28,9,true,WHITE)
  write(p,'DIRECTORA',W-112,H-28,8,false,WHITE)
  p.drawRectangle({x:M,y:H-51,width:W-2*M,height:2,color:R})
  write(p,'Fuente: registro canonico '+d.sourceId.slice(0,18)+' | corte '+d.cutoff,M,39,7,false,G)
  write(p,String(n)+' / 2',W-80,39,8,true,G)
  return p
 }
 let p=page(1);let dims=logo.scaleToFit(145,68);p.drawImage(logo,{x:M,y:695,width:dims.width,height:dims.height})
 write(p,'CONTROL DE GESTION / '+d.period,M,664,11,true,R)
 write(p,d.office,M,621,26,true)
 write(p,'Resultado y seguimiento verificado de la oficina',M,596,10,false,G)
 const metrics=[['Cierres netos',fmt(d.closures)],['UF netas',fmt(d.uf)+' UF'],['Leads activos',fmt(d.leads)],['Cartera',fmt(d.stock)]]
 metrics.forEach(([name,value],i)=>{const x=M+(i%2)*255,y=464-Math.floor(i/2)*93;p.drawRectangle({x,y,width:242,height:81,color:P});write(p,name,x+12,y+56,9,false,G);write(p,value,x+12,y+20,19,true)})
 write(p,'Gestion verificada',M,269,13,true)
 const rows=[['Clasificacion',d.classified+' / '+d.leads, d.leads? (100*d.classified/d.leads).toFixed(1)+'%':'N/D'],['Sin gestion >90d',fmt(d.stale90),''],['Leads A >15d',d.gradeAStale15+' / '+d.gradeATotal,''],['Visitas realizadas',d.visitsRealized+' / '+d.visitsScheduled,d.visitsScheduled?(100*d.visitsRealized/d.visitsScheduled).toFixed(1)+'%':'N/D']]
 rows.forEach(([name,value,pct],i)=>{const y=239-i*39;write(p,name,M,y,9);write(p,value,329,y,9,true);write(p,pct,465,y,9,true,R)})
 p=page(2);write(p,'COMPARACION MENSUAL',M,727,11,true,R);write(p,'Agosto a septiembre',M,689,24,true)
 const changes=[['Leads activos',d.previous.leads,d.leads],['Cartera',d.previous.stock,d.stock],['Visitas agendadas',d.previous.visitsScheduled,d.visitsScheduled],['Visitas realizadas',d.previous.visitsRealized,d.visitsRealized]]
 changes.forEach(([name,a,b],i)=>{const y=629-i*78;p.drawRectangle({x:M,y:y-29,width:W-2*M,height:64,color:P});write(p,String(name),M+12,y+12,10,true);write(p,fmt(Number(a))+'  ->  '+fmt(Number(b)),M+240,y+12,10);write(p,'Cambio '+(Number(b)-Number(a)>=0?'+':'')+fmt(Number(b)-Number(a)),M+240,y-10,9,true,R)})
 write(p,'Movimiento de cartera',M,275,13,true)
 write(p,'Captaciones  '+fmt(d.captures)+'     Suspendidas  '+fmt(d.suspended),M,247,11)
 write(p,'Cierres netos '+fmt(d.closures)+'     UF netas '+fmt(d.uf),M,216,11,true)
 write(p,'Alcance metodologico',M,149,11,true,R)
 write(p,'Sin score global: faltan requerimientos, pricing y metas verificadas.',M,127,8)
 const bytes=await pdf.save();await verifyPdfinoReport(bytes,{title:'Directora '+d.office+' '+d.period,minPages:2,requireA4:true})
 return {bytes,filename:'property-partners-directora-'+d.period+'-'+d.office.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'-').toLowerCase()+'.pdf'}
}
