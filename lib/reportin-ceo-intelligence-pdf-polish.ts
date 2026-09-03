import 'server-only'
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont, type RGB } from 'pdf-lib'
import { buildCeoIntelligencePdf } from '@/lib/reportin-ceo-intelligence-pdf'
import type {
  CeoMarketGeometry,
  CeoMarketPolygon,
  CeoMarketRow,
  PropertyPartnersCeoIntelligenceReport,
} from '@/lib/property-partners-ceo-intelligence-report'

const W = 595.28
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
    .replace(/\s*\[(?:metric|market|valuation|kml):[^\]]+\]/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .trim()
}

function translatedSignal(signal: string) {
  if (signal === 'market_aligned') return 'alineado'
  if (signal === 'asking_moderately_above_sales') return 'moderado_sobre_ventas'
  if (signal === 'asking_well_above_sales') return 'muy_sobre_ventas'
  return signal || 'cobertura_limitada'
}

function polishForClient(report: PropertyPartnersCeoIntelligenceReport): PropertyPartnersCeoIntelligenceReport {
  const copy = structuredClone(report)
  copy.executive_summary = stripEvidenceRefs(copy.executive_summary)
  copy.what_changed = copy.what_changed.map(stripEvidenceRefs)
  copy.what_matters = copy.what_matters.map(stripEvidenceRefs)
  copy.limitations = copy.limitations.map(stripEvidenceRefs)
  copy.sections = copy.sections.map((section) => {
    let id = section.id
    if (id === 'micro-markets') id = 'micromercados'
    else if (id === 'offices') id = 'oficinas'
    else if (id === 'commercial-results') id = 'comercial-results'
    else if (id === 'funnel-conversion') id = 'conversion'
    return {
      ...section,
      id,
      summary: stripEvidenceRefs(section.summary),
      key_findings: section.key_findings.map(stripEvidenceRefs),
      risks: section.risks.map(stripEvidenceRefs),
      recommendations: section.recommendations.map(stripEvidenceRefs),
    }
  })
  copy.decisions = copy.decisions.map((decision) => ({
    ...decision,
    title: stripEvidenceRefs(decision.title),
    rationale: stripEvidenceRefs(decision.rationale),
    control_indicator: stripEvidenceRefs(decision.control_indicator),
  }))
  copy.snapshot.market.rows = copy.snapshot.market.rows.map((row) => ({
    ...row,
    signal: translatedSignal(row.signal),
  }))
  return copy
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

function marketRow(rows: CeoMarketRow[], name: string, propertyType: string) {
  return rows.find((row) => normalizeName(row.neighborhood) === normalizeName(name) && row.propertyType === propertyType) || null
}

function signalColor(signal: string): RGB {
  if (signal === 'market_aligned') return C.teal
  if (signal === 'asking_moderately_above_sales') return C.amber
  if (signal === 'asking_well_above_sales') return C.red
  return C.gray
}

function overlayMarketMap(
  page: PDFPage,
  polygons: CeoMarketPolygon[],
  rows: CeoMarketRow[],
  propertyType: string,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const points = allPoints(polygons)
  if (!points.length) return
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
        const px = (point[0] - minLon) * scale
        const py = (maxLat - point[1]) * scale
        return `${index === 0 ? 'M' : 'L'} ${px.toFixed(2)} ${py.toFixed(2)}`
      }).join(' ') + ' Z'
      page.drawSvgPath(path, {
        x: offsetX,
        y: offsetY + drawnH,
        color,
        borderColor: C.paper,
        borderWidth: 0.55,
        opacity: row ? 0.9 : 0.32,
      })
    }
  }
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
  const lines = wrap(font, text, size, width).slice(0, maxLines)
  lines.forEach((line, index) => page.drawText(line, { x, y: y - index * (size + 2.2), size, font, color }))
  return lines.length
}

function redrawDecisions(page: PDFPage, fonts: Fonts, report: PropertyPartnersCeoIntelligenceReport) {
  page.drawRectangle({ x: MX, y: 86, width: W - 2 * MX, height: 650, color: C.paper })
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
    const meta = `${decision.owner} · ${decision.horizon} · Control: ${decision.control_indicator}`
    drawWrapped(page, fonts.regular, meta, MX + 48, bottom + 24, W - 2 * MX - 62, 5.8, C.gray, 2)
    dy -= height + gap
  }
}

function replaceEmptyHouseBenchmark(page: PDFPage, fonts: Fonts, report: PropertyPartnersCeoIntelligenceReport) {
  const houseRows = report.snapshot.market.rows.filter((row) => row.propertyType === 'Casa' && row.gapPct !== null)
  if (houseRows.length) return
  page.drawRectangle({ x: MX, y: 680, width: W - 2 * MX, height: 30, color: C.paper })
  page.drawRectangle({ x: MX, y: 680, width: W - 2 * MX, height: 28, color: C.soft, borderColor: C.line, borderWidth: 0.5 })
  page.drawText('N/D · Sin benchmark comparable de oferta Portal para casas; no se reconstruyen referencias ausentes.', {
    x: MX + 10,
    y: 691,
    size: 7.2,
    font: fonts.regular,
    color: C.gray,
  })
}

export async function buildPolishedCeoIntelligencePdf(report: PropertyPartnersCeoIntelligenceReport) {
  const polished = polishForClient(report)
  const base = await buildCeoIntelligencePdf(polished)
  const pdf = await PDFDocument.load(base.bytes)
  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
  }

  const pages = pdf.getPages()
  const mapPage = pages[2]
  if (mapPage) {
    overlayMarketMap(mapPage, report.snapshot.market.polygons, report.snapshot.market.rows, 'Casa', MX, TOP - 58, 240, 280)
    overlayMarketMap(mapPage, report.snapshot.market.polygons, report.snapshot.market.rows, 'Departamento', MX + 255, TOP - 58, 240, 280)
  }

  const marketTablePage = pages[3]
  if (marketTablePage) replaceEmptyHouseBenchmark(marketTablePage, fonts, report)

  const decisionsPage = pages[6]
  if (decisionsPage) redrawDecisions(decisionsPage, fonts, polished)

  return {
    ...base,
    bytes: await pdf.save(),
  }
}
