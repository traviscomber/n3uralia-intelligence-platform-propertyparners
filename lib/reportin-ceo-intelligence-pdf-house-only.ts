import 'server-only'
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont, type RGB } from 'pdf-lib'
import { buildPolishedCeoIntelligencePdf } from '@/lib/reportin-ceo-intelligence-pdf-polish'
import type {
  CeoMarketGeometry,
  CeoMarketPolygon,
  CeoMarketRow,
  PropertyPartnersCeoIntelligenceReport,
} from '@/lib/property-partners-ceo-intelligence-report'

const W = 595.28
const H = 841.89
const MX = 48
const TOP = 786

const C = {
  ink: rgb(0.055, 0.067, 0.067),
  red: rgb(0.91, 0.19, 0.16),
  teal: rgb(0.16, 0.43, 0.40),
  amber: rgb(0.72, 0.48, 0.18),
  gray: rgb(0.47, 0.49, 0.48),
  line: rgb(0.84, 0.84, 0.82),
  soft: rgb(0.965, 0.965, 0.955),
  paper: rgb(1, 1, 1),
  paleRed: rgb(0.98, 0.90, 0.89),
  paleAmber: rgb(0.98, 0.94, 0.86),
}

type Fonts = { regular: PDFFont; bold: PDFFont }

function stripEvidenceRefs(value: string) {
  return String(value || '')
    .replace(/\s*\[(?:metric|market|valuation|kml|contract):[^\]]+\]/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .trim()
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

function sectionTitle(page: PDFPage, fonts: Fonts, number: string, title: string, subtitle: string) {
  page.drawText(number, { x: MX, y: TOP, size: 22, font: fonts.bold, color: C.red })
  page.drawText(title, { x: MX + 50, y: TOP + 1, size: 19, font: fonts.bold, color: C.ink })
  page.drawText(subtitle, { x: MX + 50, y: TOP - 20, size: 8.5, font: fonts.regular, color: C.gray })
}

function wrap(font: PDFFont, text: string, size: number, width: number) {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (!line || font.widthOfTextAtSize(candidate, size) <= width) line = candidate
    else { lines.push(line); line = word }
  }
  if (line) lines.push(line)
  return lines
}

function drawWrapped(page: PDFPage, font: PDFFont, text: string, x: number, y: number, width: number, size: number, color: RGB, maxLines: number) {
  const lines = wrap(font, stripEvidenceRefs(text), size, width).slice(0, maxLines)
  lines.forEach((line, index) => page.drawText(line, { x, y: y - index * (size + 2.2), size, font, color }))
  return lines.length
}

function geometryRings(geometry: CeoMarketGeometry) {
  if (geometry.type === 'Polygon') return (geometry.coordinates as number[][][]).slice(0, 1)
  return (geometry.coordinates as number[][][][]).flatMap((polygon) => polygon.slice(0, 1))
}

function allPoints(polygons: CeoMarketPolygon[]) {
  return polygons.flatMap((polygon) => geometryRings(polygon.geometry).flat())
}

function normalizeName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function marketRow(rows: CeoMarketRow[], name: string) {
  return rows.find((row) => normalizeName(row.neighborhood) === normalizeName(name) && row.propertyType === 'Casa') || null
}

function signalColor(signal: string): RGB {
  if (signal === 'market_aligned' || signal === 'alineado') return C.teal
  if (signal === 'asking_moderately_above_sales' || signal === 'moderado_sobre_ventas') return C.amber
  if (signal === 'asking_well_above_sales' || signal === 'muy_sobre_ventas') return C.red
  return C.gray
}

function signalLabel(signal: string) {
  if (signal === 'market_aligned' || signal === 'alineado') return 'alineado'
  if (signal === 'asking_moderately_above_sales' || signal === 'moderado_sobre_ventas') return 'moderado sobre ventas'
  if (signal === 'asking_well_above_sales' || signal === 'muy_sobre_ventas') return 'muy sobre ventas'
  return 'cobertura limitada'
}

function drawHouseMap(page: PDFPage, polygons: CeoMarketPolygon[], rows: CeoMarketRow[], x: number, y: number, width: number, height: number) {
  const points = allPoints(polygons)
  if (!points.length) return
  const minLon = Math.min(...points.map((point) => point[0]))
  const maxLon = Math.max(...points.map((point) => point[0]))
  const minLat = Math.min(...points.map((point) => point[1]))
  const maxLat = Math.max(...points.map((point) => point[1]))
  const mapX = x + 10
  const mapY = y - height + 10
  const mapW = width - 20
  const mapH = height - 42
  const scale = Math.min(mapW / Math.max(maxLon - minLon, 0.000001), mapH / Math.max(maxLat - minLat, 0.000001))
  const drawnW = (maxLon - minLon) * scale
  const drawnH = (maxLat - minLat) * scale
  const offsetX = mapX + (mapW - drawnW) / 2
  const offsetY = mapY + (mapH - drawnH) / 2

  for (const polygon of polygons) {
    const row = marketRow(rows, polygon.name)
    const color = row ? signalColor(row.signal) : C.gray
    for (const ring of geometryRings(polygon.geometry)) {
      if (ring.length < 3) continue
      const path = ring.map((point, index) => {
        const px = (point[0] - minLon) * scale
        const py = (maxLat - point[1]) * scale
        return `${index === 0 ? 'M' : 'L'} ${px.toFixed(2)} ${py.toFixed(2)}`
      }).join(' ') + ' Z'
      page.drawSvgPath(path, {
        x: offsetX,
        y: offsetY + drawnH,
        color,
        borderColor: C.paper,
        borderWidth: 0.6,
        opacity: row ? 0.9 : 0.38,
      })
    }
  }
}

function replacePage(pdf: PDFDocument, index: number) {
  pdf.removePage(index)
  return pdf.insertPage(index, [W, H])
}

function rebuildMarketMapPage(page: PDFPage, fonts: Fonts, report: PropertyPartnersCeoIntelligenceReport) {
  header(page, fonts, report, 'Micromercados de Vitacura')
  sectionTitle(page, fonts, '02', 'Mapa ejecutivo de casas', 'KML oficial + benchmark canónico de oferta y transacciones')

  const panelTop = TOP - 58
  const panelHeight = 280
  const panelBottom = panelTop - panelHeight
  page.drawRectangle({ x: MX, y: panelBottom, width: W - 2 * MX, height: panelHeight, color: C.soft, borderColor: C.line, borderWidth: 0.6 })
  page.drawText('CASAS · ALCANCE CONTRACTUAL', { x: MX + 10, y: panelTop - 18, size: 7.4, font: fonts.bold, color: C.ink })
  drawHouseMap(page, report.snapshot.market.polygons, report.snapshot.market.rows, MX, panelTop, W - 2 * MX, panelHeight)

  const comparableRows = report.snapshot.market.rows.filter((row) => row.propertyType === 'Casa' && row.gapPct !== null)
  page.drawText('Alcance: ventas de casas en Vitacura.', { x: MX, y: 425, size: 7.6, font: fonts.bold, color: C.red })
  page.drawText(
    comparableRows.length ? `${comparableRows.length} micromercados con benchmark comparable para casas.` : 'Benchmark comparable de precio para casas: N/D. No se reconstruyen referencias ausentes.',
    { x: MX, y: 409, size: 7.4, font: fonts.regular, color: C.gray },
  )

  const section = report.sections.find((item) => item.id.includes('mercado') || item.id.includes('micro'))
  if (section) {
    page.drawText('LECTURA EJECUTIVA', { x: MX, y: 350, size: 7.2, font: fonts.bold, color: C.red })
    drawWrapped(page, fonts.regular, section.summary, MX, 330, W - 2 * MX, 8.5, C.ink, 8)
  }
  footer(page, fonts, 3)
}

function rebuildBenchmarkPage(page: PDFPage, fonts: Fonts, report: PropertyPartnersCeoIntelligenceReport) {
  header(page, fonts, report, 'Benchmark por micromercado')
  sectionTitle(page, fonts, '03', 'Dónde está caro y dónde está alineado', 'Ranking territorial para casas · oferta vs. transacción disponible')
  page.drawText('CASAS · ALCANCE CONTRACTUAL', { x: MX, y: 702, size: 8, font: fonts.bold, color: C.red })

  const rows = report.snapshot.market.rows
    .filter((row) => row.propertyType === 'Casa' && row.gapPct !== null)
    .sort((a, b) => (b.gapPct || 0) - (a.gapPct || 0))
    .slice(0, 12)

  if (!rows.length) {
    page.drawRectangle({ x: MX, y: 652, width: W - 2 * MX, height: 34, color: C.soft, borderColor: C.line, borderWidth: 0.5 })
    page.drawText('N/D · Sin benchmark comparable de oferta para casas; no se reconstruyen referencias ausentes.', { x: MX + 10, y: 665, size: 7.4, font: fonts.regular, color: C.gray })
    footer(page, fonts, 4)
    return
  }

  const headers = ['Micromercado', 'Oferta', 'Tx CBRS', 'UF/m² oferta', 'UF/m² venta', 'Gap / señal']
  const widths = [150, 46, 52, 72, 72, 107]
  let y = 678
  page.drawRectangle({ x: MX, y: y - 20, width: W - 2 * MX, height: 20, color: C.ink })
  let x = MX
  headers.forEach((label, index) => {
    page.drawText(label, { x: x + 4, y: y - 13.5, size: 5.7, font: fonts.bold, color: C.paper })
    x += widths[index]
  })
  y -= 20

  rows.forEach((row, index) => {
    page.drawRectangle({ x: MX, y: y - 22, width: W - 2 * MX, height: 22, color: index % 2 ? C.soft : C.paper })
    const values = [
      row.neighborhood,
      row.portalListings ?? 'N/D',
      row.cbrsTransactions ?? 'N/D',
      row.portalMedianUfM2 ?? 'N/D',
      row.cbrsMedianUfM2 ?? 'N/D',
      row.gapPct === null ? 'N/D' : `${row.gapPct >= 0 ? '+' : ''}${(row.gapPct * 100).toFixed(1)}% · ${signalLabel(row.signal)}`,
    ]
    x = MX
    values.forEach((value, valueIndex) => {
      const max = valueIndex === 0 || valueIndex === 5 ? 28 : 16
      page.drawText(String(value).slice(0, max), { x: x + 4, y: y - 14.5, size: 6, font: valueIndex === 0 ? fonts.bold : fonts.regular, color: C.ink })
      x += widths[valueIndex]
    })
    y -= 22
  })

  drawWrapped(page, fonts.regular, 'El gap compara medianas de referencia disponibles para casas y no prueba por sí solo sobreprecio de una propiedad individual. Debe leerse junto con tipología, ubicación, condición y comparables.', MX, y - 20, W - 2 * MX, 7.5, C.gray, 3)
  footer(page, fonts, 4)
}

function rebuildDecisionsPage(page: PDFPage, fonts: Fonts, report: PropertyPartnersCeoIntelligenceReport) {
  header(page, fonts, report, 'Decisiones ejecutivas')
  sectionTitle(page, fonts, '06', 'Decisiones para Pedro Pablo', 'Pocas acciones, evidencia explícita y control')
  let dy = TOP - 60
  const height = 104
  const gap = 8

  for (const decision of [...report.decisions].sort((a, b) => a.priority - b.priority).slice(0, 5)) {
    const fill = decision.priority === 1 ? C.paleRed : decision.priority === 2 ? C.paleAmber : C.soft
    const bottom = dy - height
    page.drawRectangle({ x: MX, y: bottom, width: W - 2 * MX, height, color: fill, borderColor: C.line, borderWidth: 0.5 })
    page.drawText(String(decision.priority).padStart(2, '0'), { x: MX + 12, y: dy - 24, size: 15, font: fonts.bold, color: C.red })
    const titleLines = drawWrapped(page, fonts.bold, decision.title, MX + 48, dy - 21, W - 2 * MX - 62, 9.5, C.ink, 2)
    const rationaleY = dy - 39 - Math.max(0, titleLines - 1) * 11.7
    drawWrapped(page, fonts.regular, decision.rationale, MX + 48, rationaleY, W - 2 * MX - 62, 7.4, C.ink, 3)
    drawWrapped(page, fonts.regular, `${decision.owner} · ${decision.horizon} · Control: ${decision.control_indicator}`, MX + 48, bottom + 24, W - 2 * MX - 62, 5.8, C.gray, 2)
    dy -= height + gap
  }
  footer(page, fonts, 7)
}

export async function buildHouseOnlyCeoIntelligencePdf(report: PropertyPartnersCeoIntelligenceReport) {
  const base = await buildPolishedCeoIntelligencePdf(report)
  const pdf = await PDFDocument.load(base.bytes)
  if (pdf.getPageCount() !== 8) throw new Error(`REPORTIN_CEO_PAGE_COUNT_${pdf.getPageCount()}`)

  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
  }

  // Replace, rather than visually cover, pages that used to carry legacy semantic text.
  // This keeps search/copy/accessibility output aligned with the contractual house-only scope.
  rebuildMarketMapPage(replacePage(pdf, 2), fonts, report)
  rebuildBenchmarkPage(replacePage(pdf, 3), fonts, report)
  rebuildDecisionsPage(replacePage(pdf, 6), fonts, report)

  return {
    ...base,
    reportinVersion: '1.3',
    bytes: await pdf.save(),
  }
}
