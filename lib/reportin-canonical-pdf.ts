import 'server-only'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import type { CanonicalClientReport } from '@/lib/n3uralia-canonical-client-report'

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN_X = 48
const TOP_Y = 790
const BOTTOM_Y = 54
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2
const REPORTIN_VERSION = '1.0'

const COLORS = {
  ink: rgb(0.055, 0.067, 0.067),
  charcoal: rgb(0.075, 0.095, 0.092),
  red: rgb(0.93, 0.20, 0.17),
  muted: rgb(0.38, 0.41, 0.40),
  rule: rgb(0.82, 0.83, 0.82),
  paper: rgb(1, 1, 1),
  soft: rgb(0.965, 0.965, 0.955),
  green: rgb(0.16, 0.43, 0.35),
  amber: rgb(0.66, 0.43, 0.16),
  paleRed: rgb(0.99, 0.92, 0.91),
  paleGreen: rgb(0.91, 0.96, 0.93),
  paleAmber: rgb(0.98, 0.95, 0.88),
}

type Cursor = { page: PDFPage; y: number; pageIndex: number }
type Fonts = { regular: PDFFont; bold: PDFFont }

type SectionStatus = CanonicalClientReport['sections'][number]['status']

function safeText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

function filePart(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80)
}

function wrapText(font: PDFFont, value: string, fontSize: number, maxWidth: number) {
  const result: string[] = []
  for (const paragraph of String(value || '').split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (!words.length) {
      result.push('')
      continue
    }
    let line = words.shift() ?? ''
    for (const word of words) {
      const candidate = `${line} ${word}`
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) line = candidate
      else {
        result.push(line)
        line = word
      }
    }
    result.push(line)
  }
  return result
}

function statusLabel(status: SectionStatus) {
  const labels: Record<SectionStatus, string> = {
    verified: 'Verificado',
    partial: 'Parcial',
    pending_client: 'Pendiente del Cliente',
    pending_n3uralia: 'Pendiente de N3uralia',
    informational: 'Informativo',
  }
  return labels[status]
}

function statusColors(status: SectionStatus) {
  if (status === 'verified') return { fill: COLORS.paleGreen, accent: COLORS.green }
  if (status === 'partial') return { fill: COLORS.paleAmber, accent: COLORS.amber }
  if (status === 'pending_client' || status === 'pending_n3uralia') return { fill: COLORS.paleRed, accent: COLORS.red }
  return { fill: COLORS.soft, accent: COLORS.muted }
}

export async function buildReportinCanonicalPdf(report: CanonicalClientReport) {
  if (report.report_type !== 'n3uralia_client_canonical') throw new Error('REPORTIN_INVALID_REPORT_TYPE')
  if (report.canonical_metadata.source_policy !== 'canonical_input_only') throw new Error('REPORTIN_INVALID_SOURCE_POLICY')

  const pdf = await PDFDocument.create()
  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
  }

  pdf.setTitle(report.title)
  pdf.setSubject(report.purpose)
  pdf.setAuthor('N3uralia Intelligence Platform')
  pdf.setCreator(`Reportin ${REPORTIN_VERSION}`)
  pdf.setProducer(`Reportin ${REPORTIN_VERSION}`)
  pdf.setCreationDate(new Date(report.canonical_metadata.generated_at))

  let cursor: Cursor = { page: pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]), y: TOP_Y, pageIndex: 0 }

  const addInteriorPage = () => {
    cursor = { page: pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]), y: TOP_Y, pageIndex: pdf.getPageCount() - 1 }
    cursor.page.drawText(report.client.toUpperCase(), {
      x: MARGIN_X,
      y: PAGE_HEIGHT - 25,
      size: 7.5,
      font: fonts.bold,
      color: COLORS.ink,
    })
    const headerRight = `N3uralia Intelligence Platform · Corte ${report.period.source_cutoff}`
    const headerWidth = fonts.regular.widthOfTextAtSize(headerRight, 7.5)
    cursor.page.drawText(headerRight, {
      x: PAGE_WIDTH - MARGIN_X - headerWidth,
      y: PAGE_HEIGHT - 25,
      size: 7.5,
      font: fonts.regular,
      color: COLORS.muted,
    })
    cursor.page.drawLine({
      start: { x: MARGIN_X, y: PAGE_HEIGHT - 31 },
      end: { x: PAGE_WIDTH - MARGIN_X, y: PAGE_HEIGHT - 31 },
      thickness: 0.8,
      color: COLORS.red,
    })
  }

  const ensure = (height: number) => {
    if (cursor.y - height < BOTTOM_Y) addInteriorPage()
  }

  const drawParagraph = (value: string, options: {
    font?: PDFFont
    size?: number
    color?: ReturnType<typeof rgb>
    x?: number
    maxWidth?: number
    lineHeight?: number
    after?: number
  } = {}) => {
    const font = options.font ?? fonts.regular
    const size = options.size ?? 9.5
    const x = options.x ?? MARGIN_X
    const maxWidth = options.maxWidth ?? PAGE_WIDTH - x - MARGIN_X
    const lineHeight = options.lineHeight ?? size + 3.5
    const lines = wrapText(font, value, size, maxWidth)
    ensure(lines.length * lineHeight + (options.after ?? 0))
    for (const line of lines) {
      if (line) cursor.page.drawText(line, { x, y: cursor.y, size, font, color: options.color ?? COLORS.ink })
      cursor.y -= lineHeight
    }
    cursor.y -= options.after ?? 0
  }

  const drawBulletList = (items: string[], options: { title?: string; accent?: ReturnType<typeof rgb> } = {}) => {
    if (!items.length) return
    if (options.title) drawParagraph(options.title, { font: fonts.bold, size: 11, after: 5 })
    for (const item of items) {
      const lines = wrapText(fonts.regular, item, 9.2, CONTENT_WIDTH - 20)
      ensure(lines.length * 12.5 + 4)
      cursor.page.drawCircle({ x: MARGIN_X + 4, y: cursor.y + 3, size: 1.8, color: options.accent ?? COLORS.red })
      for (const line of lines) {
        cursor.page.drawText(line, { x: MARGIN_X + 16, y: cursor.y, size: 9.2, font: fonts.regular, color: COLORS.ink })
        cursor.y -= 12.5
      }
      cursor.y -= 3
    }
  }

  const drawSectionHeading = (index: number, title: string) => {
    ensure(56)
    const number = String(index).padStart(2, '0')
    cursor.page.drawText(number, { x: MARGIN_X, y: cursor.y, size: 24, font: fonts.bold, color: COLORS.red })
    cursor.page.drawText(title, { x: MARGIN_X + 54, y: cursor.y + 1, size: 20, font: fonts.bold, color: COLORS.ink })
    cursor.y -= 38
  }

  const drawCallout = (title: string, body: string, accent = COLORS.red, fill = COLORS.soft) => {
    const bodyLines = wrapText(fonts.regular, body, 9, CONTENT_WIDTH - 36)
    const titleLines = wrapText(fonts.bold, title, 10.5, CONTENT_WIDTH - 36)
    const height = 20 + titleLines.length * 14 + bodyLines.length * 12 + 18
    ensure(height + 12)
    cursor.page.drawRectangle({ x: MARGIN_X, y: cursor.y - height, width: CONTENT_WIDTH, height, color: fill, borderColor: COLORS.rule, borderWidth: 0.5 })
    cursor.page.drawRectangle({ x: MARGIN_X, y: cursor.y - height, width: 3, height, color: accent })
    let y = cursor.y - 18
    for (const line of titleLines) {
      cursor.page.drawText(line, { x: MARGIN_X + 14, y, size: 10.5, font: fonts.bold, color: COLORS.ink })
      y -= 14
    }
    y -= 2
    for (const line of bodyLines) {
      cursor.page.drawText(line, { x: MARGIN_X + 14, y, size: 9, font: fonts.regular, color: COLORS.muted })
      y -= 12
    }
    cursor.y -= height + 14
  }

  // Cover
  cursor.page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: COLORS.ink })
  cursor.page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 14, width: PAGE_WIDTH, height: 14, color: COLORS.red })
  cursor.page.drawText(report.client.toUpperCase(), { x: 54, y: 690, size: 9, font: fonts.bold, color: COLORS.red })
  const coverTitleLines = wrapText(fonts.bold, report.title, 28, PAGE_WIDTH - 108)
  let coverY = 645
  for (const line of coverTitleLines) {
    cursor.page.drawText(line, { x: 54, y: coverY, size: 28, font: fonts.bold, color: COLORS.paper })
    coverY -= 36
  }
  cursor.page.drawText(`Período analizado: ${report.period.start} a ${report.period.end}`, { x: 54, y: coverY - 18, size: 11, font: fonts.regular, color: rgb(0.76, 0.77, 0.76) })
  cursor.page.drawText(`Corte de datos: ${report.period.source_cutoff}`, { x: 54, y: coverY - 43, size: 11, font: fonts.regular, color: rgb(0.76, 0.77, 0.76) })
  cursor.page.drawText(`Fecha de emisión: ${report.canonical_metadata.generated_at.slice(0, 10)}`, { x: 54, y: coverY - 68, size: 11, font: fonts.regular, color: rgb(0.76, 0.77, 0.76) })
  cursor.page.drawLine({ start: { x: 56, y: 345 }, end: { x: PAGE_WIDTH - 56, y: 345 }, thickness: 0.8, color: COLORS.red })
  cursor.page.drawText('N3URALIA INTELLIGENCE PLATFORM', { x: 56, y: 326, size: 8.5, font: fonts.bold, color: COLORS.red })
  cursor.page.drawText('Reportin · Informe canónico · Data validada', { x: 56, y: 296, size: 11, font: fonts.regular, color: rgb(0.76, 0.77, 0.76) })

  // Executive summary
  addInteriorPage()
  drawSectionHeading(0, 'Resumen ejecutivo')
  drawCallout('Mensaje principal', report.executive_summary)
  drawParagraph('Estado y alcance', { font: fonts.bold, size: 13, after: 7 })
  drawParagraph(`Este informe fue generado con ${report.canonical_metadata.provider} ${report.canonical_metadata.model} mediante la API ${report.canonical_metadata.api}, usando exclusivamente el paquete canónico validado.`, { color: COLORS.muted, after: 12 })
  drawBulletList(report.conclusions.slice(0, 6), { title: 'Conclusiones principales' })
  if (report.limitations.length) drawCallout('Regla de confianza', report.limitations[0], COLORS.amber, COLORS.paleAmber)

  report.sections.forEach((section, index) => {
    addInteriorPage()
    drawSectionHeading(index + 1, section.title)
    const semantic = statusColors(section.status)
    const badge = statusLabel(section.status)
    const badgeWidth = fonts.bold.widthOfTextAtSize(badge, 8) + 20
    cursor.page.drawRectangle({ x: MARGIN_X, y: cursor.y - 18, width: badgeWidth, height: 18, color: semantic.fill })
    cursor.page.drawText(badge, { x: MARGIN_X + 10, y: cursor.y - 13, size: 8, font: fonts.bold, color: semantic.accent })
    cursor.y -= 34
    drawParagraph(section.summary, { size: 10, lineHeight: 14, after: 12 })
    drawBulletList(section.key_findings, { title: 'Hallazgos clave', accent: semantic.accent })
    drawBulletList(section.next_actions, { title: 'Próximas acciones', accent: semantic.accent })
    if (section.evidence_refs.length) {
      drawCallout('Evidencia utilizada', section.evidence_refs.join(' · '), COLORS.muted, COLORS.soft)
    }
  })

  addInteriorPage()
  drawSectionHeading(report.sections.length + 1, 'Decisiones y próximos hitos')
  drawBulletList(report.client_actions, { title: 'Acciones requeridas del Cliente', accent: COLORS.red })
  drawBulletList(report.n3uralia_actions, { title: 'Compromisos de N3uralia', accent: COLORS.green })

  addInteriorPage()
  drawSectionHeading(report.sections.length + 2, 'Fuentes, limitaciones y trazabilidad')
  drawBulletList(report.limitations, { title: 'Limitaciones declaradas', accent: COLORS.amber })
  drawCallout(
    'Trazabilidad de generación',
    `Proveedor: ${report.canonical_metadata.provider}. Modelo: ${report.canonical_metadata.model}. API: ${report.canonical_metadata.api}. Razonamiento: ${report.canonical_metadata.reasoning_mode}/${report.canonical_metadata.reasoning_effort}. Política de fuentes: ${report.canonical_metadata.source_policy}. Almacenamiento en proveedor: ${report.canonical_metadata.store ? 'sí' : 'no'}. Reportin: ${REPORTIN_VERSION}.`,
    COLORS.red,
    COLORS.soft,
  )
  drawParagraph('Este documento no sustituye una aceptación contractual, acta de entrega o validación humana cuando dichas etapas sean requeridas.', { color: COLORS.muted })

  const pages = pdf.getPages()
  pages.forEach((page, index) => {
    if (index === 0) return
    const footerLeft = 'Confidencial · Informe ejecutivo canónico'
    page.drawText(footerLeft, { x: MARGIN_X, y: 24, size: 7, font: fonts.regular, color: COLORS.muted })
    const footerRight = `Página ${index + 1}`
    const width = fonts.regular.widthOfTextAtSize(footerRight, 7)
    page.drawText(footerRight, { x: PAGE_WIDTH - MARGIN_X - width, y: 24, size: 7, font: fonts.regular, color: COLORS.muted })
  })

  const bytes = await pdf.save()
  const filename = `${filePart(report.title || 'informe-canonico')}-${report.period.end}.pdf`
  return { bytes, filename, reportinVersion: REPORTIN_VERSION }
}
