import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'

export type ManagementReportRecord = {
  id: string
  report_type: string
  period_start: string
  period_end: string
  generated_at?: string | null
  snapshot: Record<string, unknown>
}

type PdfCursor = { page: PDFPage; y: number }

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN_X = 46
const TOP_Y = 798
const BOTTOM_Y = 46

const MONTHLY_LABELS: Record<string, string> = {
  cartera: 'Cartera activa',
  captaciones: 'Captaciones',
  leadsNuevos: 'Leads nuevos',
  suspendidas: 'Propiedades suspendidas',
  leadsActivos: 'Leads activos',
  leadsAActivos: 'Leads A activos',
  requerimientos: 'Requerimientos online',
  volumenUfBruto: 'Volumen acreditado',
  scoreSeguimiento: 'Score de seguimiento',
  visitasAgendadas: 'Visitas agendadas',
  leadsClasificados: 'Leads clasificados',
  leadsSinGestion90: 'Leads sin gestión 90 días',
  visitasRealizadas: 'Visitas realizadas',
  cierresAcreditados: 'Cierres acreditados',
  leadsASinGestion15: 'Leads A sin gestión 15 días',
  cumplimientoVisitas: 'Cumplimiento de visitas',
  operacionesEnAlcance: 'Operaciones en alcance',
  leadsSinClasificarArchivo: 'Leads sin clasificar',
}

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
function formatNumber(value: unknown) {
  if (value == null || value === '') return 'n/d'
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? numeric.toLocaleString('es-CL', { maximumFractionDigits: 2 }) : 'n/d'
}
function reportTypeLabel(reportType: string) {
  const labels: Record<string, string> = { executive: 'Reporte ejecutivo', office: 'Reporte de oficina', partner: 'Reporte individual', monthly: 'Reporte mensual', cumulative: 'Reporte acumulado' }
  return labels[reportType] ?? 'Reporte de gestión'
}
function filenamePart(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}
function wrapText(font: PDFFont, value: string, fontSize: number, maxWidth: number) {
  const paragraphs = String(value || '').split(/\r?\n/)
  const lines: string[] = []
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (!words.length) { lines.push(''); continue }
    let current = words.shift() ?? ''
    for (const word of words) {
      const candidate = `${current} ${word}`
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) current = candidate
      else { lines.push(current); current = word }
    }
    lines.push(current)
  }
  return lines
}

export async function buildManagementReportPdf(report: ManagementReportRecord) {
  const pdf = await PDFDocument.create()
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const muted = rgb(0.34, 0.38, 0.38)
  const accent = rgb(0.83, 0.20, 0.17)
  const warning = rgb(0.55, 0.34, 0.08)
  const dark = rgb(0.06, 0.08, 0.08)

  let cursor: PdfCursor = { page: pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]), y: TOP_Y }
  const newPage = () => { cursor = { page: pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]), y: TOP_Y } }
  const ensureSpace = (height: number) => { if (cursor.y - height < BOTTOM_Y) newPage() }

  function drawLines(value: string, options: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; indent?: number; gap?: number; maxWidth?: number } = {}) {
    const font = options.font ?? regular
    const size = options.size ?? 9
    const indent = options.indent ?? 0
    const gap = options.gap ?? size + 4
    const maxWidth = options.maxWidth ?? PAGE_WIDTH - (MARGIN_X * 2) - indent
    const lines = wrapText(font, value, size, maxWidth)
    ensureSpace(Math.max(gap, lines.length * gap))
    for (const line of lines) {
      cursor.page.drawText(line, { x: MARGIN_X + indent, y: cursor.y, size, font, color: options.color ?? dark })
      cursor.y -= gap
    }
  }
  function separator(spaceBefore = 4, spaceAfter = 12) {
    ensureSpace(spaceBefore + spaceAfter + 1)
    cursor.y -= spaceBefore
    cursor.page.drawLine({ start: { x: MARGIN_X, y: cursor.y }, end: { x: PAGE_WIDTH - MARGIN_X, y: cursor.y }, thickness: 0.6, color: rgb(0.80, 0.82, 0.82) })
    cursor.y -= spaceAfter
  }

  const snapshot = record(report.snapshot) ?? {}
  const periodRecord = record(snapshot.period)
  const period = periodRecord ? text(periodRecord.label, `${report.period_start} – ${report.period_end}`) : text(snapshot.period, `${report.period_start} – ${report.period_end}`)
  const generatedAt = text(snapshot.generatedAt, report.generated_at ?? '')
  const provenanceRecord = record(snapshot.provenance)
  const sourceFiles = array(provenanceRecord?.sourceFiles).map((item) => text(item)).filter(Boolean)
  const provenance = text(snapshot.dataProvenance, sourceFiles.length ? `Fuentes canónicas: ${sourceFiles.join(', ')}.` : 'Snapshot persistido del sistema de control de gestión.')

  drawLines('PROPERTY PARTNERS', { font: bold, size: 9, color: accent, gap: 14 })
  drawLines(reportTypeLabel(report.report_type), { font: bold, size: 22, gap: 28 })
  drawLines(`Período: ${period}`, { font: bold, size: 10, gap: 15 })
  drawLines(`Generado: ${generatedAt || 'n/d'} · ID: ${report.id}`, { size: 8, color: muted, gap: 12 })
  separator(4, 15)
  drawLines('Procedencia y alcance', { font: bold, size: 12, gap: 18 })
  drawLines(provenance, { size: 8.5, color: muted, gap: 12 })

  let renderedMetrics = 0
  const company = record(snapshot.company)
  const offices = array(snapshot.offices)

  if (company) {
    separator(10, 12)
    drawLines('Resumen ejecutivo', { font: bold, size: 13, gap: 19 })
    for (const [key, value] of Object.entries(company)) {
      if (value == null || typeof value === 'object') continue
      renderedMetrics += 1
      const label = MONTHLY_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase())
      const suffix = key === 'volumenUfBruto' ? ' UF' : key.toLowerCase().includes('cumplimiento') || key.toLowerCase().includes('score') ? '%' : ''
      drawLines(`• ${label}: ${formatNumber(value)}${suffix}`, { size: 9, indent: 8, gap: 13 })
    }

    separator(10, 12)
    drawLines(`Desglose por oficina: ${offices.length}`, { font: bold, size: 11, gap: 17 })
    if (!offices.length) drawLines('No existe desglose canónico completo por oficina para este período.', { size: 8.5, color: muted, gap: 12 })
    for (const rawOffice of offices.slice(0, 30)) {
      const office = record(rawOffice)
      if (!office) continue
      drawLines(text(office.name, 'Oficina'), { font: bold, size: 10, gap: 15 })
      for (const [key, value] of Object.entries(office)) {
        if (key === 'name' || value == null || typeof value === 'object') continue
        renderedMetrics += 1
        const label = MONTHLY_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1')
        drawLines(`• ${label}: ${formatNumber(value)}`, { size: 8.5, indent: 8, gap: 12 })
      }
    }

    const completeness = record(snapshot.completeness)
    const blocked = array(completeness?.blocked)
    separator(12, 12)
    drawLines('Estado de completitud', { font: bold, size: 11, gap: 17 })
    drawLines(`Reporte operacional: ${completeness?.operationalReportReady === true ? 'LISTO' : 'NO LISTO'} · Score integral: ${completeness?.fullManagementScoreReady === true ? 'LISTO' : 'BLOQUEADO'}`, { size: 9, color: completeness?.fullManagementScoreReady === true ? dark : warning, gap: 13 })
    for (const rawBlock of blocked.slice(0, 30)) {
      const block = record(rawBlock)
      if (!block) continue
      drawLines(`• ${text(block.code, 'dimensión')}: ${text(block.reason, 'Pendiente de definición o evidencia.')}`, { size: 8.3, color: muted, indent: 8, gap: 12 })
    }

    const notes = array(snapshot.qualityNotes ?? snapshot.quality_notes)
    if (notes.length) {
      separator(10, 12)
      drawLines('Notas de calidad y reconciliación', { font: bold, size: 11, gap: 17 })
      for (const note of notes.slice(0, 30)) drawLines(`• ${text(note)}`, { size: 8.3, color: muted, indent: 8, gap: 12 })
    }
  } else {
    const entities = array(snapshot.entities)
    drawLines(`Entidades incluidas: ${entities.length}`, { font: bold, size: 11, gap: 18 })
    for (const rawEntity of entities.slice(0, 100)) {
      const entity = record(rawEntity)
      if (!entity) continue
      ensureSpace(72)
      separator(8, 12)
      drawLines(text(entity.name, 'Entidad sin nombre'), { font: bold, size: 12, gap: 17 })
      drawLines(`Tipo: ${text(entity.entity_type ?? entity.entityType, 'entidad')}`, { size: 8, color: muted, gap: 13 })
      const metrics = array(entity.metrics)
      if (!metrics.length) { drawLines('Sin métricas persistidas para este período.', { size: 9, color: muted, indent: 8, gap: 13 }); continue }
      for (const rawMetric of metrics.slice(0, 80)) {
        const metric = record(rawMetric)
        if (!metric) continue
        renderedMetrics += 1
        const label = text(metric.label ?? metric.metric_code ?? metric.code, 'Métrica')
        const unit = text(metric.unit)
        const target = metric.target_value ?? metric.target
        const targetText = target == null ? '' : ` · meta ${formatNumber(target)}`
        const suffix = [text(metric.quality_status ?? metric.qualityStatus), text(metric.evaluation_status)].filter(Boolean).join(' / ')
        drawLines(`• ${label}: ${formatNumber(metric.value)}${unit ? ` ${unit}` : ''}${targetText}${suffix ? ` · ${suffix}` : ''}`, { size: 8.5, indent: 8, gap: 12 })
      }
    }

    const alerts = array(snapshot.alerts)
    separator(12, 14)
    drawLines(`Alertas abiertas o reconocidas: ${alerts.length}`, { font: bold, size: 11, gap: 18 })
    if (!alerts.length) drawLines('No existen alertas incluidas en el snapshot del período.', { size: 9, color: muted, gap: 13 })
    else for (const rawAlert of alerts.slice(0, 100)) {
      const alert = record(rawAlert)
      if (!alert) continue
      drawLines(`• [${text(alert.severity, 'n/d').toUpperCase()}] ${text(alert.title, 'Alerta')}${text(alert.detail) ? ` — ${text(alert.detail)}` : ''}`, { size: 8.5, indent: 8, gap: 12 })
    }
  }

  separator(14, 12)
  drawLines('Metodología', { font: bold, size: 11, gap: 18 })
  drawLines(`Documento generado exclusivamente desde el snapshot persistido del reporte. No incorpora proyecciones ni datos externos. Métricas renderizadas: ${renderedMetrics}.`, { size: 8.5, color: muted, gap: 12 })

  const pages = pdf.getPages()
  pages.forEach((page, index) => page.drawText(`Property Partners · N3uralia Intelligence · ${index + 1}/${pages.length}`, { x: MARGIN_X, y: 24, size: 7, font: regular, color: muted }))
  const bytes = await pdf.save()
  return { bytes, filename: `${filenamePart(reportTypeLabel(report.report_type))}-${report.period_start}-${report.period_end}.pdf` }
}
