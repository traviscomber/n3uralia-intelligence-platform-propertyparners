import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'

export type ManagementReportRecord = {
  id: string
  report_type: string
  period_start: string
  period_end: string
  generated_at?: string | null
  snapshot: Record<string, unknown>
}

type Color = ReturnType<typeof rgb>

const W = 595.28
const H = 841.89
const M = 42

// Property Partners corporate system from app/globals.css
const PP_BLACK = rgb(5 / 255, 8 / 255, 7 / 255) // #050807
const PP_SURFACE = rgb(12 / 255, 17 / 255, 17 / 255) // #0c1111
const PP_RED = rgb(215 / 255, 51 / 255, 43 / 255) // #d7332b
const PP_RED_SOFT = rgb(255 / 255, 118 / 255, 111 / 255) // #ff766f
const PP_TEXT = rgb(237 / 255, 244 / 255, 243 / 255) // #edf4f3
const PP_MUTED_DARK = rgb(182 / 255, 193 / 255, 191 / 255) // #b6c1bf
const PAPER = rgb(1, 1, 1)
const PAPER_SOFT = rgb(247 / 255, 248 / 255, 248 / 255)
const INK = rgb(17 / 255, 24 / 255, 39 / 255)
const MUTED = rgb(75 / 255, 85 / 255, 99 / 255)
const LINE = rgb(224 / 255, 226 / 255, 228 / 255)
const WARNING = rgb(180 / 255, 95 / 255, 20 / 255)

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : [] }
function text(value: unknown, fallback = '') {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  return fallback
}
function numeric(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}
function format(value: unknown, suffix = '') {
  const n = numeric(value)
  return n == null ? 'n/d' : `${n.toLocaleString('es-CL', { maximumFractionDigits: 2 })}${suffix}`
}
function filenamePart(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}
function reportTypeLabel(reportType: string) {
  const labels: Record<string, string> = { executive: 'Reporte ejecutivo', office: 'Reporte de oficina', partner: 'Reporte individual', monthly: 'Reporte mensual', cumulative: 'Reporte acumulado' }
  return labels[reportType] ?? 'Reporte de gestión'
}
function wrap(font: PDFFont, value: string, size: number, maxWidth: number) {
  const out: string[] = []
  for (const paragraph of String(value || '').split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (!words.length) { out.push(''); continue }
    let line = words.shift() ?? ''
    for (const word of words) {
      const candidate = `${line} ${word}`
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate
      else { out.push(line); line = word }
    }
    out.push(line)
  }
  return out
}
function monthName(dateValue: string) {
  const [year, month] = dateValue.split('-').map(Number)
  const names = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  return `${names[Math.max(0, month - 1)] ?? month} ${year}`
}

export async function buildManagementReportPdf(report: ManagementReportRecord) {
  const pdf = await PDFDocument.create()
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const snapshot = record(report.snapshot) ?? {}
  const company = record(snapshot.company) ?? {}
  const completeness = record(snapshot.completeness) ?? {}
  const blocked = array(completeness.blocked).map(record).filter((item): item is Record<string, unknown> => Boolean(item))
  const notes = array(snapshot.qualityNotes ?? snapshot.quality_notes).map(item => text(item)).filter(Boolean)
  const provenance = record(snapshot.provenance) ?? {}
  const sources = array(provenance.sourceFiles).map(item => text(item)).filter(Boolean)
  const offices = array(snapshot.offices)
  const periodRecord = record(snapshot.period)
  const period = periodRecord ? text(periodRecord.label, monthName(report.period_start)) : text(snapshot.period, monthName(report.period_start))
  const operational = completeness.operationalReportReady === true
  const fullScore = completeness.fullManagementScoreReady === true

  function wrapped(page: PDFPage, value: string, x: number, y: number, width: number, options: { size?: number; font?: PDFFont; color?: Color; leading?: number } = {}) {
    const size = options.size ?? 9
    const font = options.font ?? regular
    const leading = options.leading ?? size + 3
    let yy = y
    for (const line of wrap(font, value, size, width)) {
      page.drawText(line, { x, y: yy, size, font, color: options.color ?? INK })
      yy -= leading
    }
    return yy
  }
  function footer(page: PDFPage, number: string, dark = false) {
    page.drawText('Property Partners · powered by N3uralia Intelligence', { x: M, y: 24, size: 7, font: regular, color: dark ? PP_MUTED_DARK : MUTED })
    page.drawText(number, { x: W - M - 18, y: 24, size: 7, font: regular, color: dark ? PP_MUTED_DARK : MUTED })
  }
  function metricCard(page: PDFPage, x: number, y: number, width: number, label: string, value: string, highlight = false) {
    page.drawRectangle({ x, y, width, height: 76, color: PAPER, borderColor: LINE, borderWidth: 0.7 })
    page.drawRectangle({ x, y, width: 4, height: 76, color: highlight ? PP_RED : rgb(210 / 255, 214 / 255, 216 / 255) })
    page.drawText(label.toUpperCase(), { x: x + 14, y: y + 53, size: 7.2, font: bold, color: MUTED })
    page.drawText(value, { x: x + 14, y: y + 23, size: 20, font: bold, color: highlight ? PP_RED : INK })
  }
  function bar(page: PDFPage, x: number, y: number, width: number, label: string, value: number | null, max: number, highlight = false) {
    page.drawText(label, { x, y: y + 14, size: 8.5, font: bold, color: INK })
    page.drawText(value == null ? 'n/d' : value.toLocaleString('es-CL', { maximumFractionDigits: 1 }), { x: x + width - 36, y: y + 14, size: 8.5, font: bold, color: INK })
    page.drawRectangle({ x, y, width, height: 7, color: LINE })
    if (value != null && max > 0) page.drawRectangle({ x, y, width: Math.max(2, width * Math.min(1, value / max)), height: 7, color: highlight ? PP_RED : PP_SURFACE })
  }

  // PAGE 1 - executive cover and KPI summary
  const p1 = pdf.addPage([W, H])
  p1.drawRectangle({ x: 0, y: 0, width: W, height: H, color: PAPER_SOFT })
  p1.drawRectangle({ x: 0, y: 535, width: W, height: 307, color: PP_BLACK })
  p1.drawRectangle({ x: 0, y: 535, width: 12, height: 307, color: PP_RED })
  p1.drawText('PROPERTY PARTNERS', { x: M, y: 790, size: 10, font: bold, color: PP_RED_SOFT })
  p1.drawText(reportTypeLabel(report.report_type), { x: M, y: 720, size: 31, font: bold, color: PP_TEXT })
  p1.drawText(period, { x: M, y: 680, size: 18, font: bold, color: PP_TEXT })
  wrapped(p1, 'Informe ejecutivo mensual basado exclusivamente en evidencia canónica persistida. Las métricas no disponibles o no aprobadas permanecen explícitamente bloqueadas.', M, 640, 430, { size: 9.5, color: PP_MUTED_DARK, leading: 13 })
  p1.drawText(`ID ${report.id}`, { x: M, y: 566, size: 7.2, font: regular, color: PP_MUTED_DARK })

  p1.drawText('RESUMEN EJECUTIVO', { x: M, y: 500, size: 8, font: bold, color: PP_RED })
  const gap = 10
  const cw = (W - M * 2 - gap * 2) / 3
  metricCard(p1, M, 402, cw, 'Cartera', format(company.cartera))
  metricCard(p1, M + cw + gap, 402, cw, 'Captaciones', format(company.captaciones))
  metricCard(p1, M + (cw + gap) * 2, 402, cw, 'Leads nuevos', format(company.leadsNuevos))
  metricCard(p1, M, 314, cw, 'Cierres', format(company.cierresAcreditados), true)
  metricCard(p1, M + cw + gap, 314, cw, 'Volumen', format(company.volumenUfBruto, ' UF'), true)
  metricCard(p1, M + (cw + gap) * 2, 314, cw, 'Cumplimiento visitas', format(company.cumplimientoVisitas, '%'))

  p1.drawText('ESTADO DEL REPORTE', { x: M, y: 274, size: 8, font: bold, color: PP_RED })
  const statusText = operational ? 'OPERACIONAL LISTO' : 'OPERACIONAL NO LISTO'
  p1.drawRectangle({ x: M, y: 230, width: 130, height: 25, color: operational ? PP_SURFACE : PP_RED })
  p1.drawText(statusText, { x: M + 10, y: 238, size: 7.6, font: bold, color: PP_TEXT })
  p1.drawRectangle({ x: M + 140, y: 230, width: 162, height: 25, color: fullScore ? PP_SURFACE : rgb(244 / 255, 228 / 255, 226 / 255) })
  p1.drawText(fullScore ? 'SCORE INTEGRAL LISTO' : 'SCORE INTEGRAL BLOQUEADO', { x: M + 150, y: 238, size: 7.6, font: bold, color: fullScore ? PP_TEXT : PP_RED })
  wrapped(p1, fullScore ? 'El score integral es evaluable bajo las definiciones aprobadas.' : `${blocked.length} dimensiones siguen bloqueadas por falta de definición o evidencia aprobada. El reporte operativo sí puede utilizarse.`, M, 199, W - M * 2, { size: 9, color: MUTED, leading: 13 })

  p1.drawLine({ start: { x: M, y: 132 }, end: { x: W - M, y: 132 }, thickness: 0.8, color: LINE })
  p1.drawText('ACTIVIDAD DEL PERÍODO', { x: M, y: 110, size: 8, font: bold, color: PP_RED })
  p1.drawText(`Requerimientos ${format(company.requerimientos)}  ·  Visitas agendadas ${format(company.visitasAgendadas)}  ·  Visitas realizadas ${format(company.visitasRealizadas)}  ·  Suspendidas ${format(company.suspendidas)}`, { x: M, y: 84, size: 9.1, font: bold, color: INK })
  footer(p1, '1/3')

  // PAGE 2 - visual performance
  const p2 = pdf.addPage([W, H])
  p2.drawRectangle({ x: 0, y: 0, width: W, height: H, color: PAPER })
  p2.drawRectangle({ x: 0, y: 774, width: W, height: 68, color: PP_BLACK })
  p2.drawText('PROPERTY PARTNERS', { x: M, y: 804, size: 8.5, font: bold, color: PP_RED_SOFT })
  p2.drawText('Actividad comercial', { x: M, y: 730, size: 25, font: bold, color: INK })
  p2.drawText('Lectura visual del período seleccionado.', { x: M, y: 706, size: 9, font: regular, color: MUTED })
  p2.drawText('VOLUMEN DE ACTIVIDAD', { x: M, y: 665, size: 8, font: bold, color: PP_RED })
  const activity = [
    ['Captaciones', numeric(company.captaciones), false],
    ['Leads nuevos', numeric(company.leadsNuevos), true],
    ['Requerimientos', numeric(company.requerimientos), false],
    ['Visitas agendadas', numeric(company.visitasAgendadas), false],
    ['Visitas realizadas', numeric(company.visitasRealizadas), true],
  ] as const
  const max = Math.max(1, ...activity.map(item => item[1] ?? 0))
  let y = 618
  for (const [label, value, highlight] of activity) {
    bar(p2, M, y, 390, label, value, max, highlight)
    y -= 58
  }
  p2.drawRectangle({ x: 448, y: 410, width: 105, height: 205, color: PP_SURFACE })
  p2.drawText('CONVERSIÓN', { x: 462, y: 588, size: 7.5, font: bold, color: PP_MUTED_DARK })
  p2.drawText(format(company.cumplimientoVisitas, '%'), { x: 462, y: 550, size: 23, font: bold, color: PP_RED_SOFT })
  wrapped(p2, 'Visitas realizadas sobre visitas agendadas.', 462, 524, 76, { size: 8, color: PP_MUTED_DARK, leading: 11 })
  p2.drawLine({ start: { x: 462, y: 482 }, end: { x: 539, y: 482 }, thickness: 0.7, color: rgb(55 / 255, 62 / 255, 62 / 255) })
  p2.drawText('CIERRES', { x: 462, y: 458, size: 7.5, font: bold, color: PP_MUTED_DARK })
  p2.drawText(format(company.cierresAcreditados), { x: 462, y: 426, size: 23, font: bold, color: PP_TEXT })

  p2.drawText('COBERTURA Y DISPONIBILIDAD', { x: M, y: 330, size: 8, font: bold, color: PP_RED })
  const availability = [
    ['Desglose por oficina', offices.length > 0 ? `${offices.length} oficinas` : 'No disponible'],
    ['Serie de visitas', company.visitasAgendadas != null || company.visitasRealizadas != null ? 'Disponible' : 'No disponible'],
    ['Score integral', fullScore ? 'Evaluable' : 'Bloqueado'],
    ['Reporte operacional', operational ? 'Listo' : 'No listo'],
  ]
  for (let i = 0; i < availability.length; i++) {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = M + col * 258
    const yy = 292 - row * 76
    p2.drawRectangle({ x, y: yy - 48, width: 246, height: 56, color: PAPER_SOFT, borderColor: LINE, borderWidth: 0.6 })
    p2.drawText(availability[i][0].toUpperCase(), { x: x + 12, y: yy - 12, size: 7.2, font: bold, color: MUTED })
    p2.drawText(availability[i][1], { x: x + 12, y: yy - 34, size: 11, font: bold, color: i === 2 && !fullScore ? PP_RED : INK })
  }
  p2.drawText('LECTURA EJECUTIVA', { x: M, y: 114, size: 8, font: bold, color: PP_RED })
  const visitText = company.visitasAgendadas == null || company.visitasRealizadas == null
    ? 'No existe una serie canónica completa de visitas para este período; el informe mantiene la ausencia como n/d.'
    : `Se registran ${format(company.visitasAgendadas)} visitas agendadas y ${format(company.visitasRealizadas)} realizadas, equivalentes a ${format(company.cumplimientoVisitas, '%')} de cumplimiento.`
  wrapped(p2, visitText, M, 91, W - M * 2, { size: 9.2, color: MUTED, leading: 13 })
  footer(p2, '2/3')

  // PAGE 3 - evidence and quality
  const p3 = pdf.addPage([W, H])
  p3.drawRectangle({ x: 0, y: 0, width: W, height: H, color: PAPER })
  p3.drawRectangle({ x: 0, y: 774, width: W, height: 68, color: PP_BLACK })
  p3.drawText('PROPERTY PARTNERS', { x: M, y: 804, size: 8.5, font: bold, color: PP_RED_SOFT })
  p3.drawText('Evidencia y calidad', { x: M, y: 730, size: 25, font: bold, color: INK })
  p3.drawText('Trazabilidad, límites y criterios de interpretación.', { x: M, y: 706, size: 9, font: regular, color: MUTED })
  p3.drawText('DIMENSIONES BLOQUEADAS', { x: M, y: 665, size: 8, font: bold, color: PP_RED })
  y = 632
  if (!blocked.length) {
    wrapped(p3, 'No hay dimensiones bloqueadas registradas en el snapshot.', M, y, W - M * 2, { size: 9, color: MUTED })
    y -= 40
  } else {
    for (const block of blocked.slice(0, 7)) {
      const code = text(block.code, 'dimensión')
      const reason = text(block.reason, 'Pendiente de definición o evidencia aprobada.')
      p3.drawRectangle({ x: M, y: y - 42, width: W - M * 2, height: 48, color: PAPER_SOFT, borderColor: LINE, borderWidth: 0.6 })
      p3.drawRectangle({ x: M, y: y - 42, width: 4, height: 48, color: PP_RED })
      p3.drawText(code.replace(/_/g, ' ').toUpperCase(), { x: M + 14, y: y - 13, size: 7.1, font: bold, color: PP_RED })
      wrapped(p3, reason, M + 14, y - 27, W - M * 2 - 26, { size: 7.8, color: MUTED, leading: 10 })
      y -= 58
      if (y < 325) break
    }
  }
  const notesStart = Math.min(y - 8, 300)
  p3.drawText('NOTAS DE CALIDAD Y RECONCILIACIÓN', { x: M, y: notesStart, size: 8, font: bold, color: PP_RED })
  y = notesStart - 24
  for (const note of notes.slice(0, 6)) {
    p3.drawCircle({ x: M + 3, y: y + 4, size: 2.2, color: PP_RED })
    y = wrapped(p3, note, M + 14, y + 7, W - M * 2 - 14, { size: 7.9, color: MUTED, leading: 10.5 }) - 5
    if (y < 145) break
  }
  p3.drawLine({ start: { x: M, y: 122 }, end: { x: W - M, y: 122 }, thickness: 0.8, color: LINE })
  p3.drawText('FUENTES CANÓNICAS', { x: M, y: 103, size: 7.5, font: bold, color: PP_RED })
  const sourceText = sources.length ? sources.join(' · ') : 'Snapshot persistido del sistema de control de gestión.'
  wrapped(p3, sourceText, M, 86, W - M * 2, { size: 6.7, color: MUTED, leading: 9 })
  footer(p3, '3/3')

  const bytes = await pdf.save()
  return { bytes, filename: `${filenamePart(reportTypeLabel(report.report_type))}-${report.period_start}-${report.period_end}.pdf` }
}
