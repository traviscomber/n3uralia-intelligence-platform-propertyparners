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

type MetricCard = {
  label: string
  value: string
  accent?: boolean
}

const W = 595.28
const H = 841.89
const M = 30
const GAP = 8

const PP_BLACK = rgb(5 / 255, 8 / 255, 7 / 255)
const PP_SURFACE = rgb(12 / 255, 17 / 255, 17 / 255)
const PP_SURFACE_2 = rgb(20 / 255, 27 / 255, 27 / 255)
const PP_RED = rgb(215 / 255, 51 / 255, 43 / 255)
const PP_RED_SOFT = rgb(255 / 255, 118 / 255, 111 / 255)
const PP_TEXT = rgb(237 / 255, 244 / 255, 243 / 255)
const PP_MUTED = rgb(182 / 255, 193 / 255, 191 / 255)
const PP_LINE = rgb(45 / 255, 57 / 255, 56 / 255)
const PAPER = rgb(250 / 255, 250 / 255, 249 / 255)
const PAPER_LINE = rgb(222 / 255, 225 / 255, 224 / 255)
const INK = rgb(25 / 255, 28 / 255, 29 / 255)
const MUTED = rgb(91 / 255, 99 / 255, 99 / 255)
const WARN_BG = rgb(45 / 255, 18 / 255, 17 / 255)

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function text(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  return fallback
}

function numeric(value: unknown): number | null {
  if (value == null || value === '') return null
  const result = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(result) ? result : null
}

function format(value: unknown, suffix = ''): string {
  const result = numeric(value)
  if (result == null) return 'n/d'
  return `${result.toLocaleString('es-CL', { maximumFractionDigits: 2 })}${suffix}`
}

function percent(numerator: unknown, denominator: unknown): string {
  const a = numeric(numerator)
  const b = numeric(denominator)
  if (a == null || b == null || b === 0) return 'n/d'
  return `${((a / b) * 100).toLocaleString('es-CL', { maximumFractionDigits: 2 })}%`
}

function filenamePart(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function reportTypeLabel(reportType: string) {
  const labels: Record<string, string> = {
    management: 'Reporte de gestión',
    executive: 'Reporte ejecutivo',
    director: 'Reporte de dirección',
    office: 'Reporte de oficina',
    partner: 'Reporte individual',
    monthly: 'Reporte mensual',
    cumulative: 'Reporte acumulado',
  }
  return labels[reportType] ?? 'Reporte de gestión'
}

function monthName(dateValue: string) {
  const [year, month] = dateValue.split('-').map(Number)
  const names = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${names[Math.max(0, month - 1)] ?? month} ${year}`
}

function wrap(font: PDFFont, value: string, size: number, maxWidth: number) {
  const out: string[] = []
  for (const paragraph of String(value || '').split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (!words.length) {
      out.push('')
      continue
    }
    let line = words.shift() ?? ''
    for (const word of words) {
      const candidate = `${line} ${word}`
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate
      else {
        out.push(line)
        line = word
      }
    }
    out.push(line)
  }
  return out
}

function blockerLabel(code: string) {
  const labels: Record<string, string> = {
    goal_compliance: 'Cumplimiento de meta',
    canonical_portfolio_score: 'Score de cartera',
    canonical_conversion_score: 'Score de conversión',
    canonical_management_score: 'Score integral de gestión',
    office_breakdown: 'Desglose por oficina',
    active_leads_followup: 'Leads activos / seguimiento',
    month_over_month: 'Comparación mensual',
    visits: 'Serie de visitas',
  }
  return labels[code] ?? code.replace(/_/g, ' ')
}

export async function buildManagementReportPdf(report: ManagementReportRecord) {
  const pdf = await PDFDocument.create()
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const serif = await pdf.embedFont(StandardFonts.TimesRoman)
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold)

  const snapshot = record(report.snapshot) ?? {}
  const company = record(snapshot.company) ?? {}
  const completeness = record(snapshot.completeness) ?? {}
  const provenance = record(snapshot.provenance) ?? {}
  const blocked = array(completeness.blocked)
    .map(record)
    .filter((value): value is Record<string, unknown> => Boolean(value))
  const notes = array(snapshot.qualityNotes ?? snapshot.quality_notes)
    .map((value) => text(value))
    .filter(Boolean)
  const sources = array(provenance.sourceFiles)
    .map((value) => text(value))
    .filter(Boolean)
  const periodRecord = record(snapshot.period)
  const period = periodRecord
    ? text(periodRecord.label, monthName(report.period_start))
    : text(snapshot.period, monthName(report.period_start))
  const operational = completeness.operationalReportReady === true
  const fullScore = completeness.fullManagementScoreReady === true

  const generatedAt = text(snapshot.generatedAt, report.generated_at ?? '')

  const metrics: MetricCard[] = [
    { label: 'Cartera activa', value: format(company.cartera) },
    { label: 'Captaciones', value: format(company.captaciones) },
    { label: 'Leads nuevos', value: format(company.leadsNuevos) },
    { label: 'Requerimientos online', value: format(company.requerimientos) },
    { label: 'Visitas agendadas', value: format(company.visitasAgendadas) },
    { label: 'Visitas realizadas', value: format(company.visitasRealizadas) },
    { label: 'Cumplimiento de visitas', value: format(company.cumplimientoVisitas, '%') },
    { label: 'Cierres acreditados', value: format(company.cierresAcreditados), accent: true },
    { label: 'Volumen acreditado', value: format(company.volumenUfBruto, ' UF'), accent: true },
    { label: 'Propiedades suspendidas', value: format(company.suspendidas) },
  ]

  function drawWrapped(
    page: PDFPage,
    value: string,
    x: number,
    y: number,
    width: number,
    options: { size?: number; font?: PDFFont; color?: Color; leading?: number; maxLines?: number } = {},
  ) {
    const size = options.size ?? 9
    const font = options.font ?? regular
    const leading = options.leading ?? size + 3
    const lines = wrap(font, value, size, width)
    const visible = options.maxLines ? lines.slice(0, options.maxLines) : lines
    let yy = y
    for (const line of visible) {
      page.drawText(line, { x, y: yy, size, font, color: options.color ?? PP_TEXT })
      yy -= leading
    }
    return yy
  }

  function darkPage(page: PDFPage) {
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: PP_BLACK })
  }

  function footer(page: PDFPage, pageNumber: string, dark = true) {
    const color = dark ? PP_MUTED : MUTED
    page.drawLine({ start: { x: M, y: 40 }, end: { x: W - M, y: 40 }, thickness: 0.5, color: dark ? PP_LINE : PAPER_LINE })
    page.drawText('Property Partners', { x: M, y: 23, size: 7, font: bold, color: dark ? PP_TEXT : INK })
    page.drawText(' · powered by N3uralia Intelligence', { x: M + 58, y: 23, size: 7, font: regular, color })
    page.drawText(pageNumber, { x: W - M - 18, y: 23, size: 7, font: bold, color: dark ? PP_TEXT : INK })
  }

  function ppMark(page: PDFPage, x: number, y: number, size: number) {
    page.drawText('P', { x, y, size, font: serifBold, color: PP_RED_SOFT })
  }

  function decorativeBuilding(page: PDFPage, x: number, y: number, width: number, height: number) {
    const c1 = rgb(22 / 255, 28 / 255, 28 / 255)
    const c2 = rgb(37 / 255, 42 / 255, 42 / 255)
    page.drawLine({ start: { x, y }, end: { x: x + width * 0.55, y: y + height }, thickness: 1.1, color: c2 })
    page.drawLine({ start: { x: x + width, y }, end: { x: x + width * 0.55, y: y + height }, thickness: 1.1, color: c2 })
    page.drawLine({ start: { x: x + width * 0.22, y }, end: { x: x + width * 0.55, y: y + height * 0.72 }, thickness: 0.9, color: c1 })
    page.drawLine({ start: { x: x + width * 0.78, y }, end: { x: x + width * 0.55, y: y + height * 0.72 }, thickness: 0.9, color: c1 })
    for (let i = 1; i < 5; i++) {
      page.drawLine({ start: { x: x + (width * i) / 5, y }, end: { x: x + width * 0.55, y: y + height }, thickness: 0.35, color: PP_LINE })
    }
  }

  function statusChip(page: PDFPage, x: number, y: number, width: number, label: string, active: boolean) {
    page.drawRectangle({ x, y, width, height: 28, color: active ? PP_SURFACE_2 : WARN_BG, borderColor: PP_RED, borderWidth: 0.7 })
    page.drawCircle({ x: x + 15, y: y + 14, size: 5.2, color: PP_RED })
    page.drawText(active ? '✓' : '!', { x: x + 12.2, y: y + 10.2, size: 7.5, font: bold, color: PP_TEXT })
    page.drawText(label, { x: x + 28, y: y + 9, size: 7.5, font: bold, color: PP_TEXT })
  }

  function darkMetricCard(page: PDFPage, x: number, y: number, width: number, height: number, metric: MetricCard) {
    page.drawRectangle({ x, y, width, height, color: PP_SURFACE_2, borderColor: PP_LINE, borderWidth: 0.55 })
    page.drawCircle({ x: x + width / 2, y: y + height - 24, size: 9, borderColor: PP_RED, borderWidth: 1.2 })
    page.drawCircle({ x: x + width / 2, y: y + height - 24, size: 2.2, color: PP_RED })
    drawWrapped(page, metric.label, x + 7, y + height - 44, width - 14, { size: 6.8, font: regular, color: PP_TEXT, leading: 8.4, maxLines: 2 })
    page.drawLine({ start: { x: x + width / 2 - 8, y: y + 31 }, end: { x: x + width / 2 + 8, y: y + 31 }, thickness: 1, color: PP_RED })
    const font = metric.accent ? serifBold : serif
    const size = metric.value.length > 10 ? 17 : metric.value.length > 7 ? 19 : 22
    const valueWidth = font.widthOfTextAtSize(metric.value, size)
    page.drawText(metric.value, { x: x + (width - valueWidth) / 2, y: y + 8, size, font, color: metric.accent ? PP_RED_SOFT : PP_TEXT })
  }

  function sectionCard(page: PDFPage, x: number, y: number, width: number, height: number) {
    page.drawRectangle({ x, y, width, height, color: PP_SURFACE, borderColor: PP_LINE, borderWidth: 0.65 })
  }

  // PAGE 1 — premium executive cover / KPI overview
  const p1 = pdf.addPage([W, H])
  darkPage(p1)
  decorativeBuilding(p1, 345, 590, 220, 220)
  p1.drawText('PROPERTY PARTNERS', { x: M, y: 801, size: 9, font: bold, color: PP_RED_SOFT })
  ppMark(p1, 520, 777, 42)
  p1.drawText(reportTypeLabel(report.report_type), { x: M, y: 741, size: 35, font: serif, color: PP_TEXT })
  p1.drawText(`Período: ${period}`, { x: M, y: 706, size: 12, font: regular, color: PP_TEXT })
  p1.drawLine({ start: { x: M, y: 684 }, end: { x: M + 22, y: 684 }, thickness: 1.5, color: PP_RED })
  statusChip(p1, M, 644, 138, operational ? 'Reporte operacional: LISTO' : 'Reporte operacional: NO LISTO', operational)
  statusChip(p1, M + 148, 644, 160, fullScore ? 'Score integral: LISTO' : 'Score integral: BLOQUEADO', fullScore)

  sectionCard(p1, 14, 357, W - 28, 267)
  const cardW = (W - 28 - 24 - (GAP * 4)) / 5
  const cardH = 112
  for (let i = 0; i < metrics.length; i++) {
    const row = Math.floor(i / 5)
    const col = i % 5
    const x = 26 + col * (cardW + GAP)
    const y = row === 0 ? 492 : 369
    darkMetricCard(p1, x, y, cardW, cardH, metrics[i])
  }

  p1.drawRectangle({ x: 14, y: 68, width: W - 28, height: 269, color: PAPER })
  p1.drawCircle({ x: 62, y: 265, size: 25, color: PP_SURFACE })
  p1.drawLine({ start: { x: 51, y: 256 }, end: { x: 60, y: 266 }, thickness: 1.7, color: PP_RED })
  p1.drawLine({ start: { x: 60, y: 266 }, end: { x: 70, y: 261 }, thickness: 1.7, color: PP_RED })
  p1.drawLine({ start: { x: 70, y: 261 }, end: { x: 78, y: 274 }, thickness: 1.7, color: PP_RED })
  p1.drawText('Resumen ejecutivo', { x: 105, y: 276, size: 19, font: serifBold, color: INK })
  p1.drawLine({ start: { x: 105, y: 263 }, end: { x: 124, y: 263 }, thickness: 1.2, color: PP_RED })
  const summary = `El período registra ${format(company.cierresAcreditados)} cierres acreditados y ${format(company.volumenUfBruto, ' UF')} de volumen. El reporte operacional está ${operational ? 'listo' : 'pendiente'} y consolida exclusivamente la evidencia canónica disponible.`
  drawWrapped(p1, summary, 105, 246, 430, { size: 9.5, font: regular, color: MUTED, leading: 13, maxLines: 4 })

  p1.drawRectangle({ x: 28, y: 113, width: W - 56, height: 83, color: rgb(1, 1, 1), borderColor: PAPER_LINE, borderWidth: 0.55 })
  p1.drawText('Procedencia de datos (fuentes canónicas)', { x: 44, y: 174, size: 9, font: bold, color: INK })
  p1.drawText('Leads   |   Captaciones   |   Visitas   |   Requerimientos online   |   Cierres   |   Cartera   |   Suspendidas', { x: 44, y: 151, size: 6.8, font: regular, color: MUTED })
  const generatedLabel = generatedAt ? `Generado: ${generatedAt}` : 'Snapshot persistido del sistema de control de gestión'
  drawWrapped(p1, `${generatedLabel}  ·  ID: ${report.id}`, 44, 130, W - 88, { size: 6.3, color: MUTED, leading: 8, maxLines: 2 })
  footer(p1, '1/3', false)

  // PAGE 2 — premium commercial performance
  const p2 = pdf.addPage([W, H])
  darkPage(p2)
  p2.drawText('PROPERTY PARTNERS', { x: M, y: 801, size: 9, font: bold, color: PP_RED_SOFT })
  p2.drawText('2/3', { x: W - M - 16, y: 801, size: 8, font: bold, color: PP_TEXT })
  p2.drawText('Actividad comercial y desempeño', { x: M, y: 760, size: 27, font: serif, color: PP_TEXT })
  p2.drawText(period, { x: M, y: 730, size: 11, font: regular, color: PP_TEXT })
  p2.drawLine({ start: { x: M, y: 711 }, end: { x: M + 20, y: 711 }, thickness: 1.4, color: PP_RED })

  sectionCard(p2, M, 470, W - M * 2, 216)
  p2.drawText('Embudo de actividad comercial', { x: M + 16, y: 662, size: 11, font: bold, color: PP_TEXT })
  p2.drawText('Cadena de conversión mensual', { x: M + 16, y: 647, size: 7.5, font: regular, color: PP_MUTED })

  const funnel = [
    { label: 'Requerimientos online', value: company.requerimientos },
    { label: 'Leads nuevos', value: company.leadsNuevos },
    { label: 'Visitas agendadas', value: company.visitasAgendadas },
    { label: 'Visitas realizadas', value: company.visitasRealizadas },
    { label: 'Cierres acreditados', value: company.cierresAcreditados },
  ]
  const fw = (W - M * 2 - 40) / 5
  for (let i = 0; i < funnel.length; i++) {
    const x = M + 10 + i * fw
    const fill = i === funnel.length - 1 ? WARN_BG : PP_SURFACE_2
    p2.drawRectangle({ x, y: 526, width: fw - 5, height: 98, color: fill, borderColor: i === funnel.length - 1 ? PP_RED : PP_LINE, borderWidth: 0.55 })
    drawWrapped(p2, funnel[i].label, x + 7, 598, fw - 19, { size: 7, color: PP_TEXT, leading: 8.5, maxLines: 2 })
    const value = format(funnel[i].value)
    const valueFont = serif
    const valueSize = 23
    const valueWidth = valueFont.widthOfTextAtSize(value, valueSize)
    p2.drawText(value, { x: x + (fw - 5 - valueWidth) / 2, y: 544, size: valueSize, font: valueFont, color: PP_TEXT })
    if (i < funnel.length - 1) p2.drawText('›', { x: x + fw - 1, y: 565, size: 19, font: serifBold, color: PP_RED })
  }
  p2.drawText('Tasa de conversión entre etapas', { x: M + 16, y: 495, size: 7.2, font: regular, color: PP_MUTED })
  const conversions = [
    percent(company.leadsNuevos, company.requerimientos),
    percent(company.visitasAgendadas, company.leadsNuevos),
    percent(company.visitasRealizadas, company.visitasAgendadas),
    percent(company.cierresAcreditados, company.visitasRealizadas),
  ]
  conversions.forEach((value, index) => {
    p2.drawText(value, { x: 205 + index * 86, y: 495, size: 8, font: bold, color: PP_RED_SOFT })
  })

  const leftX = M
  const leftW = 245
  const rightX = M + leftW + GAP
  const rightW = W - M - rightX
  sectionCard(p2, leftX, 270, leftW, 184)
  sectionCard(p2, rightX, 270, rightW, 184)

  p2.drawText('Cumplimiento de visitas', { x: leftX + 14, y: 432, size: 10, font: bold, color: PP_TEXT })
  const compliance = numeric(company.cumplimientoVisitas)
  const ringCenterX = leftX + 75
  const ringCenterY = 346
  const ringRadius = 48
  p2.drawCircle({ x: ringCenterX, y: ringCenterY, size: ringRadius, borderColor: PP_LINE, borderWidth: 9 })
  if (compliance != null) {
    const segments = 28
    const active = Math.max(0, Math.min(segments, Math.round((compliance / 100) * segments)))
    for (let i = 0; i < active; i++) {
      const a1 = (-Math.PI / 2) + (i / segments) * Math.PI * 2
      const a2 = (-Math.PI / 2) + ((i + 0.72) / segments) * Math.PI * 2
      const x1 = ringCenterX + Math.cos(a1) * ringRadius
      const y1 = ringCenterY + Math.sin(a1) * ringRadius
      const x2 = ringCenterX + Math.cos(a2) * ringRadius
      const y2 = ringCenterY + Math.sin(a2) * ringRadius
      p2.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 9, color: PP_RED })
    }
  }
  const complianceText = format(company.cumplimientoVisitas, '%')
  const complianceWidth = serif.widthOfTextAtSize(complianceText, 18)
  p2.drawText(complianceText, { x: ringCenterX - complianceWidth / 2, y: ringCenterY - 7, size: 18, font: serif, color: PP_TEXT })
  p2.drawText(`Agendadas  ${format(company.visitasAgendadas)}`, { x: leftX + 140, y: 367, size: 8, font: regular, color: PP_MUTED })
  p2.drawText(`Realizadas  ${format(company.visitasRealizadas)}`, { x: leftX + 140, y: 338, size: 8, font: regular, color: PP_MUTED })
  p2.drawText('Relación entre visitas realizadas y agendadas.', { x: leftX + 140, y: 395, size: 6.8, font: regular, color: PP_MUTED })

  p2.drawText('Cartera y captaciones', { x: rightX + 14, y: 432, size: 10, font: bold, color: PP_TEXT })
  p2.drawText('Estado del portafolio y nuevas incorporaciones', { x: rightX + 14, y: 417, size: 6.8, font: regular, color: PP_MUTED })
  const barValues = [
    { label: 'Cartera', value: numeric(company.cartera) },
    { label: 'Captaciones', value: numeric(company.captaciones) },
    { label: 'Suspendidas', value: numeric(company.suspendidas) },
  ]
  const barMax = Math.max(1, ...barValues.map((item) => item.value ?? 0))
  const chartBase = 302
  const chartHeight = 93
  for (let i = 0; i < barValues.length; i++) {
    const item = barValues[i]
    const x = rightX + 30 + i * 78
    const barHeight = item.value == null ? 0 : Math.max(2, (item.value / barMax) * chartHeight)
    p2.drawRectangle({ x, y: chartBase, width: 31, height: barHeight, color: PP_RED })
    const label = item.value == null ? 'n/d' : String(item.value)
    const lw = bold.widthOfTextAtSize(label, 8.5)
    p2.drawText(label, { x: x + (31 - lw) / 2, y: chartBase + barHeight + 7, size: 8.5, font: bold, color: PP_TEXT })
    const tw = regular.widthOfTextAtSize(item.label, 6.4)
    p2.drawText(item.label, { x: x + (31 - tw) / 2, y: chartBase - 14, size: 6.4, font: regular, color: PP_MUTED })
  }

  sectionCard(p2, M, 164, W - M * 2, 90)
  p2.drawText('Volumen acreditado', { x: M + 84, y: 224, size: 9, font: regular, color: PP_TEXT })
  p2.drawText(format(company.volumenUfBruto, ' UF'), { x: M + 84, y: 190, size: 25, font: serif, color: PP_TEXT })
  p2.drawCircle({ x: M + 42, y: 208, size: 24, borderColor: PP_RED, borderWidth: 0.8 })
  p2.drawText('UF', { x: M + 32, y: 202, size: 11, font: bold, color: PP_RED_SOFT })
  const insight = `El período consolida ${format(company.cierresAcreditados)} cierres acreditados y ${format(company.volumenUfBruto, ' UF')} de volumen, con ${format(company.visitasRealizadas)} visitas realizadas.`
  drawWrapped(p2, insight, M + 310, 220, 220, { size: 8.5, color: PP_MUTED, leading: 12, maxLines: 4 })

  sectionCard(p2, M, 64, W - M * 2, 84)
  p2.drawText('Lectura ejecutiva del mes', { x: M + 58, y: 125, size: 10, font: bold, color: PP_TEXT })
  p2.drawCircle({ x: M + 26, y: 111, size: 15, borderColor: PP_RED, borderWidth: 0.7 })
  p2.drawText('“', { x: M + 20, y: 106, size: 18, font: serifBold, color: PP_RED_SOFT })
  const visitNarrative = numeric(company.visitasAgendadas) == null || numeric(company.visitasRealizadas) == null
    ? 'La serie de visitas no está disponible de forma canónica para este período; el reporte conserva esos campos como n/d y no infiere valores.'
    : `Se registran ${format(company.visitasAgendadas)} visitas agendadas y ${format(company.visitasRealizadas)} realizadas, equivalentes a ${format(company.cumplimientoVisitas, '%')} de cumplimiento.`
  drawWrapped(p2, visitNarrative, M + 58, 105, W - M * 2 - 76, { size: 7.8, color: PP_MUTED, leading: 11, maxLines: 4 })
  footer(p2, '2/3')

  // PAGE 3 — premium evidence, quality and methodology
  const p3 = pdf.addPage([W, H])
  darkPage(p3)
  decorativeBuilding(p3, 390, 655, 165, 145)
  p3.drawText('PROPERTY PARTNERS', { x: M, y: 801, size: 9, font: bold, color: PP_RED_SOFT })
  ppMark(p3, 520, 775, 40)
  p3.drawText('Evidencia, calidad', { x: M, y: 759, size: 27, font: serif, color: PP_TEXT })
  p3.drawText('y metodología', { x: M, y: 724, size: 27, font: serif, color: PP_TEXT })
  p3.drawText(period, { x: M, y: 691, size: 11, font: regular, color: PP_TEXT })
  p3.drawText('3/3', { x: W - M - 16, y: 691, size: 8, font: bold, color: PP_TEXT })
  p3.drawLine({ start: { x: M, y: 672 }, end: { x: M + 20, y: 672 }, thickness: 1.4, color: PP_RED })

  sectionCard(p3, M, 601, W - M * 2, 56)
  p3.drawText('Estado de completitud', { x: M + 14, y: 636, size: 9.5, font: bold, color: PP_TEXT })
  statusChip(p3, M + 14, 607, 196, operational ? 'Reporte operacional: LISTO' : 'Reporte operacional: NO LISTO', operational)
  statusChip(p3, M + 228, 607, 196, fullScore ? 'Score integral: LISTO' : 'Score integral: BLOQUEADO', fullScore)

  sectionCard(p3, M, 268, W - M * 2, 320)
  p3.drawText('Dimensiones bloqueadas', { x: M + 14, y: 566, size: 10, font: bold, color: PP_TEXT })
  let blockerY = 536
  const blockerRows = blocked.slice(0, 7)
  if (!blockerRows.length) {
    p3.drawText('No hay dimensiones bloqueadas registradas en el snapshot.', { x: M + 14, y: blockerY, size: 8, font: regular, color: PP_MUTED })
  } else {
    for (const blocker of blockerRows) {
      const code = text(blocker.code, 'dimensión')
      const reason = text(blocker.reason, 'Pendiente de definición o evidencia aprobada.')
      p3.drawRectangle({ x: M + 14, y: blockerY - 28, width: 38, height: 34, color: PP_SURFACE_2, borderColor: PP_RED, borderWidth: 0.55 })
      p3.drawCircle({ x: M + 33, y: blockerY - 11, size: 6, borderColor: PP_RED, borderWidth: 0.8 })
      p3.drawLine({ start: { x: M + 33, y: blockerY - 17 }, end: { x: M + 33, y: blockerY - 5 }, thickness: 0.8, color: PP_RED })
      p3.drawLine({ start: { x: M + 27, y: blockerY - 11 }, end: { x: M + 39, y: blockerY - 11 }, thickness: 0.8, color: PP_RED })
      const title = blockerLabel(code)
      p3.drawText(title, { x: M + 67, y: blockerY - 4, size: 8.1, font: bold, color: PP_TEXT })
      drawWrapped(p3, reason, M + 67, blockerY - 17, W - M * 2 - 84, { size: 6.7, color: PP_MUTED, leading: 8.4, maxLines: 2 })
      p3.drawLine({ start: { x: M + 67, y: blockerY - 31 }, end: { x: W - M - 14, y: blockerY - 31 }, thickness: 0.35, color: PP_LINE })
      blockerY -= 41
    }
  }

  const bottomY = 64
  const bottomH = 190
  const leftBottomW = 323
  sectionCard(p3, M, bottomY, leftBottomW, bottomH)
  sectionCard(p3, M + leftBottomW + GAP, bottomY, W - M * 2 - leftBottomW - GAP, bottomH)
  p3.drawText('Notas de calidad y reconciliación', { x: M + 14, y: 232, size: 9.5, font: bold, color: PP_TEXT })
  let noteY = 208
  for (const note of notes.slice(0, 7)) {
    p3.drawCircle({ x: M + 17, y: noteY + 2, size: 1.6, color: PP_RED })
    noteY = drawWrapped(p3, note, M + 26, noteY + 5, leftBottomW - 40, { size: 6.4, color: PP_MUTED, leading: 8.2, maxLines: 2 }) - 4
    if (noteY < 82) break
  }

  const methodX = M + leftBottomW + GAP + 14
  p3.drawText('Procedencia y metodología', { x: methodX, y: 232, size: 9.5, font: bold, color: PP_TEXT })
  const methodW = W - M - methodX - 14
  const methodLines = [
    'Generado exclusivamente desde el snapshot persistido del reporte.',
    'No incorpora proyecciones ni datos externos.',
    'Fuentes canónicas: leads, captaciones, visitas, requerimientos, cierres, cartera y suspendidas.',
  ]
  let methodY = 202
  for (const line of methodLines) {
    p3.drawCircle({ x: methodX + 9, y: methodY + 4, size: 9, borderColor: PP_RED, borderWidth: 0.7 })
    p3.drawCircle({ x: methodX + 9, y: methodY + 4, size: 2.1, color: PP_RED })
    methodY = drawWrapped(p3, line, methodX + 28, methodY + 9, methodW - 30, { size: 6.7, color: PP_MUTED, leading: 8.8, maxLines: 3 }) - 13
  }
  if (sources.length) {
    p3.drawText('Archivos fuente', { x: methodX, y: 94, size: 6.5, font: bold, color: PP_TEXT })
    drawWrapped(p3, sources.join(' · '), methodX, 81, methodW, { size: 5.2, color: PP_MUTED, leading: 6.8, maxLines: 3 })
  }
  footer(p3, '3/3')

  const bytes = await pdf.save()
  return {
    bytes,
    filename: `${filenamePart(reportTypeLabel(report.report_type))}-${report.period_start}-${report.period_end}.pdf`,
  }
}
