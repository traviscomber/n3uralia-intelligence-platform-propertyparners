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
const BG = rgb(0.984, 0.984, 0.980) // #fbfbfa
const INK = rgb(0.090, 0.212, 0.204) // #173634
const TEAL = rgb(0.561, 0.698, 0.667) // #8fb2aa
const TAN = rgb(0.722, 0.604, 0.494) // #b89a7e
const MUTED = rgb(0.333, 0.353, 0.337) // #555a56
const LINE = rgb(0.847, 0.898, 0.886) // #d8e5e2
const WHITE = rgb(1, 1, 1)
const WARN = rgb(0.78, 0.48, 0.12)

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

  function pageBase(page: PDFPage, indexLabel?: string) {
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: BG })
    page.drawText('PROPERTY PARTNERS', { x: M, y: 806, size: 8.5, font: bold, color: TEAL })
    page.drawText('N3uralia Intelligence', { x: W - M - 92, y: 806, size: 7.5, font: regular, color: MUTED })
    page.drawLine({ start: { x: M, y: 792 }, end: { x: W - M, y: 792 }, thickness: 0.8, color: LINE })
    if (indexLabel) page.drawText(indexLabel, { x: W - M - 18, y: 24, size: 7, font: regular, color: MUTED })
  }
  function drawWrapped(page: PDFPage, value: string, x: number, y: number, width: number, options: { size?: number; font?: PDFFont; color?: Color; leading?: number } = {}) {
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
  function sectionLabel(page: PDFPage, label: string, y: number) {
    page.drawText(label.toUpperCase(), { x: M, y, size: 8, font: bold, color: TEAL })
    return y - 24
  }
  function metricCard(page: PDFPage, x: number, y: number, width: number, label: string, value: string, tone: Color = INK, sub?: string) {
    page.drawRectangle({ x, y, width, height: 78, color: WHITE, borderColor: LINE, borderWidth: 0.8 })
    page.drawText(label.toUpperCase(), { x: x + 14, y: y + 56, size: 7.5, font: bold, color: MUTED })
    page.drawText(value, { x: x + 14, y: y + 27, size: 20, font: bold, color: tone })
    if (sub) page.drawText(sub, { x: x + 14, y: y + 11, size: 7.5, font: regular, color: MUTED })
  }
  function statusPill(page: PDFPage, x: number, y: number, label: string, positive: boolean) {
    const fill = positive ? TEAL : rgb(0.96, 0.91, 0.83)
    const ink = positive ? WHITE : WARN
    const width = Math.max(74, bold.widthOfTextAtSize(label, 7.5) + 20)
    page.drawRectangle({ x, y, width, height: 22, color: fill })
    page.drawText(label, { x: x + 10, y: y + 7, size: 7.5, font: bold, color: ink })
    return width
  }
  function horizontalBar(page: PDFPage, x: number, y: number, width: number, label: string, value: number | null, max: number, color: Color) {
    page.drawText(label, { x, y: y + 14, size: 8.5, font: bold, color: INK })
    page.drawText(value == null ? 'n/d' : value.toLocaleString('es-CL', { maximumFractionDigits: 1 }), { x: x + width - 36, y: y + 14, size: 8.5, font: bold, color: INK })
    page.drawRectangle({ x, y, width, height: 7, color: LINE })
    if (value != null && max > 0) page.drawRectangle({ x, y, width: Math.max(2, width * Math.min(1, value / max)), height: 7, color })
  }

  // PAGE 1 - executive overview
  const p1 = pdf.addPage([W, H])
  p1.drawRectangle({ x: 0, y: 0, width: W, height: H, color: BG })
  p1.drawRectangle({ x: 0, y: 574, width: W, height: 268, color: INK })
  p1.drawRectangle({ x: 0, y: 574, width: 10, height: 268, color: TEAL })
  p1.drawText('PROPERTY PARTNERS', { x: M, y: 790, size: 9, font: bold, color: TEAL })
  p1.drawText(reportTypeLabel(report.report_type), { x: M, y: 730, size: 31, font: bold, color: WHITE })
  p1.drawText(period, { x: M, y: 692, size: 17, font: bold, color: rgb(0.86, 0.92, 0.90) })
  drawWrapped(p1, 'Lectura ejecutiva basada exclusivamente en el snapshot canónico persistido. Los datos no disponibles o no aprobados permanecen explícitamente bloqueados.', M, 655, 430, { size: 9.5, color: rgb(0.80, 0.86, 0.84), leading: 13 })
  p1.drawText(`ID ${report.id}`, { x: M, y: 595, size: 7.2, font: regular, color: rgb(0.66, 0.74, 0.72) })

  p1.drawText('RESUMEN EJECUTIVO', { x: M, y: 538, size: 8, font: bold, color: TEAL })
  const gap = 10
  const cardW = (W - (M * 2) - (gap * 2)) / 3
  metricCard(p1, M, 438, cardW, 'Cartera', format(company.cartera), INK, 'propiedades activas')
  metricCard(p1, M + cardW + gap, 438, cardW, 'Captaciones', format(company.captaciones), INK, 'del período')
  metricCard(p1, M + (cardW + gap) * 2, 438, cardW, 'Leads nuevos', format(company.leadsNuevos), INK, 'actividad comercial')
  metricCard(p1, M, 348, cardW, 'Cierres', format(company.cierresAcreditados), TEAL, 'acreditados')
  metricCard(p1, M + cardW + gap, 348, cardW, 'Volumen', format(company.volumenUfBruto, ' UF'), TAN, 'acreditado')
  metricCard(p1, M + (cardW + gap) * 2, 348, cardW, 'Cumplimiento visitas', format(company.cumplimientoVisitas, '%'), INK, 'realizadas / agendadas')

  p1.drawText('ESTADO DEL REPORTE', { x: M, y: 307, size: 8, font: bold, color: TEAL })
  const operational = completeness.operationalReportReady === true
  const fullScore = completeness.fullManagementScoreReady === true
  let pillX = M
  pillX += statusPill(p1, pillX, 267, operational ? 'OPERACIONAL LISTO' : 'OPERACIONAL NO LISTO', operational) + 8
  statusPill(p1, pillX, 267, fullScore ? 'SCORE INTEGRAL LISTO' : 'SCORE INTEGRAL BLOQUEADO', fullScore)
  drawWrapped(p1, fullScore ? 'El score integral del período está evaluable con definiciones aprobadas.' : `${blocked.length} dimensiones permanecen bloqueadas por falta de definición o evidencia aprobada. El reporte operativo sí puede utilizarse.`, M, 235, W - M * 2, { size: 9, color: MUTED, leading: 13 })

  p1.drawLine({ start: { x: M, y: 154 }, end: { x: W - M, y: 154 }, thickness: 0.8, color: LINE })
  p1.drawText('ACTIVIDAD DEL PERÍODO', { x: M, y: 132, size: 8, font: bold, color: TEAL })
  p1.drawText(`Requerimientos ${format(company.requerimientos)}  ·  Visitas agendadas ${format(company.visitasAgendadas)}  ·  Visitas realizadas ${format(company.visitasRealizadas)}  ·  Suspendidas ${format(company.suspendidas)}`, { x: M, y: 106, size: 9.3, font: bold, color: INK })
  p1.drawText('Documento ejecutivo · datos canónicos · sin proyecciones ni relleno de faltantes', { x: M, y: 57, size: 7.5, font: regular, color: MUTED })
  p1.drawText('1/3', { x: W - M - 18, y: 24, size: 7, font: regular, color: MUTED })

  // PAGE 2 - performance / visual analysis
  const p2 = pdf.addPage([W, H])
  pageBase(p2, '2/3')
  p2.drawText('Actividad comercial', { x: M, y: 748, size: 24, font: bold, color: INK })
  p2.drawText('Una lectura visual del mes, sin sustituir los valores canónicos del snapshot.', { x: M, y: 724, size: 9, font: regular, color: MUTED })

  let y = sectionLabel(p2, 'Volumen de actividad', 680)
  const activity = [
    ['Captaciones', numeric(company.captaciones), TEAL],
    ['Leads nuevos', numeric(company.leadsNuevos), INK],
    ['Requerimientos', numeric(company.requerimientos), TAN],
    ['Visitas agendadas', numeric(company.visitasAgendadas), TEAL],
    ['Visitas realizadas', numeric(company.visitasRealizadas), INK],
  ] as const
  const max = Math.max(1, ...activity.map(item => item[1] ?? 0))
  for (const [label, value, color] of activity) {
    horizontalBar(p2, M, y - 8, 390, label, value, max, color)
    y -= 58
  }

  p2.drawRectangle({ x: 448, y: 420, width: 105, height: 202, color: WHITE, borderColor: LINE, borderWidth: 0.8 })
  p2.drawText('CONVERSIÓN', { x: 462, y: 595, size: 7.5, font: bold, color: MUTED })
  p2.drawText(format(company.cumplimientoVisitas, '%'), { x: 462, y: 558, size: 24, font: bold, color: TEAL })
  drawWrapped(p2, 'Visitas realizadas sobre visitas agendadas.', 462, 532, 76, { size: 8, color: MUTED, leading: 11 })
  p2.drawLine({ start: { x: 462, y: 488 }, end: { x: 539, y: 488 }, thickness: 0.7, color: LINE })
  p2.drawText('CIERRES', { x: 462, y: 466, size: 7.5, font: bold, color: MUTED })
  p2.drawText(format(company.cierresAcreditados), { x: 462, y: 433, size: 23, font: bold, color: INK })

  y = 350
  p2.drawText('Cobertura y disponibilidad', { x: M, y, size: 16, font: bold, color: INK })
  y -= 28
  const avail = [
    ['Desglose por oficina', offices.length > 0 ? `${offices.length} oficinas` : 'No disponible'],
    ['Serie de visitas', company.visitasAgendadas != null || company.visitasRealizadas != null ? 'Disponible' : 'No disponible'],
    ['Score integral', fullScore ? 'Evaluable' : 'Bloqueado'],
    ['Reporte operacional', operational ? 'Listo' : 'No listo'],
  ]
  for (let i = 0; i < avail.length; i++) {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = M + col * 258
    const yy = y - row * 74
    p2.drawRectangle({ x, y: yy - 48, width: 246, height: 56, color: WHITE, borderColor: LINE, borderWidth: 0.7 })
    p2.drawText(avail[i][0].toUpperCase(), { x: x + 12, y: yy - 12, size: 7.2, font: bold, color: MUTED })
    p2.drawText(avail[i][1], { x: x + 12, y: yy - 34, size: 11, font: bold, color: i === 2 && !fullScore ? WARN : INK })
  }

  p2.drawText('Lectura ejecutiva', { x: M, y: 142, size: 16, font: bold, color: INK })
  const visitText = company.visitasAgendadas == null || company.visitasRealizadas == null
    ? 'No existe una serie canónica completa de visitas para este período; el informe mantiene la ausencia como n/d.'
    : `Se registran ${format(company.visitasAgendadas)} visitas agendadas y ${format(company.visitasRealizadas)} realizadas, equivalentes a ${format(company.cumplimientoVisitas, '%')} de cumplimiento.`
  drawWrapped(p2, visitText, M, 116, W - M * 2, { size: 9.2, color: MUTED, leading: 13 })

  // PAGE 3 - evidence, gaps, methodology
  const p3 = pdf.addPage([W, H])
  pageBase(p3, '3/3')
  p3.drawText('Evidencia y calidad', { x: M, y: 748, size: 24, font: bold, color: INK })
  p3.drawText('Trazabilidad, límites y criterios para interpretar correctamente el informe.', { x: M, y: 724, size: 9, font: regular, color: MUTED })

  y = sectionLabel(p3, 'Dimensiones bloqueadas', 680)
  if (!blocked.length) {
    drawWrapped(p3, 'No hay dimensiones bloqueadas registradas en el snapshot.', M, y, W - M * 2, { size: 9, color: MUTED })
    y -= 34
  } else {
    for (const block of blocked.slice(0, 9)) {
      const code = text(block.code, 'dimensión')
      const reason = text(block.reason, 'Pendiente de definición o evidencia aprobada.')
      p3.drawRectangle({ x: M, y: y - 42, width: W - M * 2, height: 48, color: WHITE, borderColor: LINE, borderWidth: 0.6 })
      p3.drawText(code.replace(/_/g, ' ').toUpperCase(), { x: M + 12, y: y - 13, size: 7.2, font: bold, color: WARN })
      drawWrapped(p3, reason, M + 12, y - 27, W - M * 2 - 24, { size: 7.8, color: MUTED, leading: 10 })
      y -= 58
      if (y < 350) break
    }
  }

  const notesStart = Math.min(y - 10, 330)
  p3.drawText('Notas de calidad y reconciliación', { x: M, y: notesStart, size: 15, font: bold, color: INK })
  y = notesStart - 26
  for (const note of notes.slice(0, 7)) {
    p3.drawCircle({ x: M + 3, y: y + 4, size: 2.2, color: TEAL })
    y = drawWrapped(p3, note, M + 14, y + 7, W - M * 2 - 14, { size: 7.9, color: MUTED, leading: 10.5 }) - 5
    if (y < 152) break
  }

  p3.drawLine({ start: { x: M, y: 128 }, end: { x: W - M, y: 128 }, thickness: 0.8, color: LINE })
  p3.drawText('FUENTES CANÓNICAS', { x: M, y: 108, size: 7.5, font: bold, color: TEAL })
  const sourceText = sources.length ? sources.join(' · ') : 'Snapshot persistido del sistema de control de gestión.'
  drawWrapped(p3, sourceText, M, 91, W - M * 2, { size: 6.7, color: MUTED, leading: 9 })
  p3.drawText('Metodología: documento generado exclusivamente desde el snapshot persistido. No incorpora proyecciones ni datos externos.', { x: M, y: 42, size: 6.7, font: regular, color: MUTED })

  const bytes = await pdf.save()
  return {
    bytes,
    filename: `${filenamePart(reportTypeLabel(report.report_type))}-${report.period_start}-${report.period_end}.pdf`,
  }
}
