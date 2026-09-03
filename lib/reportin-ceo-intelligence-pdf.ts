import 'server-only'
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont, type RGB } from 'pdf-lib'
import type {
  CeoKpi,
  CeoMarketGeometry,
  CeoMarketPolygon,
  CeoMarketRow,
  PropertyPartnersCeoIntelligenceReport,
} from '@/lib/property-partners-ceo-intelligence-report'

const W = 595.28
const H = 841.89
const MX = 48
const TOP = 786
const REPORTIN_VERSION = '1.1'

const C = {
  ink: rgb(0.055, 0.067, 0.067),
  charcoal: rgb(0.075, 0.095, 0.092),
  red: rgb(0.91, 0.19, 0.16),
  teal: rgb(0.16, 0.43, 0.40),
  amber: rgb(0.72, 0.48, 0.18),
  gray: rgb(0.47, 0.49, 0.48),
  line: rgb(0.84, 0.84, 0.82),
  soft: rgb(0.965, 0.965, 0.955),
  paper: rgb(1, 1, 1),
  paleRed: rgb(0.98, 0.90, 0.89),
  paleTeal: rgb(0.89, 0.95, 0.94),
  paleAmber: rgb(0.98, 0.94, 0.86),
  paleGray: rgb(0.93, 0.93, 0.92),
}

type Fonts = { regular: PDFFont; bold: PDFFont }

function filePart(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80)
}

function wrap(font: PDFFont, text: string, size: number, width: number) {
  const lines: string[] = []
  for (const paragraph of String(text || '').split(/\r?\n/)) {
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

function formatNumber(value: number | null, maximumFractionDigits = 1) {
  return value === null ? 'N/D' : new Intl.NumberFormat('es-CL', { maximumFractionDigits }).format(value)
}

function formatKpi(kpi: CeoKpi) {
  if (kpi.value === null) return 'N/D'
  const value = formatNumber(kpi.value, kpi.unit === 'uf' ? 0 : 2)
  if (kpi.unit === 'uf') return `${value} UF`
  if (['percent', '%', 'pct'].includes(kpi.unit.toLowerCase())) return `${value}%`
  return value
}

function formatDelta(value: number | null) {
  if (value === null) return 'N/D'
  return `${value >= 0 ? '+' : ''}${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format(value)}%`
}

function kpiByCode(kpis: CeoKpi[], code: string) {
  return kpis.find((kpi) => kpi.metricCode === code) || null
}

function header(page: PDFPage, fonts: Fonts, report: PropertyPartnersCeoIntelligenceReport, section: string) {
  page.drawText('PROPERTY PARTNERS VITACURA', { x: MX, y: H - 25, size: 7.5, font: fonts.bold, color: C.ink })
  const right = `${section} · Corte ${report.period.source_cutoff}`
  const width = fonts.regular.widthOfTextAtSize(right, 7.5)
  page.drawText(right, { x: W - MX - width, y: H - 25, size: 7.5, font: fonts.regular, color: C.gray })
  page.drawLine({ start: { x: MX, y: H - 31 }, end: { x: W - MX, y: H - 31 }, thickness: 0.8, color: C.red })
}

function footer(page: PDFPage, fonts: Fonts, pageNumber: number) {
  page.drawText('Confidencial · CEO Intelligence · Fuente canónica', { x: MX, y: 24, size: 7, font: fonts.regular, color: C.gray })
  const label = `Página ${pageNumber}`
  const width = fonts.regular.widthOfTextAtSize(label, 7)
  page.drawText(label, { x: W - MX - width, y: 24, size: 7, font: fonts.regular, color: C.gray })
}

function sectionTitle(page: PDFPage, fonts: Fonts, number: string, title: string, subtitle?: string) {
  page.drawText(number, { x: MX, y: TOP, size: 22, font: fonts.bold, color: C.red })
  page.drawText(title, { x: MX + 50, y: TOP + 1, size: 19, font: fonts.bold, color: C.ink })
  if (subtitle) page.drawText(subtitle, { x: MX + 50, y: TOP - 20, size: 8.5, font: fonts.regular, color: C.gray })
}

function paragraph(page: PDFPage, fonts: Fonts, text: string, x: number, y: number, width: number, size = 9.5, color: RGB = C.ink, bold = false) {
  const font = bold ? fonts.bold : fonts.regular
  const lines = wrap(font, text, size, width)
  let cursor = y
  for (const line of lines) {
    if (line) page.drawText(line, { x, y: cursor, size, font, color })
    cursor -= size + 3.5
  }
  return cursor
}

function drawKpiCard(page: PDFPage, fonts: Fonts, kpi: CeoKpi, x: number, y: number, width: number, height: number) {
  const accent = kpi.status === 'verified' ? C.teal : kpi.status === 'partial' ? C.amber : C.gray
  page.drawRectangle({ x, y: y - height, width, height, borderColor: C.line, borderWidth: 0.6, color: C.paper })
  page.drawRectangle({ x, y: y - 3, width, height: 3, color: accent })
  page.drawText(kpi.label.toUpperCase().slice(0, 28), { x: x + 10, y: y - 18, size: 6.8, font: fonts.bold, color: C.gray })
  page.drawText(formatKpi(kpi), { x: x + 10, y: y - 43, size: 17, font: fonts.bold, color: C.ink })
  const delta = `MoM ${formatDelta(kpi.momPct)} · YoY ${formatDelta(kpi.yoyPct)}`
  page.drawText(delta, { x: x + 10, y: y - height + 12, size: 6.8, font: fonts.regular, color: C.gray })
}

function signalColor(signal: string) {
  if (signal === 'market_aligned') return C.teal
  if (signal === 'asking_moderately_above_sales') return C.amber
  if (signal === 'asking_well_above_sales') return C.red
  return C.gray
}

function geometryRings(geometry: CeoMarketGeometry) {
  if (geometry.type === 'Polygon') return (geometry.coordinates as number[][][]).slice(0, 1)
  return (geometry.coordinates as number[][][][]).flatMap((polygon) => polygon.slice(0, 1))
}

function allPoints(polygons: CeoMarketPolygon[]) {
  return polygons.flatMap((polygon) => geometryRings(polygon.geometry).flat())
}

function marketRow(rows: CeoMarketRow[], name: string, propertyType: string) {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '')
  return rows.find((row) => normalize(row.neighborhood) === normalize(name) && row.propertyType === propertyType) || null
}

function drawMarketMap(page: PDFPage, fonts: Fonts, polygons: CeoMarketPolygon[], rows: CeoMarketRow[], propertyType: string, x: number, y: number, width: number, height: number) {
  page.drawRectangle({ x, y: y - height, width, height, color: C.soft, borderColor: C.line, borderWidth: 0.6 })
  page.drawText(propertyType.toUpperCase(), { x: x + 10, y: y - 17, size: 8, font: fonts.bold, color: C.ink })
  const points = allPoints(polygons)
  if (!points.length) {
    page.drawText('Geometría KML no disponible', { x: x + 10, y: y - 40, size: 8, font: fonts.regular, color: C.gray })
    return
  }
  const minLon = Math.min(...points.map((point) => point[0]))
  const maxLon = Math.max(...points.map((point) => point[0]))
  const minLat = Math.min(...points.map((point) => point[1]))
  const maxLat = Math.max(...points.map((point) => point[1]))
  const mapX = x + 8
  const mapY = y - height + 8
  const mapW = width - 16
  const mapH = height - 34
  const scale = Math.min(mapW / Math.max(maxLon - minLon, 0.000001), mapH / Math.max(maxLat - minLat, 0.000001))
  const drawnW = (maxLon - minLon) * scale
  const drawnH = (maxLat - minLat) * scale
  const offsetX = mapX + (mapW - drawnW) / 2
  const offsetY = mapY + (mapH - drawnH) / 2

  for (const polygon of polygons) {
    const row = marketRow(rows, polygon.name, propertyType)
    const color = row ? signalColor(row.signal) : C.gray
    for (const ring of geometryRings(polygon.geometry)) {
      if (ring.length < 3) continue
      const path = ring.map((point, index) => {
        const px = offsetX + (point[0] - minLon) * scale
        const py = offsetY + (point[1] - minLat) * scale
        return `${index === 0 ? 'M' : 'L'} ${px.toFixed(2)} ${py.toFixed(2)}`
      }).join(' ') + ' Z'
      page.drawSvgPath(path, { color, borderColor: C.paper, borderWidth: 0.55, opacity: row ? 0.88 : 0.35 })
    }
  }
}

function drawLegend(page: PDFPage, fonts: Fonts, x: number, y: number) {
  const items: Array<[string, RGB]> = [
    ['Alineado', C.teal], ['Oferta moderadamente sobre ventas', C.amber], ['Oferta muy sobre ventas', C.red], ['Cobertura insuficiente', C.gray],
  ]
  let cursor = x
  for (const [label, color] of items) {
    page.drawRectangle({ x: cursor, y: y - 7, width: 8, height: 8, color })
    page.drawText(label, { x: cursor + 12, y: y - 6, size: 6.4, font: fonts.regular, color: C.gray })
    cursor += 12 + fonts.regular.widthOfTextAtSize(label, 6.4) + 16
  }
}

function drawMarketTable(page: PDFPage, fonts: Fonts, rows: CeoMarketRow[], propertyType: string, y: number) {
  const filtered = rows
    .filter((row) => row.propertyType === propertyType && row.gapPct !== null)
    .sort((a, b) => (b.gapPct || 0) - (a.gapPct || 0))
    .slice(0, 8)
  const x = MX
  const widths = [132, 48, 60, 60, 54, 95]
  const headers = ['Micromercado', 'Oferta', 'Tx CBRS', 'UF/m² oferta', 'UF/m² venta', 'Gap / señal']
  let currentY = y
  page.drawRectangle({ x, y: currentY - 20, width: W - 2 * MX, height: 20, color: C.ink })
  let cursorX = x
  headers.forEach((label, index) => {
    page.drawText(label, { x: cursorX + 4, y: currentY - 14, size: 6.5, font: fonts.bold, color: C.paper })
    cursorX += widths[index]
  })
  currentY -= 20
  for (const row of filtered) {
    const values = [
      row.neighborhood,
      formatNumber(row.portalListings, 0),
      formatNumber(row.cbrsTransactions, 0),
      formatNumber(row.portalMedianUfM2, 1),
      formatNumber(row.cbrsMedianUfM2, 1),
      `${formatDelta(row.gapPct === null ? null : row.gapPct * 100)} · ${row.signal.replaceAll('_', ' ')}`,
    ]
    cursorX = x
    page.drawRectangle({ x, y: currentY - 19, width: W - 2 * MX, height: 19, color: filtered.indexOf(row) % 2 ? C.soft : C.paper })
    values.forEach((value, index) => {
      const maxWidth = widths[index] - 8
      let display = String(value)
      while (display.length > 3 && fonts.regular.widthOfTextAtSize(display, 6.3) > maxWidth) display = `${display.slice(0, -4)}…`
      page.drawText(display, { x: cursorX + 4, y: currentY - 13, size: 6.3, font: index === 0 ? fonts.bold : fonts.regular, color: C.ink })
      cursorX += widths[index]
    })
    currentY -= 19
  }
  return currentY
}

function drawBarChart(page: PDFPage, fonts: Fonts, title: string, points: Array<{ period: string; value: number | null }>, x: number, y: number, width: number, height: number, unit: string) {
  page.drawText(title, { x, y, size: 10, font: fonts.bold, color: C.ink })
  const plotY = y - height
  page.drawLine({ start: { x, y: plotY }, end: { x: x + width, y: plotY }, thickness: 0.6, color: C.line })
  const values = points.map((point) => point.value).filter((value): value is number => value !== null)
  const max = Math.max(...values, 1)
  const gap = 7
  const barWidth = Math.max(12, (width - gap * (points.length - 1)) / Math.max(points.length, 1))
  points.forEach((point, index) => {
    const barX = x + index * (barWidth + gap)
    const barHeight = point.value === null ? 0 : (point.value / max) * (height - 36)
    if (point.value !== null) {
      page.drawRectangle({ x: barX, y: plotY, width: barWidth, height: barHeight, color: C.red })
      const label = unit === 'UF' ? formatNumber(point.value, 0) : formatNumber(point.value, 1)
      page.drawText(label, { x: barX, y: plotY + barHeight + 5, size: 6.4, font: fonts.bold, color: C.ink })
    } else {
      page.drawText('N/D', { x: barX, y: plotY + 5, size: 6.2, font: fonts.regular, color: C.gray })
    }
    page.drawText(point.period.slice(5), { x: barX + 2, y: plotY - 12, size: 6.2, font: fonts.regular, color: C.gray })
  })
}

function drawFunnel(page: PDFPage, fonts: Fonts, funnel: CeoKpi[], x: number, y: number, width: number) {
  const max = Math.max(...funnel.map((kpi) => kpi.value || 0), 1)
  let currentY = y
  for (const kpi of funnel) {
    const ratio = kpi.value === null ? 0 : kpi.value / max
    page.drawText(kpi.label, { x, y: currentY, size: 7.3, font: fonts.bold, color: C.ink })
    page.drawRectangle({ x: x + 115, y: currentY - 3, width: width - 155, height: 10, color: C.paleGray })
    if (kpi.value !== null) page.drawRectangle({ x: x + 115, y: currentY - 3, width: (width - 155) * ratio, height: 10, color: C.teal })
    page.drawText(formatKpi(kpi), { x: x + width - 34, y: currentY, size: 7, font: fonts.bold, color: C.ink })
    currentY -= 28
  }
  return currentY
}

export async function buildCeoIntelligencePdf(report: PropertyPartnersCeoIntelligenceReport) {
  if (report.report_type !== 'property_partners_ceo_intelligence') throw new Error('REPORTIN_INVALID_REPORT_TYPE')
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

  // Cover
  const cover = pdf.addPage([W, H])
  cover.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.ink })
  cover.drawRectangle({ x: 0, y: H - 14, width: W, height: 14, color: C.red })
  cover.drawText('PROPERTY PARTNERS VITACURA', { x: 54, y: 700, size: 9, font: fonts.bold, color: C.red })
  cover.drawText('CEO', { x: 54, y: 622, size: 48, font: fonts.bold, color: C.paper })
  cover.drawText('INTELLIGENCE', { x: 54, y: 570, size: 38, font: fonts.bold, color: C.paper })
  cover.drawText('Mercado · Operación · Conversión · Micromercados · Decisiones', { x: 54, y: 526, size: 10.5, font: fonts.regular, color: rgb(0.76, 0.77, 0.76) })
  cover.drawText(`Período comercial ${report.period.start} — ${report.period.end}`, { x: 54, y: 470, size: 10, font: fonts.regular, color: rgb(0.76, 0.77, 0.76) })
  cover.drawText(`Corte de gestión ${report.period.source_cutoff}`, { x: 54, y: 448, size: 10, font: fonts.regular, color: rgb(0.76, 0.77, 0.76) })
  cover.drawLine({ start: { x: 54, y: 360 }, end: { x: W - 54, y: 360 }, thickness: 0.8, color: C.red })
  cover.drawText('N3URALIA INTELLIGENCE PLATFORM', { x: 54, y: 338, size: 8, font: fonts.bold, color: C.red })
  cover.drawText('Reportin · Snapshot canónico · KML Property Partners', { x: 54, y: 316, size: 10, font: fonts.regular, color: rgb(0.76, 0.77, 0.76) })

  // Executive summary
  const summary = pdf.addPage([W, H])
  header(summary, fonts, report, 'Resumen ejecutivo')
  sectionTitle(summary, fonts, '01', 'CEO snapshot', 'Qué pasó · qué importa · qué decidir')
  const kpis = report.snapshot.headline_kpis.slice(0, 8)
  const cardW = (W - 2 * MX - 18) / 4
  kpis.forEach((kpi, index) => {
    const row = Math.floor(index / 4)
    const col = index % 4
    drawKpiCard(summary, fonts, kpi, MX + col * (cardW + 6), TOP - 62 - row * 84, cardW, 72)
  })
  let sy = TOP - 240
  summary.drawRectangle({ x: MX, y: sy - 98, width: W - 2 * MX, height: 98, color: C.soft })
  sy = paragraph(summary, fonts, report.executive_summary, MX + 14, sy - 20, W - 2 * MX - 28, 10.2, C.ink, true) - 10
  summary.drawText('QUÉ CAMBIÓ', { x: MX, y: sy, size: 7.2, font: fonts.bold, color: C.red })
  let leftY = sy - 18
  for (const item of report.what_changed.slice(0, 4)) leftY = paragraph(summary, fonts, `• ${item}`, MX, leftY, 235, 8.3, C.ink) - 4
  summary.drawText('QUÉ IMPORTA', { x: MX + 260, y: sy, size: 7.2, font: fonts.bold, color: C.teal })
  let rightY = sy - 18
  for (const item of report.what_matters.slice(0, 4)) rightY = paragraph(summary, fonts, `• ${item}`, MX + 260, rightY, 235, 8.3, C.ink) - 4
  footer(summary, fonts, 2)

  // Market map
  const mapPage = pdf.addPage([W, H])
  header(mapPage, fonts, report, 'Micromercados de Vitacura')
  sectionTitle(mapPage, fonts, '02', 'Mapa ejecutivo de Vitacura', 'KML oficial + benchmark de oferta y transacciones')
  drawMarketMap(mapPage, fonts, report.snapshot.market.polygons, report.snapshot.market.rows, 'Casa', MX, TOP - 58, 240, 280)
  drawMarketMap(mapPage, fonts, report.snapshot.market.polygons, report.snapshot.market.rows, 'Departamento', MX + 255, TOP - 58, 240, 280)
  drawLegend(mapPage, fonts, MX, TOP - 358)
  const marketNote = `La geometría corresponde al KML de Property Partners. La señal de color usa la referencia disponible por tipo de propiedad. Portal: ${report.snapshot.market.portalCutoff || 'N/D'} · CBRS: ${report.snapshot.market.cbrsCutoff || 'N/D'}. Estos cortes no se reinterpretan como datos del período comercial.`
  paragraph(mapPage, fonts, marketNote, MX, TOP - 390, W - 2 * MX, 8.2, C.gray)
  const mapSection = report.sections.find((section) => section.id.includes('mercado') || section.id.includes('micromercado'))
  if (mapSection) {
    mapPage.drawText('LECTURA EJECUTIVA', { x: MX, y: TOP - 470, size: 7.2, font: fonts.bold, color: C.red })
    paragraph(mapPage, fonts, mapSection.summary, MX, TOP - 490, W - 2 * MX, 9.2, C.ink)
  }
  footer(mapPage, fonts, 3)

  // Market table
  const marketTable = pdf.addPage([W, H])
  header(marketTable, fonts, report, 'Benchmark por micromercado')
  sectionTitle(marketTable, fonts, '03', 'Dónde está caro y dónde está alineado', 'Ranking territorial por gap UF/m² oferta vs. transacción')
  marketTable.drawText('CASAS', { x: MX, y: TOP - 60, size: 8, font: fonts.bold, color: C.red })
  let ty = drawMarketTable(marketTable, fonts, report.snapshot.market.rows, 'Casa', TOP - 78) - 30
  marketTable.drawText('DEPARTAMENTOS', { x: MX, y: ty, size: 8, font: fonts.bold, color: C.red })
  ty = drawMarketTable(marketTable, fonts, report.snapshot.market.rows, 'Departamento', ty - 18) - 24
  paragraph(marketTable, fonts, 'El gap compara medianas de referencia disponibles y no prueba por sí solo sobreprecio de una propiedad individual. Debe leerse junto con tipología, ubicación, condición y comparables.', MX, ty, W - 2 * MX, 7.8, C.gray)
  footer(marketTable, fonts, 4)

  // Commercial evolution and funnel
  const commercial = pdf.addPage([W, H])
  header(commercial, fonts, report, 'Desempeño comercial')
  sectionTitle(commercial, fonts, '04', 'Resultado y conversión', 'Evolución mensual + pérdida entre etapas')
  drawBarChart(commercial, fonts, 'CIERRES 2026', report.snapshot.monthly_series.sales, MX, TOP - 62, 235, 145, 'cierres')
  drawBarChart(commercial, fonts, 'UF VENDIDAS 2026', report.snapshot.monthly_series.salesUf, MX + 260, TOP - 62, 235, 145, 'UF')
  commercial.drawText('FUNNEL DEL PERÍODO', { x: MX, y: TOP - 260, size: 8, font: fonts.bold, color: C.red })
  const fy = drawFunnel(commercial, fonts, report.snapshot.funnel, MX, TOP - 292, W - 2 * MX)
  paragraph(commercial, fonts, 'Los ratios entre etapas son una lectura mensual direccional; no se presentan como cohortes longitudinales salvo evidencia específica.', MX, fy - 4, W - 2 * MX, 7.6, C.gray)
  const commercialSection = report.sections.find((section) => section.id.includes('comercial') || section.id.includes('conversion'))
  if (commercialSection) {
    commercial.drawRectangle({ x: MX, y: 90, width: W - 2 * MX, height: 94, color: C.soft })
    commercial.drawText('LECTURA DE GESTIÓN', { x: MX + 12, y: 164, size: 7.2, font: fonts.bold, color: C.teal })
    paragraph(commercial, fonts, commercialSection.summary, MX + 12, 146, W - 2 * MX - 24, 8.6, C.ink)
  }
  footer(commercial, fonts, 5)

  // Offices and valuation
  const offices = pdf.addPage([W, H])
  header(offices, fonts, report, 'Oficinas y valorización')
  sectionTitle(offices, fonts, '05', 'Ejecución por oficina', 'Resultados acreditados, seguimiento, visitas y cartera')
  const headers = ['Oficina', 'Cierres gest.', 'UF gest.', 'Seguim.', 'Visitas', '>90d', 'Stock']
  const widths = [120, 60, 72, 58, 52, 48, 50]
  let oy = TOP - 62
  offices.drawRectangle({ x: MX, y: oy - 22, width: W - 2 * MX, height: 22, color: C.ink })
  let ox = MX
  headers.forEach((label, index) => { offices.drawText(label, { x: ox + 4, y: oy - 15, size: 6.4, font: fonts.bold, color: C.paper }); ox += widths[index] })
  oy -= 22
  report.snapshot.offices.forEach((office, index) => {
    offices.drawRectangle({ x: MX, y: oy - 24, width: W - 2 * MX, height: 24, color: index % 2 ? C.soft : C.paper })
    const values = [
      office.name,
      formatKpi(kpiByCode(office.metrics, 'management_credited_sales') || office.metrics[0]),
      formatKpi(kpiByCode(office.metrics, 'management_credited_sales_uf') || office.metrics[0]),
      formatKpi(kpiByCode(office.metrics, 'canonical_follow_up_score') || office.metrics[0]),
      formatKpi(kpiByCode(office.metrics, 'realized_visits') || office.metrics[0]),
      formatKpi(kpiByCode(office.metrics, 'stale_90_leads') || office.metrics[0]),
      formatKpi(kpiByCode(office.metrics, 'stock') || office.metrics[0]),
    ]
    ox = MX
    values.forEach((value, valueIndex) => { offices.drawText(String(value).slice(0, 18), { x: ox + 4, y: oy - 16, size: 6.8, font: valueIndex === 0 ? fonts.bold : fonts.regular, color: C.ink }); ox += widths[valueIndex] })
    oy -= 24
  })
  oy -= 30
  offices.drawText('VALORIZACIÓN EN EL PERÍODO', { x: MX, y: oy, size: 8, font: fonts.bold, color: C.red })
  offices.drawText(`${report.snapshot.valuation.totalCases} casos con fecha de valorización dentro del período`, { x: MX, y: oy - 28, size: 18, font: fonts.bold, color: C.ink })
  const statusText = report.snapshot.valuation.byStatus.length
    ? report.snapshot.valuation.byStatus.map((item) => `${item.status}: ${item.count}`).join(' · ')
    : 'Sin casos registrados en el período. No se interpreta como falla del módulo.'
  paragraph(offices, fonts, statusText, MX, oy - 52, W - 2 * MX, 8.5, C.gray)
  const officeSection = report.sections.find((section) => section.id.includes('oficina'))
  if (officeSection) {
    offices.drawRectangle({ x: MX, y: 96, width: W - 2 * MX, height: 118, color: C.soft })
    offices.drawText('DIAGNÓSTICO', { x: MX + 12, y: 194, size: 7.2, font: fonts.bold, color: C.teal })
    paragraph(offices, fonts, officeSection.summary, MX + 12, 176, W - 2 * MX - 24, 8.6, C.ink)
  }
  footer(offices, fonts, 6)

  // Decisions and traceability
  const decisions = pdf.addPage([W, H])
  header(decisions, fonts, report, 'Decisiones ejecutivas')
  sectionTitle(decisions, fonts, '06', 'Decisiones para Pedro Pablo', 'Pocas acciones, evidencia explícita y control')
  let dy = TOP - 60
  for (const decision of [...report.decisions].sort((a, b) => a.priority - b.priority).slice(0, 5)) {
    const height = 92
    const fill = decision.priority === 1 ? C.paleRed : decision.priority === 2 ? C.paleAmber : C.soft
    decisions.drawRectangle({ x: MX, y: dy - height, width: W - 2 * MX, height, color: fill, borderColor: C.line, borderWidth: 0.5 })
    decisions.drawText(String(decision.priority).padStart(2, '0'), { x: MX + 12, y: dy - 24, size: 15, font: fonts.bold, color: C.red })
    decisions.drawText(decision.title.slice(0, 68), { x: MX + 48, y: dy - 21, size: 10, font: fonts.bold, color: C.ink })
    paragraph(decisions, fonts, decision.rationale, MX + 48, dy - 39, W - 2 * MX - 62, 7.9, C.ink)
    const meta = `${decision.owner} · ${decision.horizon} · Control: ${decision.control_indicator}`
    decisions.drawText(meta.slice(0, 105), { x: MX + 48, y: dy - height + 12, size: 6.5, font: fonts.regular, color: C.gray })
    dy -= height + 10
  }
  footer(decisions, fonts, 7)

  const sources = pdf.addPage([W, H])
  header(sources, fonts, report, 'Fuentes y límites')
  sectionTitle(sources, fonts, '07', 'Cobertura, fuentes y trazabilidad', 'Qué está probado y qué no debe inferirse')
  let ly = TOP - 62
  const sourceLines = [
    `Snapshot: ${report.source_snapshot_id}`,
    `Gestión: período ${report.period.start} — ${report.period.end}; corte ${report.period.source_cutoff}.`,
    `Mercado: KML Property Partners (${report.snapshot.market.polygons.length} micromercados con geometría persistida).`,
    `Benchmark Portal: ${report.snapshot.market.portalCutoff || 'N/D'} · Benchmark CBRS: ${report.snapshot.market.cbrsCutoff || 'N/D'}.`,
    `Modelo narrativo: ${report.canonical_metadata.provider} ${report.canonical_metadata.model}; ${report.canonical_metadata.reasoning_mode}/${report.canonical_metadata.reasoning_effort}; store=false.`,
  ]
  for (const line of sourceLines) ly = paragraph(sources, fonts, `• ${line}`, MX, ly, W - 2 * MX, 8.8, C.ink) - 7
  sources.drawText('LIMITACIONES', { x: MX, y: ly - 8, size: 8, font: fonts.bold, color: C.red })
  ly -= 28
  for (const limitation of report.limitations) ly = paragraph(sources, fonts, `• ${limitation}`, MX, ly, W - 2 * MX, 8.3, C.ink) - 6
  sources.drawRectangle({ x: MX, y: 82, width: W - 2 * MX, height: 92, color: C.soft })
  paragraph(sources, fonts, 'Regla de confianza: N/D no equivale a cero. Los benchmarks territoriales conservan su propio corte y no se mezclan temporalmente con los resultados comerciales. Las decisiones del informe son recomendaciones sustentadas en el snapshot canónico y requieren criterio ejecutivo.', MX + 12, 150, W - 2 * MX - 24, 8.4, C.gray)
  footer(sources, fonts, 8)

  const bytes = await pdf.save()
  const filename = `${filePart(report.title || 'ceo-intelligence')}-${report.period.end}.pdf`
  return { bytes, filename, reportinVersion: REPORTIN_VERSION }
}
