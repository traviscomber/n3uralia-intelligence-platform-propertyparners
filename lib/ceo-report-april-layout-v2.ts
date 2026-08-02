import { getCompanySalesCompliance } from '@/lib/targets-2026'
import { getOperationalSummary } from '@/lib/crm-snapshot'

const MONTHS = [
  { key: '2026-01', short: 'Ene' },
  { key: '2026-02', short: 'Feb' },
  { key: '2026-03', short: 'Mar' },
  { key: '2026-04', short: 'Abr' },
  { key: '2026-05', short: 'May' },
  { key: '2026-06', short: 'Jun' },
] as const

const BRAND = {
  background: '#050807',
  surface: '#0c1111',
  surfaceMuted: '#0f1616',
  foreground: '#edf4f3',
  muted: '#b6c1bf',
  primary: '#d7332b',
  primarySoft: '#ff766f',
  border: 'rgba(215,51,43,0.22)',
  chartBlue: '#1565c0',
  chartGreen: '#27ae60',
  chartOrange: '#f39c12',
  chartGray: '#7f8c8d',
} as const

const fmt = (value: number, digits = 0) => new Intl.NumberFormat('es-CL', {
  minimumFractionDigits: digits,
  maximumFractionDigits: digits,
}).format(value)

function status(percent: number) {
  if (percent >= 100) return { label: 'Sobre meta', color: BRAND.chartGreen, bg: '#0d2518' }
  if (percent >= 90) return { label: 'En rango', color: BRAND.chartOrange, bg: '#2a2110' }
  return { label: 'Bajo meta', color: BRAND.primarySoft, bg: '#2a1312' }
}

function performanceColor(percent: number) {
  if (percent >= 100) return BRAND.chartGreen
  if (percent >= 90) return BRAND.chartOrange
  return BRAND.primarySoft
}

function card(label: string, value: string, detail: string, accent: string = BRAND.foreground) {
  return `<td width="50%" valign="top" style="padding:0 8px 16px"><table width="100%" role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:${BRAND.surface};border:1px solid ${BRAND.border}"><tr><td style="padding:22px"><div style="font:600 10px/14px Calibri,Arial,sans-serif;letter-spacing:1.5px;text-transform:uppercase;color:${BRAND.muted};margin-bottom:13px">${label}</div><div style="font:700 38px/42px Calibri,Arial,sans-serif;color:${accent};font-variant-numeric:tabular-nums">${value}</div><div style="font:12px/18px Calibri,Arial,sans-serif;color:${BRAND.muted};margin-top:9px">${detail}</div></td></tr></table></td>`
}

function salesChart(monthly: Array<{ short: string; actual: number; target: number; compliance: number }>) {
  const max = Math.max(10, ...monthly.flatMap((m) => [m.actual, m.target]))
  return monthly.map((m) => {
    const actualW = Math.max(2, Math.round((m.actual / max) * 100))
    const targetW = Math.max(2, Math.round((m.target / max) * 100))
    const actualColor = performanceColor(m.compliance)
    return `<tr><td width="44" style="padding:9px 10px 9px 0;font:700 11px Calibri,Arial,sans-serif;color:${BRAND.foreground}">${m.short}</td><td style="padding:9px 0"><table width="100%" role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr><td width="76" style="font:10px Calibri,Arial,sans-serif;color:${BRAND.muted}">Cierres ${fmt(m.actual)}</td><td><div style="height:10px;background:${BRAND.surfaceMuted}"><div style="height:10px;width:${actualW}%;background:${actualColor}"></div></div></td></tr><tr><td width="76" style="padding-top:5px;font:10px Calibri,Arial,sans-serif;color:${BRAND.muted}">Meta ${fmt(m.target,1)}</td><td style="padding-top:5px"><div style="height:5px;background:${BRAND.surfaceMuted}"><div style="height:5px;width:${targetW}%;background:${BRAND.chartGray}"></div></div></td></tr></table></td></tr>`
  }).join('')
}

function complianceChart(monthly: Array<{ short: string; compliance: number }>) {
  const W = 580, H = 220, left = 44, top = 24, bottom = 34
  const chartH = H - top - bottom
  const spacing = monthly.length > 1 ? (W - left - 20) / (monthly.length - 1) : 0
  const points = monthly.map((m, i) => {
    const x = left + i * spacing
    const y = top + chartH - Math.min(110, m.compliance) / 110 * chartH
    return { ...m, x, y }
  })
  const polyline = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const grid = [0, 25, 50, 75, 100].map((v) => {
    const y = top + chartH - v / 110 * chartH
    return `<line x1="${left}" y1="${y}" x2="${W-20}" y2="${y}" stroke="rgba(182,193,191,0.28)" stroke-width="1"/><text x="${left-8}" y="${y+4}" text-anchor="end" font-size="9" fill="${BRAND.muted}">${v}%</text>`
  }).join('')
  const dots = points.map((p) => {
    const color = performanceColor(p.compliance)
    return `<circle cx="${p.x}" cy="${p.y}" r="4" fill="${color}"/><text x="${p.x}" y="${p.y-10}" text-anchor="middle" font-size="10" font-weight="700" fill="${color}">${fmt(p.compliance)}%</text><text x="${p.x}" y="${H-10}" text-anchor="middle" font-size="10" fill="${BRAND.muted}">${p.short}</text>`
  }).join('')
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Evolución del cumplimiento mensual" xmlns="http://www.w3.org/2000/svg"><rect width="${W}" height="${H}" fill="${BRAND.surface}"/>${grid}<line x1="${left}" y1="${top + chartH - 100/110*chartH}" x2="${W-20}" y2="${top + chartH - 100/110*chartH}" stroke="${BRAND.chartGray}" stroke-dasharray="4 4"/><polyline points="${polyline}" fill="none" stroke="${BRAND.chartBlue}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${dots}</svg>`
}

function funnelRow(label: string, value: number, max: number, detail: string, accent = BRAND.chartGray) {
  const width = Math.max(3, Math.round((value / Math.max(max, 1)) * 100))
  return `<tr><td width="110" style="padding:10px 12px 10px 0;font:600 11px Calibri,Arial,sans-serif;color:${BRAND.foreground}">${label}</td><td style="padding:10px 0"><div style="height:22px;background:${BRAND.surfaceMuted}"><div style="height:22px;width:${width}%;background:${accent};min-width:3px"></div></div></td><td width="90" align="right" style="padding:10px 0 10px 12px;font:700 15px Calibri,Arial,sans-serif;color:${BRAND.foreground}">${fmt(value)}</td><td width="105" style="padding:10px 0 10px 10px;font:10px/14px Calibri,Arial,sans-serif;color:${BRAND.muted}">${detail}</td></tr>`
}

export async function generateCeoReportAprilLayoutV2(monthName: string, period: string) {
  const index = Math.max(0, MONTHS.findIndex((m) => m.key === period))
  const visible = MONTHS.slice(0, index + 1)
  const monthly = visible.map((m) => {
    const d = getCompanySalesCompliance(m.key)
    const actual = Number(d?.actual ?? 0)
    const target = Number(d?.target ?? 0)
    return { ...m, actual, target, compliance: target > 0 ? actual / target * 100 : 0 }
  })
  const current = monthly[monthly.length - 1]
  const op = getOperationalSummary(period)
  const actual = current.actual
  const target = current.target
  const compliance = current.compliance
  const productivity = actual / 7
  const cumulativeActual = monthly.reduce((s, m) => s + m.actual, 0)
  const cumulativeTarget = monthly.reduce((s, m) => s + m.target, 0)
  const cumulativeCompliance = cumulativeTarget > 0 ? cumulativeActual / cumulativeTarget * 100 : 0
  const previous = monthly.length > 1 ? monthly[monthly.length - 2].actual : 0
  const state = status(compliance)
  const leads = Number(op.leads ?? 0)
  const visits = Number(op.visits ?? 0)
  const sales = Number(op.sales ?? 0)
  const captures = Number(op.captations ?? 0)
  const stock = Number(op.stock ?? 0)
  const generated = new Intl.DateTimeFormat('es-CL',{day:'2-digit',month:'long',year:'numeric',timeZone:'America/Santiago'}).format(new Date())

  const sectionTitle = (n:string, kicker:string, title:string, subtitle:string) => `<div style="font:700 10px Calibri,Arial,sans-serif;letter-spacing:2px;color:${BRAND.primarySoft};text-transform:uppercase">${n} · ${kicker}</div><div style="font:700 22px/28px Calibri,Arial,sans-serif;color:${BRAND.foreground};margin-top:8px">${title}</div><div style="font:12px/18px Calibri,Arial,sans-serif;color:${BRAND.muted};margin-top:6px;margin-bottom:24px">${subtitle}</div>`

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Control de Gestión — Cierre ${monthName}</title></head><body style="margin:0;background:${BRAND.background};color:${BRAND.foreground}"><table width="100%" role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:${BRAND.background}"><tr><td align="center"><table width="700" role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:700px;border-collapse:collapse;background:${BRAND.background}">
  <tr><td style="padding:46px 44px 38px;border-bottom:1px solid ${BRAND.border}"><div style="font:10px/14px Calibri,Arial,sans-serif;letter-spacing:2.4px;color:${BRAND.muted};text-transform:uppercase;margin-bottom:18px">PROPERTY PARTNERS VITACURA · CONTROL DE GESTIÓN</div><div style="font:700 30px/35px Calibri,Arial,sans-serif;color:${BRAND.foreground}">Cierre ${monthName}</div><div style="font:14px/21px Calibri,Arial,sans-serif;color:${BRAND.muted};margin-top:10px">Resultado comercial, evolución y disciplina operacional para decisión ejecutiva.</div><table width="100%" role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;border-top:1px solid ${BRAND.border}"><tr><td style="padding-top:16px;font:10px Calibri,Arial,sans-serif;color:${BRAND.muted};text-transform:uppercase">Reporte CEO · Enero–${monthName} 2026</td><td align="right" style="padding-top:16px;font:10px Calibri,Arial,sans-serif;color:${BRAND.muted}">Generado ${generated}</td></tr></table></td></tr>
  <tr><td style="padding:38px 36px 30px;border-bottom:1px solid ${BRAND.border}">${sectionTitle('01','RESUMEN EJECUTIVO',`Resultado comercial de ${monthName}`,'Lectura inmediata del mes y del avance acumulado al corte.')}<table width="100%" role="presentation" cellpadding="0" cellspacing="0"><tr>${card('Cierres del mes',fmt(actual),`Meta ${fmt(target,1)} · Variación vs mes anterior ${actual-previous>=0?'+':''}${fmt(actual-previous)}`)}${card('Cumplimiento mensual',`${fmt(compliance)}%`,state.label,state.color)}</tr><tr>${card('Productividad',fmt(productivity,2),'Cierres por ejecutiva')}${card(`Acumulado Ene–${monthName}`,fmt(cumulativeActual),`Meta ${fmt(cumulativeTarget,1)} · ${fmt(cumulativeCompliance,1)}%`,performanceColor(cumulativeCompliance))}</tr></table><table width="100%" role="presentation" cellpadding="0" cellspacing="0" style="background:${state.bg};border-left:3px solid ${state.color};margin:4px 8px 0;width:calc(100% - 16px)"><tr><td style="padding:14px 16px;font:12px/18px Calibri,Arial,sans-serif;color:${BRAND.foreground}"><strong style="color:${state.color}">Lectura ejecutiva:</strong> ${monthName} registra ${fmt(actual)} cierres frente a una meta de ${fmt(target,1)}. El acumulado alcanza ${fmt(cumulativeActual)} cierres y ${fmt(cumulativeCompliance,1)}% de cumplimiento.</td></tr></table></td></tr>
  <tr><td style="padding:38px 44px;border-bottom:1px solid ${BRAND.border}">${sectionTitle('02','VENTA DEL MES','Cierres versus meta','Comparación visual mensual siguiendo la lógica de las presentaciones canónicas.')}<table width="100%" role="presentation" cellpadding="0" cellspacing="0" style="background:${BRAND.surface};border:1px solid ${BRAND.border};padding:18px"><tr><td style="padding:16px 20px"><table width="100%" role="presentation" cellpadding="0" cellspacing="0">${salesChart(monthly)}</table><div style="font:10px Calibri,Arial,sans-serif;color:${BRAND.muted};margin-top:12px">Resultado: verde ≥100%, naranja 90–99%, rojo &lt;90% · Meta: gris neutral</div></td></tr></table></td></tr>
  <tr><td style="padding:38px 44px;border-bottom:1px solid ${BRAND.border}">${sectionTitle('03','EVOLUCIÓN DE CUMPLIMIENTO',`Enero–${monthName} 2026`,'Tendencia del cumplimiento mensual con referencia explícita de 100%.')}<table width="100%" role="presentation" cellpadding="0" cellspacing="0" style="background:${BRAND.surface};border:1px solid ${BRAND.border}"><tr><td style="padding:14px">${complianceChart(monthly)}</td></tr></table></td></tr>
  <tr><td style="padding:38px 44px;border-bottom:1px solid ${BRAND.border}">${sectionTitle('04','EMBUDO OPERACIONAL','Actividad comercial del período','Relación visual entre generación de demanda, actividad y cierres registrados.')}<table width="100%" role="presentation" cellpadding="0" cellspacing="0" style="background:${BRAND.surface};border:1px solid ${BRAND.border}"><tr><td style="padding:18px 20px"><table width="100%" role="presentation" cellpadding="0" cellspacing="0">${funnelRow('Leads',leads,Math.max(leads,1),'Entrada total',BRAND.chartBlue)}${funnelRow('Visitas',visits,Math.max(leads,1),leads>0?`${fmt(visits/leads*100,1)}% de leads`:'Sin base',BRAND.chartOrange)}${funnelRow('Cierres',sales,Math.max(leads,1),visits>0?`${fmt(sales/visits*100,1)}% de visitas`:'Sin base',BRAND.chartGreen)}${funnelRow('Captaciones',captures,Math.max(leads,1),'Oferta incorporada',BRAND.chartBlue)}${funnelRow('Stock',stock,Math.max(leads,1),'Inventario disponible',BRAND.chartGray)}</table></td></tr></table></td></tr>
  <tr><td style="padding:38px 44px;border-bottom:1px solid ${BRAND.border}">${sectionTitle('05','ESTÁNDARES OPERACIONALES','Tiempos de contacto','Definiciones activas; no corresponden a resultados observados.')}<table width="100%" role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:${BRAND.surface};border:1px solid ${BRAND.border}"><tr><td style="padding:15px 18px;font:700 11px Calibri,Arial,sans-serif;border-bottom:1px solid ${BRAND.border}">TIPO</td><td align="center" style="font:10px Calibri,Arial,sans-serif;color:${BRAND.muted};border-bottom:1px solid ${BRAND.border}">PRIMER CONTACTO</td><td align="center" style="font:10px Calibri,Arial,sans-serif;color:${BRAND.muted};border-bottom:1px solid ${BRAND.border}">SEGUIMIENTO</td><td align="center" style="font:10px Calibri,Arial,sans-serif;color:${BRAND.muted};border-bottom:1px solid ${BRAND.border}">RECONTACTO</td></tr><tr><td style="padding:16px 18px;font:700 12px Calibri,Arial,sans-serif;border-bottom:1px solid ${BRAND.border}">Casa</td><td align="center" style="font:700 18px Calibri,Arial,sans-serif;border-bottom:1px solid ${BRAND.border}">48h</td><td align="center" style="font:700 18px Calibri,Arial,sans-serif;border-bottom:1px solid ${BRAND.border}">24h</td><td align="center" style="font:700 18px Calibri,Arial,sans-serif;border-bottom:1px solid ${BRAND.border}">7 días</td></tr><tr><td style="padding:16px 18px;font:700 12px Calibri,Arial,sans-serif">Departamento</td><td align="center" style="font:700 18px Calibri,Arial,sans-serif">24h</td><td align="center" style="font:700 18px Calibri,Arial,sans-serif">12h</td><td align="center" style="font:700 18px Calibri,Arial,sans-serif">5 días</td></tr></table></td></tr>
  <tr><td style="padding:34px 44px 42px">${sectionTitle('06','FOCO DE GESTIÓN','Prioridades para el siguiente ciclo','Acciones directas derivadas del cierre y del embudo operacional.')}<table width="100%" role="presentation" cellpadding="0" cellspacing="0"><tr><td width="26" valign="top" style="padding:12px 0;font:700 18px Calibri,Arial,sans-serif;color:${BRAND.primarySoft}">01</td><td style="padding:12px 0;border-bottom:1px solid ${BRAND.border};font:12px/18px Calibri,Arial,sans-serif;color:${BRAND.foreground}">Cerrar la brecha del acumulado con seguimiento semanal del pipeline avanzado.</td></tr><tr><td valign="top" style="padding:12px 0;font:700 18px Calibri,Arial,sans-serif;color:${BRAND.primarySoft}">02</td><td style="padding:12px 0;border-bottom:1px solid ${BRAND.border};font:12px/18px Calibri,Arial,sans-serif;color:${BRAND.foreground}">Medir el cumplimiento real de los estándares de contacto por tipo de propiedad.</td></tr><tr><td valign="top" style="padding:12px 0;font:700 18px Calibri,Arial,sans-serif;color:${BRAND.primarySoft}">03</td><td style="padding:12px 0;font:12px/18px Calibri,Arial,sans-serif;color:${BRAND.foreground}">Gestionar conversión por etapa y no solo el resultado final de cierres.</td></tr></table></td></tr>
  <tr><td style="padding:22px 44px;background:${BRAND.background};border-top:1px solid ${BRAND.border}"><div style="font:9px/15px Calibri,Arial,sans-serif;color:${BRAND.muted};text-align:center;letter-spacing:.4px">N3URALIA INTELLIGENCE PLATFORM · PROPERTY PARTNERS VITACURA · INFORMACIÓN CONFIDENCIAL</div></td></tr>
</table></td></tr></table></body></html>`
}
