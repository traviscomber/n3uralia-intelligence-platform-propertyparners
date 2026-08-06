import 'server-only'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib'
import type { CanonicalChartSpec, CanonicalClientReport } from '@/lib/n3uralia-canonical-client-report'

const W = 595.28
const H = 841.89
const MX = 46
const TOP = 790
const BOTTOM = 52
const CW = W - MX * 2
const VERSION = '1.1'

const C = {
  ink: rgb(0.035, 0.055, 0.052),
  charcoal: rgb(0.075, 0.095, 0.092),
  red: rgb(0.843, 0.20, 0.169),
  coral: rgb(0.94, 0.29, 0.25),
  teal: rgb(0.27, 0.49, 0.51),
  gray: rgb(0.43, 0.49, 0.48),
  muted: rgb(0.38, 0.42, 0.41),
  grid: rgb(0.88, 0.89, 0.88),
  border: rgb(0.82, 0.84, 0.83),
  paper: rgb(1, 1, 1),
  soft: rgb(0.965, 0.968, 0.962),
  paleRed: rgb(0.99, 0.92, 0.91),
  paleGreen: rgb(0.91, 0.96, 0.93),
  paleAmber: rgb(0.98, 0.95, 0.88),
  green: rgb(0.17, 0.45, 0.35),
  amber: rgb(0.68, 0.46, 0.17),
}

type Fonts = { regular: PDFFont; bold: PDFFont }
type Cursor = { page: PDFPage; y: number }

function wrap(font: PDFFont, value: string, size: number, width: number) {
  const lines: string[] = []
  for (const paragraph of String(value || '').split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (!words.length) { lines.push(''); continue }
    let line = words.shift() || ''
    for (const word of words) {
      const candidate = `${line} ${word}`
      if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate
      else { lines.push(line); line = word }
    }
    lines.push(line)
  }
  return lines
}

function formatValue(value: number | null, unit: string) {
  if (value === null) return 'N/D'
  const formatted = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 }).format(value)
  return unit === '%' ? `${formatted}%` : unit ? `${formatted} ${unit}` : formatted
}

function filePart(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80)
}

function statusStyle(status: string) {
  if (status === 'verified') return { fill: C.paleGreen, accent: C.green, label: 'VERIFICADO' }
  if (status === 'partial') return { fill: C.paleAmber, accent: C.amber, label: 'PARCIAL' }
  if (status === 'not_evaluable') return { fill: C.soft, accent: C.gray, label: 'NO EVALUABLE' }
  if (status === 'pending_client') return { fill: C.paleRed, accent: C.red, label: 'PENDIENTE CLIENTE' }
  if (status === 'pending_n3uralia') return { fill: C.paleAmber, accent: C.amber, label: 'PENDIENTE N3URALIA' }
  return { fill: C.soft, accent: C.gray, label: 'INFORMATIVO' }
}

function seriesColor(index: number) {
  return [C.coral, C.teal, C.ink, C.gray][index % 4]
}

export async function buildReportinProPdf(report: CanonicalClientReport) {
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
  pdf.setCreator(`Reportin ${VERSION}`)
  pdf.setProducer(`Reportin ${VERSION}`)

  let cursor: Cursor = { page: pdf.addPage([W, H]), y: TOP }

  const addPage = () => {
    cursor = { page: pdf.addPage([W, H]), y: TOP }
    cursor.page.drawText(report.client.toUpperCase(), { x: MX, y: H - 22, size: 7.4, font: fonts.bold, color: C.ink })
    const right = `N3uralia Intelligence Platform · Corte ${report.period.source_cutoff}`
    const rw = fonts.regular.widthOfTextAtSize(right, 7.4)
    cursor.page.drawText(right, { x: W - MX - rw, y: H - 22, size: 7.4, font: fonts.regular, color: C.muted })
    cursor.page.drawLine({ start: { x: MX, y: H - 29 }, end: { x: W - MX, y: H - 29 }, thickness: 0.8, color: C.red })
  }

  const ensure = (height: number) => { if (cursor.y - height < BOTTOM) addPage() }

  const paragraph = (value: string, options: { size?: number; font?: PDFFont; color?: RGB; width?: number; x?: number; after?: number; lineHeight?: number } = {}) => {
    const size = options.size ?? 9.4
    const font = options.font ?? fonts.regular
    const x = options.x ?? MX
    const width = options.width ?? W - MX - x
    const lineHeight = options.lineHeight ?? size + 3.5
    const lines = wrap(font, value, size, width)
    ensure(lines.length * lineHeight + (options.after ?? 0))
    for (const line of lines) {
      if (line) cursor.page.drawText(line, { x, y: cursor.y, size, font, color: options.color ?? C.ink })
      cursor.y -= lineHeight
    }
    cursor.y -= options.after ?? 0
  }

  const heading = (index: number, title: string, subtitle?: string) => {
    ensure(66)
    cursor.page.drawText(String(index).padStart(2, '0'), { x: MX, y: cursor.y, size: 23, font: fonts.bold, color: C.red })
    const titleLines = wrap(fonts.bold, title, 19, CW - 55)
    let y = cursor.y + 1
    for (const line of titleLines) { cursor.page.drawText(line, { x: MX + 54, y, size: 19, font: fonts.bold, color: C.ink }); y -= 23 }
    cursor.y = y - 8
    if (subtitle) paragraph(subtitle, { size: 11, color: C.muted, after: 10 })
  }

  const callout = (title: string, body: string, accent = C.red, fill = C.soft) => {
    const tl = wrap(fonts.bold, title, 10.5, CW - 34)
    const bl = wrap(fonts.regular, body, 9, CW - 34)
    const height = 20 + tl.length * 14 + bl.length * 12 + 14
    ensure(height + 12)
    cursor.page.drawRectangle({ x: MX, y: cursor.y - height, width: CW, height, color: fill, borderColor: C.border, borderWidth: 0.5 })
    cursor.page.drawRectangle({ x: MX, y: cursor.y - height, width: 3, height, color: accent })
    let y = cursor.y - 17
    for (const line of tl) { cursor.page.drawText(line, { x: MX + 13, y, size: 10.5, font: fonts.bold, color: C.ink }); y -= 14 }
    y -= 2
    for (const line of bl) { cursor.page.drawText(line, { x: MX + 13, y, size: 9, font: fonts.regular, color: C.muted }); y -= 12 }
    cursor.y -= height + 13
  }

  const bulletList = (title: string, items: string[], accent = C.red) => {
    if (!items.length) return
    paragraph(title, { size: 11.5, font: fonts.bold, after: 5 })
    for (const item of items) {
      const lines = wrap(fonts.regular, item, 9.1, CW - 20)
      ensure(lines.length * 12.5 + 4)
      cursor.page.drawCircle({ x: MX + 4, y: cursor.y + 3, size: 1.8, color: accent })
      for (const line of lines) { cursor.page.drawText(line, { x: MX + 15, y: cursor.y, size: 9.1, font: fonts.regular, color: C.ink }); cursor.y -= 12.5 }
      cursor.y -= 3
    }
  }

  const kpiCards = (chart: CanonicalChartSpec) => {
    const points = chart.categories.map((category, index) => ({ category, value: chart.series[0]?.values[index] ?? null }))
    const count = Math.min(points.length, 8)
    if (!count) return
    const cols = count <= 4 ? count : 4
    const gap = 5
    const cardW = (CW - gap * (cols - 1)) / cols
    const rows = Math.ceil(count / cols)
    const cardH = 82
    ensure(rows * (cardH + gap) + 30)
    for (let i = 0; i < count; i++) {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = MX + col * (cardW + gap)
      const y = cursor.y - row * (cardH + gap)
      const accent = seriesColor(i)
      cursor.page.drawRectangle({ x, y: y - cardH, width: cardW, height: cardH, borderColor: C.border, borderWidth: 0.6, color: C.paper })
      cursor.page.drawRectangle({ x, y: y - 2, width: cardW, height: 2, color: accent })
      const label = wrap(fonts.bold, points[i].category.toUpperCase(), 7.1, cardW - 14).slice(0, 2)
      let ly = y - 15
      label.forEach((line) => { cursor.page.drawText(line, { x: x + 8, y: ly, size: 7.1, font: fonts.bold, color: accent }); ly -= 9 })
      cursor.page.drawText(formatValue(points[i].value, chart.series[0]?.unit ?? ''), { x: x + 8, y: y - 51, size: 18, font: fonts.bold, color: C.ink })
    }
    cursor.y -= rows * (cardH + gap) + 15
  }

  const axes = (plot: { x: number; y: number; w: number; h: number }, max: number) => {
    for (let i = 0; i <= 4; i++) {
      const yy = plot.y + (plot.h * i) / 4
      cursor.page.drawLine({ start: { x: plot.x, y: yy }, end: { x: plot.x + plot.w, y: yy }, thickness: 0.45, color: C.grid })
      const label = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format((max * i) / 4)
      cursor.page.drawText(label, { x: plot.x - 27, y: yy - 3, size: 6.8, font: fonts.regular, color: C.gray })
    }
    cursor.page.drawLine({ start: { x: plot.x, y: plot.y }, end: { x: plot.x + plot.w, y: plot.y }, thickness: 0.7, color: C.ink })
  }

  const renderChart = (chart: CanonicalChartSpec) => {
    addPage()
    heading(pdf.getPageCount() - 1, chart.title, chart.purpose)
    const state = statusStyle(chart.status)
    cursor.page.drawRectangle({ x: MX, y: cursor.y - 17, width: fonts.bold.widthOfTextAtSize(state.label, 7.2) + 18, height: 17, color: state.fill })
    cursor.page.drawText(state.label, { x: MX + 9, y: cursor.y - 12, size: 7.2, font: fonts.bold, color: state.accent })
    cursor.y -= 30

    if (chart.status === 'not_evaluable' || !chart.series.length) {
      callout('No evaluable', chart.source_note, C.gray, C.soft)
      return
    }
    if (chart.type === 'progress') {
      kpiCards(chart)
      paragraph(`Fuente: ${chart.source_note}`, { size: 7.4, color: C.muted })
      return
    }

    const all = chart.series.flatMap((s) => s.values).filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    if (!all.length) { callout('No evaluable', chart.source_note, C.gray, C.soft); return }
    const max = Math.max(...all, 1) * 1.12
    const plot = { x: MX + 34, y: 205, w: CW - 42, h: 390 }
    axes(plot, max)

    chart.series.forEach((series, seriesIndex) => {
      const color = seriesColor(seriesIndex)
      const isLine = chart.type === 'line' || (chart.type === 'combo_bar_line' && series.id === chart.target_series_id)
      if (isLine) {
        let prev: { x: number; y: number } | null = null
        series.values.forEach((value, index) => {
          if (value === null) { prev = null; return }
          const x = plot.x + ((index + 0.5) * plot.w) / chart.categories.length
          const y = plot.y + (value / max) * plot.h
          if (prev) cursor.page.drawLine({ start: prev, end: { x, y }, thickness: 1.8, color })
          cursor.page.drawCircle({ x, y, size: 2.5, color })
          if (chart.direct_labels) cursor.page.drawText(formatValue(value, series.unit), { x: x - 9, y: y + 7, size: 6.8, font: fonts.bold, color })
          prev = { x, y }
        })
      } else {
        const barSeries = chart.type === 'grouped_bar' ? chart.series.length : chart.series.filter((s) => s.id !== chart.target_series_id).length
        const slot = plot.w / chart.categories.length
        const groupW = slot * 0.68
        const barW = groupW / Math.max(barSeries, 1)
        let barIndex = 0
        chart.series.slice(0, seriesIndex).forEach((s) => { if (!(chart.type === 'combo_bar_line' && s.id === chart.target_series_id)) barIndex += 1 })
        series.values.forEach((value, index) => {
          if (value === null) return
          const x = plot.x + index * slot + (slot - groupW) / 2 + barIndex * barW
          const bh = (value / max) * plot.h
          cursor.page.drawRectangle({ x, y: plot.y, width: Math.max(3, barW - 2), height: bh, color })
          if (chart.direct_labels) cursor.page.drawText(formatValue(value, series.unit), { x, y: plot.y + bh + 6, size: 6.8, font: fonts.bold, color: C.ink })
        })
      }
    })

    chart.categories.forEach((category, index) => {
      const x = plot.x + ((index + 0.5) * plot.w) / chart.categories.length
      const label = category.length > 12 ? `${category.slice(0, 11)}…` : category
      const lw = fonts.regular.widthOfTextAtSize(label, 7)
      cursor.page.drawText(label, { x: x - lw / 2, y: plot.y - 16, size: 7, font: fonts.regular, color: C.ink })
    })

    let lx = plot.x
    chart.series.forEach((series, index) => {
      const color = seriesColor(index)
      cursor.page.drawRectangle({ x: lx, y: plot.y + plot.h + 20, width: 9, height: 6, color })
      cursor.page.drawText(series.label, { x: lx + 13, y: plot.y + plot.h + 19, size: 7.2, font: fonts.regular, color: C.ink })
      lx += 18 + fonts.regular.widthOfTextAtSize(series.label, 7.2)
    })
    cursor.page.drawText(`Fuente: ${chart.source_note}`, { x: MX, y: 156, size: 7.2, font: fonts.regular, color: C.muted })
  }

  // Cover
  cursor.page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.ink })
  cursor.page.drawRectangle({ x: 0, y: H - 14, width: W, height: 14, color: C.coral })
  cursor.page.drawText(report.client.toUpperCase(), { x: 54, y: 690, size: 9, font: fonts.bold, color: C.coral })
  let cy = 645
  for (const line of wrap(fonts.bold, report.title, 28, W - 108)) { cursor.page.drawText(line, { x: 54, y: cy, size: 28, font: fonts.bold, color: C.paper }); cy -= 36 }
  cursor.page.drawText(`Período analizado: ${report.period.start} a ${report.period.end}`, { x: 54, y: cy - 18, size: 11, font: fonts.regular, color: C.border })
  cursor.page.drawText(`Corte de datos: ${report.period.source_cutoff}`, { x: 54, y: cy - 43, size: 11, font: fonts.regular, color: C.border })
  cursor.page.drawText(`Fecha de emisión: ${report.canonical_metadata.generated_at.slice(0, 10)}`, { x: 54, y: cy - 68, size: 11, font: fonts.regular, color: C.border })
  cursor.page.drawLine({ start: { x: 56, y: 345 }, end: { x: W - 56, y: 345 }, thickness: 0.8, color: C.coral })
  cursor.page.drawText('N3URALIA INTELLIGENCE PLATFORM', { x: 56, y: 326, size: 8.5, font: fonts.bold, color: C.coral })
  cursor.page.drawText('Control de gestión · Inteligencia de mercado · Valorización', { x: 56, y: 296, size: 10.5, font: fonts.regular, color: C.border })

  addPage()
  heading(0, 'Resumen ejecutivo')
  callout('Mensaje principal', report.executive_summary)
  const firstProgress = (report.charts || []).find((chart) => chart.type === 'progress')
  if (firstProgress) kpiCards(firstProgress)
  bulletList('Conclusiones principales', report.conclusions.slice(0, 6))
  if (report.limitations.length) callout('Regla de confianza', report.limitations[0], C.amber, C.paleAmber)

  for (const chart of report.charts || []) {
    if (chart === firstProgress) continue
    renderChart(chart)
  }

  report.sections.forEach((section, index) => {
    addPage()
    heading(index + 1, section.title)
    const state = statusStyle(section.status)
    cursor.page.drawRectangle({ x: MX, y: cursor.y - 17, width: fonts.bold.widthOfTextAtSize(state.label, 7.2) + 18, height: 17, color: state.fill })
    cursor.page.drawText(state.label, { x: MX + 9, y: cursor.y - 12, size: 7.2, font: fonts.bold, color: state.accent })
    cursor.y -= 31
    paragraph(section.summary, { size: 10, lineHeight: 14, after: 10 })
    bulletList('Hallazgos clave', section.key_findings, state.accent)
    bulletList('Próximas acciones', section.next_actions, state.accent)
    if (section.evidence_refs.length) callout('Evidencia utilizada', section.evidence_refs.join(' · '), C.gray, C.soft)
  })

  addPage()
  heading(report.sections.length + 1, 'Decisiones y próximos hitos')
  bulletList('Acciones requeridas del Cliente', report.client_actions, C.red)
  bulletList('Compromisos de N3uralia', report.n3uralia_actions, C.green)

  addPage()
  heading(report.sections.length + 2, 'Fuentes, definiciones y limitaciones')
  bulletList('Limitaciones declaradas', report.limitations, C.amber)
  callout('Trazabilidad de generación', `Proveedor: ${report.canonical_metadata.provider}. Modelo: ${report.canonical_metadata.model}. Respuesta: ${report.canonical_metadata.response_id || 'N/D'}. Prompt: ${report.canonical_metadata.prompt_version}. Razonamiento: ${report.canonical_metadata.reasoning_mode}/${report.canonical_metadata.reasoning_effort}. Política: ${report.canonical_metadata.source_policy}. Reportin: ${VERSION}.`, C.red, C.soft)

  const pages = pdf.getPages()
  pages.forEach((page, index) => {
    if (index === 0) return
    page.drawText('Confidencial · Informe ejecutivo de avance y desempeño', { x: MX, y: 23, size: 6.8, font: fonts.regular, color: C.muted })
    const label = `Página ${index + 1}`
    page.drawText(label, { x: W - MX - fonts.regular.widthOfTextAtSize(label, 6.8), y: 23, size: 6.8, font: fonts.regular, color: C.muted })
  })

  const bytes = await pdf.save()
  return { bytes, filename: `${filePart(report.title || 'informe-canonico')}-${report.period.end}.pdf`, reportinVersion: VERSION }
}
